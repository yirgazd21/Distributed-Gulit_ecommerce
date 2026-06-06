const mongoose = require('mongoose');
const dotenv = require('dotenv');
const {
  setClusterBConnection,
  getActiveConnection,
  getPrimaryConnection,
  getSecondaryConnection,
  addModelToConnection,
  getModelSchema,
} = require('./connectionManager');

dotenv.config();

const SyncQueue = require('../models/syncQueueModel');

const PRIMARY_URI = process.env.MONGO_URI_A || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecomerce';
const CLUSTER_B_URI = process.env.MONGO_URI_B || null;
const QUEUE_LOCK_TIMEOUT_MS = Number(process.env.SYNC_QUEUE_LOCK_TIMEOUT_MS || 120000);
const SYNC_WORKER_ID = `${process.env.RENDER_SERVICE_NAME || process.env.REPL_SLUG || 'server'}-${process.pid}-${Date.now()}`;

let currentMode = 'none'; // 'replica' | 'standalone' | 'none'
let clusterBConnection = null;
let isProcessingQueue = false;
let clusterBConnectPromise = null;

const isConnectionReady = (conn) => conn && conn.readyState === 1;

const getConnectionName = (conn) => {
  if (conn === mongoose.connection) return 'primary';
  if (conn === clusterBConnection) return 'secondary';
  return 'unknown';
};

const getPassiveConnection = () => {
  const activeConn = getActiveConnection();
  return activeConn === mongoose.connection ? clusterBConnection : mongoose.connection;
};

const getConnectionModel = (conn, modelName) => {
  if (!conn) return null;
  if (conn.models[modelName]) return conn.model(modelName);

  const schemaEntry = getModelSchema(modelName);
  if (!schemaEntry) {
    throw new Error(`Model schema not registered for ${modelName}`);
  }
  return conn.model(modelName, schemaEntry.schema, schemaEntry.collection);
};

const getQueueModel = (conn) => getConnectionModel(conn, 'SyncQueue');

// Detect operations that were originated by the sync system (to avoid re-queueing)
const isClusterBOperation = (context) => {
  if (!context) return false;
  // Plain task objects may carry the flag
  if (context._skipClusterBSync) return true;
  // Query/getOptions style
  if (typeof context.getOptions === 'function' && context.getOptions()._skipClusterBSync) return true;
  // Document save options
  if (context.$__ && context.$__.saveOptions && context.$__.saveOptions._skipClusterBSync) return true;
  return false;
};

const executeTaskOnConnection = async (task, conn) => {
  if (!conn || !isConnectionReady(conn)) {
    throw new Error('Target connection is not available');
  }

  const model = getConnectionModel(conn, task.modelName);
  if (!model) {
    throw new Error(`Target model unavailable on connection: ${task.modelName}`);
  }

  const skipOptions = { ...(task.options || {}), _skipClusterBSync: true };

  switch (task.action) {
    case 'upsert':
      return model.replaceOne(task.query, task.payload, { upsert: true, ...skipOptions });
    case 'insertMany':
      return model.insertMany(task.payload, { ...skipOptions });
    case 'updateOne':
      return model.updateOne(task.query, task.payload, skipOptions);
    case 'updateMany':
      return model.updateMany(task.query, task.payload, skipOptions);
    case 'deleteOne':
      return model.deleteOne(task.query, skipOptions);
    case 'deleteMany':
      return model.deleteMany(task.query, skipOptions);
    default:
      throw new Error(`Unsupported sync action: ${task.action}`);
  }
};

const persistSyncTask = async (task) => {
  if (!task || !task.modelName || !task.action) return;

  const activeConn = getActiveConnection();
  const queueModel = getQueueModel(activeConn);
  const origin = getConnectionName(activeConn);

  try {
    await queueModel.create({
      ...task,
      origin,
      status: 'pending',
      lockedBy: undefined,
      lockedAt: undefined,
      attempts: 0,
      lastError: undefined,
    });
  } catch (err) {
    console.error('[DB] Failed to persist sync queue task:', err.message);
  }
};

const scheduleSyncTask = async (task) => {
  if (!CLUSTER_B_URI) return;
  if (isClusterBOperation(task)) return;
  if (!task.modelName || !task.action) return;

  const activeConn = getActiveConnection();
  const passiveConn = getPassiveConnection();

  if (passiveConn && isConnectionReady(passiveConn)) {
    try {
      await executeTaskOnConnection(task, passiveConn);
      return;
    } catch (err) {
      console.warn(`[DB] Sync task failed, queueing for retry (${task.action} ${task.modelName}):`, err.message);
    }
  }

  await persistSyncTask(task);
};

