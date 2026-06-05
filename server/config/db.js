const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const REPLICA_URI = process.env.MONGO_URI;
const LOCAL_URI   = process.env.MONGO_LOCAL_URI|| 'mongodb://127.0.0.1:27017/ecomerce';

let currentMode = 'none'; // 'replica' | 'standalone' | 'none'

const connectDB = async () => {
  // ── Attempt 1: Replica set ──────────────────────────────────────────────────
  // heartbeatFrequencyMS: 2000  → detect a dead node in ~2s (default is 10s)
  // serverSelectionTimeoutMS: 10000 → give up waiting for a primary after 10s
  //   With the arbiter on PC1, election completes in ~5-8s after a node dies,
  //   so 10s is enough headroom without making users wait too long.
  // bufferCommands: false → operations fail immediately if no primary is
  //   available instead of queuing silently forever.
  try {
    const conn = await mongoose.connect(REPLICA_URI, {
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
    console.log(`✅ [DB] Replica set connected: ${conn.connection.host}`);
    return;
  } catch (replicaErr) {
    currentMode = 'none';
    console.error(`❌ [DB] Replica set connection failed: ${replicaErr.message}`);
    console.error('❌ [DB] Retrying replica set in 5 seconds...');
    // Retry after delay instead of falling back to standalone
    setTimeout(() => connectDB(), 5000);
  }
};

// When the replica set loses its primary mid-session, Mongoose emits
// 'disconnected'. We catch it and trigger a reconnect immediately.
mongoose.connection.on('disconnected', () => {
  if (currentMode === 'replica') {
    console.warn('[DB] Replica set primary lost — reconnecting...');
    currentMode = 'none';
    // Small delay to let the election complete before reconnecting
    setTimeout(() => connectDB(), 3000);
  }
});

mongoose.connection.on('reconnected', () => {
  console.log(`✅ [DB] Reconnected: ${mongoose.connection.host}`);
  currentMode = 'replica';
});

// Periodic watcher: reconnect if fully disconnected, or upgrade from standalone
const startReconnectWatcher = () => {
  setInterval(async () => {
    const state = mongoose.connection.readyState;

    // Fully disconnected — reconnect
    if (state === 0 || state === 3) {
      console.log('[DB] Connection lost — attempting reconnect...');
      await connectDB();
      return;
    }

    // In standalone — probe if replica set is back
    if (currentMode === 'standalone' && state === 1) {
      try {
        const testConn = await mongoose.createConnection(REPLICA_URI, {
          bufferCommands: false,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
        }).asPromise();

        console.log('[DB] Replica set back online — upgrading from standalone...');
        await testConn.close();
        await mongoose.disconnect();
        await connectDB();
      } catch {
        // Still down — stay in standalone
      }
    }
  }, 15000);
};

module.exports = { connectDB, startReconnectWatcher };