const processSyncQueueFrom = async (sourceConn, targetConn) => {
  if (!isConnectionReady(sourceConn) || !isConnectionReady(targetConn)) return;
  const queueModel = getQueueModel(sourceConn);
  const staleLockDate = new Date(Date.now() - QUEUE_LOCK_TIMEOUT_MS);

  while (isConnectionReady(sourceConn) && isConnectionReady(targetConn)) {
    const task = await queueModel.findOneAndUpdate(
      {
        $or: [
          { status: { $exists: false } },
          { status: 'pending' },
          { status: 'processing', lockedAt: { $lt: staleLockDate } },
        ],
      },
      {
        $set: {
          status: 'processing',
          lockedBy: SYNC_WORKER_ID,
          lockedAt: new Date(),
        },
      },
      { sort: { createdAt: 1 }, new: true }
    );

    if (!task) return;

    try {
      await executeTaskOnConnection(task, targetConn);
      await queueModel.deleteOne({ _id: task._id, lockedBy: SYNC_WORKER_ID });
    } catch (err) {
      if (task.action === 'upsert' && err.code === 11000) {
        await queueModel.deleteOne({ _id: task._id, lockedBy: SYNC_WORKER_ID });
        continue;
      }
      await queueModel.updateOne(
        { _id: task._id, lockedBy: SYNC_WORKER_ID },
        {
          $inc: { attempts: 1 },
          $set: { status: 'pending', lastError: err.message },
          $unset: { lockedBy: '', lockedAt: '' },
        }
      );
    }
  }
};

const processSyncQueues = async () => {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    if (isConnectionReady(mongoose.connection) && isConnectionReady(clusterBConnection)) {
      await processSyncQueueFrom(mongoose.connection, clusterBConnection);
      await processSyncQueueFrom(clusterBConnection, mongoose.connection);
      return;
    }

    if (isConnectionReady(mongoose.connection) && clusterBConnection && clusterBConnection.readyState !== 1) {
      // B is down, wait until it returns.
      return;
    }

    if (!isConnectionReady(mongoose.connection) && isConnectionReady(clusterBConnection)) {
      await processSyncQueueFrom(clusterBConnection, mongoose.connection);
    }
  } finally {
    isProcessingQueue = false;
  }
};

const connectClusterB = async () => {
  if (!CLUSTER_B_URI) {
    console.log('[DB] Cluster B sync not configured (MONGO_URI_B missing)');
    return;
  }

  if (isConnectionReady(clusterBConnection)) return clusterBConnection;
  if (clusterBConnectPromise) return clusterBConnectPromise;

  clusterBConnectPromise = (async () => {
  try {
    clusterBConnection = await mongoose.createConnection(CLUSTER_B_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 20000,
      socketTimeoutMS: 60000,
      family: 4,
      retryWrites: true,
      directConnection: false,
    }).asPromise();

    setClusterBConnection(clusterBConnection);
    console.log(`✅ [DB] Secondary MongoDB connected: ${CLUSTER_B_URI}`);
    await processSyncQueues();

    clusterBConnection.on('disconnected', () => {
      console.warn('[DB] Secondary MongoDB disconnected — writes will queue until it recovers');
    });

    clusterBConnection.on('reconnected', async () => {
      console.log('[DB] Secondary MongoDB reconnected — processing queued sync tasks');
      await processSyncQueues();
    });
    return clusterBConnection;
  } catch (err) {
    console.error('[DB] Failed to connect secondary MongoDB:', err.message);
    setTimeout(connectClusterB, 10000);
    return null;
  } finally {
    clusterBConnectPromise = null;
  }
  })();

  return clusterBConnectPromise;
};

const clusterBSyncPlugin = (schema) => {
  const queueUpsert = async (doc) => {
    if (!doc || isClusterBOperation(doc)) return;
    if (doc.constructor.modelName === 'SyncQueue') return;
    await scheduleSyncTask({
      modelName: doc.constructor.modelName,
      action: 'upsert',
      query: { _id: doc._id },
      payload: doc.toObject({ depopulate: true }),
    });
  };

  schema.post('save', async function (doc) {
    await queueUpsert(doc);
  });

  schema.post('remove', async function (doc) {
    if (!doc || isClusterBOperation(doc)) return;
    await scheduleSyncTask({
      modelName: doc.constructor.modelName,
      action: 'deleteOne',
      query: { _id: doc._id },
    });
  });

  schema.post('deleteOne', { document: true, query: false }, async function () {
    if (isClusterBOperation(this) || this.constructor.modelName === 'SyncQueue') return;
    await scheduleSyncTask({
      modelName: this.constructor.modelName,
      action: 'deleteOne',
      query: { _id: this._id },
    });
  });

  schema.post('insertMany', async function (docs) {
    if (!Array.isArray(docs)) return;
    await Promise.all(docs.map((doc) => queueUpsert(doc)));
  });

  const postQueryHandler = async function () {
    if (isClusterBOperation(this) || this.model.modelName === 'SyncQueue') return;
    const actionMap = {
      updateOne: 'updateOne',
      updateMany: 'updateMany',
      deleteOne: 'deleteOne',
      deleteMany: 'deleteMany',
    };

    const action = actionMap[this.op];
    if (!action) return;

    await scheduleSyncTask({
      modelName: this.model.modelName,
      action,
      query: this.getQuery(),
      payload: this.getUpdate(),
      options: this.getOptions(),
    });
  };

  schema.post(['updateOne', 'updateMany', 'deleteOne', 'deleteMany'], postQueryHandler);

  const postFindOneHandler = async function () {
    if (isClusterBOperation(this) || this.model.modelName === 'SyncQueue') return;
    const op = this.op;
    if (op === 'findOneAndUpdate' || op === 'findOneAndReplace') {
      await scheduleSyncTask({
        modelName: this.model.modelName,
        action: 'updateOne',
        query: this.getQuery(),
        payload: this.getUpdate(),
        options: this.getOptions(),
      });
    } else if (op === 'findOneAndDelete' || op === 'findOneAndRemove') {
      await scheduleSyncTask({
        modelName: this.model.modelName,
        action: 'deleteOne',
        query: this.getQuery(),
      });
    }
  };

  schema.post(['findOneAndUpdate', 'findOneAndReplace', 'findOneAndDelete', 'findOneAndRemove'], postFindOneHandler);
};

mongoose.plugin(clusterBSyncPlugin);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(PRIMARY_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 20000,
      socketTimeoutMS: 60000,
      heartbeatFrequencyMS: 1000,
      family: 4,
      retryWrites: true,
      directConnection: false,
    });

    currentMode = 'replica';
    console.log(`✅ [DB] Primary MongoDB connected: ${conn.connection.host}`);
    await connectClusterB();
    await processSyncQueues();
    return;
  } catch (primaryErr) {
    currentMode = 'none';
    await connectClusterB();
    if (isConnectionReady(clusterBConnection)) {
      currentMode = 'standalone';
      console.warn('[DB] Running on secondary MongoDB until primary recovers');
    }
    console.error(`❌ [DB] Primary MongoDB connection failed: ${primaryErr.message}`);
    console.error('❌ [DB] Retrying primary connection in 5 seconds...');
    setTimeout(() => connectDB(), 5000);
  }
};

mongoose.connection.on('disconnected', () => {
  if (currentMode === 'replica') {
    console.warn('[DB] Primary connection lost — reconnecting...');
    currentMode = 'none';
    setTimeout(() => connectDB(), 3000);
  }
});

mongoose.connection.on('reconnected', () => {
  console.log(`✅ [DB] Primary reconnected: ${mongoose.connection.host}`);
  currentMode = 'replica';
  processSyncQueues().catch((err) => {
    console.error('[DB] Failed to process sync queues after primary reconnect:', err.message);
  });
});

const startReconnectWatcher = () => {
  setInterval(async () => {
    const state = mongoose.connection.readyState;

    if (state === 0 || state === 3) {
      console.log('[DB] Primary connection lost — attempting reconnect...');
      await connectDB();
      return;
    }

    if (currentMode === 'standalone' && state === 1) {
      try {
        const testConn = await mongoose.createConnection(PRIMARY_URI, {
          bufferCommands: false,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
        }).asPromise();

        console.log('[DB] Primary replica set back online — upgrading from standalone...');
        await testConn.close();
        await mongoose.disconnect();
        await connectDB();
      } catch {
        // Still down
      }
    }

    if (CLUSTER_B_URI && (!clusterBConnection || clusterBConnection.readyState !== 1)) {
      await connectClusterB();
    }

    await processSyncQueues();
  }, 15000);
};

module.exports = { connectDB, startReconnectWatcher };
