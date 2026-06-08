# Gulit Failover & Switching - Component Responsibility Guide

## Overview
The Gulit distributed system has multiple layers of failover handling. This document maps which specific files and components are responsible for switching at different levels.

---

## 1. Frontend Backend Switching (Client-Side Failover)

### Responsible Files:
- **`client/src/utils/networkConfig.js`** ⭐ PRIMARY CONTROLLER
- **`client/src/store/slices/apiSlice.js`** (Uses networkConfig)

### How It Works:

#### File: `networkConfig.js` - Backend Health Tracking & Rotation

**Responsibilities:**
1. Tracks health status of both backend nodes (Render & Replit)
2. Manages active backend URL in sessionStorage
3. Implements failover logic on request failures
4. Handles 30-second recovery window for failed nodes

**Key Functions:**

```javascript
// 1. MARK NODE AS DOWN (Called when request fails)
export const markNodeDown = (url) => {
  nodeHealthMap.set(normalizeUrl(url), {
    isDown: true,
    timestamp: Date.now(),
  });
};
// Sets node as unavailable, starts 30-second recovery countdown

// 2. MARK NODE AS UP (Called on successful request)
export const markNodeUp = (url) => {
  nodeHealthMap.delete(normalizeUrl(url));
};
// Removes node from down list, marks healthy

// 3. CHECK NODE HEALTH
export const isNodeHealthy = (url) => {
  const normalizedUrl = normalizeUrl(url);
  const health = nodeHealthMap.get(normalizedUrl);
  if (!health) return true; // Unknown nodes considered healthy
  if (Date.now() - health.timestamp > HEALTH_RESET_TIME) {
    nodeHealthMap.delete(normalizedUrl);
    return true; // Recovery window passed, node considered healthy again
  }
  return health.isDown === false;
};
// 30-second HEALTH_RESET_TIME allows failed nodes to rejoin

// 4. GET ACTIVE BACKEND URL (Called before every request)
export const getActiveBackendUrl = () => {
  let active = normalizeUrl(sessionStorage.getItem('activeBackendUrl'));
  
  // If current backend unhealthy, find new healthy one
  if (!active || !PEER_NODES.includes(active) || !isNodeHealthy(active)) {
    active = getPreferredBackendUrl();
    if (active) {
      sessionStorage.setItem('activeBackendUrl', active); // Persist for session
    }
  }
  return active;
};
// Critical: Checks health before returning URL, switches if needed

// 5. ROTATE TO NEXT HEALTHY NODE (When current fails)
export const rotateBackendNode = (currentUrl) => {
  const current = normalizeUrl(currentUrl || getActiveBackendUrl());
  
  // Mark current as down
  markNodeDown(current);
  
  // Find alternative healthy node
  const nextNode = PEER_NODES.find(
    (node) => node !== current && isNodeHealthy(node)
  );
  
  // Set new active backend
  const selectedNode = nextNode || getPreferredBackendUrl();
  if (selectedNode) {
    sessionStorage.setItem('activeBackendUrl', selectedNode);
  }
  
  // Emit event for UI notification
  window.dispatchEvent(new Event('backendRotated'));
  
  console.warn(`Switched backend from ${current} to ${selectedNode}`);
  return selectedNode;
};
// Core failover logic: marks down, finds next healthy, updates session
```

**Configuration:**
```javascript
const PRIMARY_URL = normalizeUrl(import.meta.env.VITE_API_BASE_URL);      // Render
const FALLBACK_URL = normalizeUrl(import.meta.env.VITE_FALLBACK_API_URL); // Replit
export const PEER_NODES = [PRIMARY_URL, FALLBACK_URL].filter(Boolean);

const HEALTH_RESET_TIME = 30000; // 30 seconds to recover
const nodeHealthMap = new Map(); // { url: { isDown: bool, timestamp: ms } }
```

---

#### File: `apiSlice.js` - Request Error Handling & Failover Trigger

**Responsibilities:**
1. Detects request failures (timeouts, 5xx errors, network errors)
2. Calls `rotateBackendNode()` when failure detected
3. Retries request on new backend
4. Handles all RTK Query requests with dynamic base URL

**Key Code Section:**

```javascript
// Dynamic base URL that changes based on health
export const BASE_URL = {
  toString: () => getActiveBackendUrl(),
  valueOf: () => getActiveBackendUrl()
};

// Custom base query with failover logic
const dynamicClusterBaseQuery = async (args, api, extraOptions) => {
  let activeUrl = getActiveBackendUrl();
  
  const maxAttempts = PEER_NODES.length; // Try all nodes
  let attempt = 0;
  let lastResult;

  while (attempt < maxAttempts) {
    // Skip unhealthy nodes
    if (!isNodeHealthy(activeUrl)) {
      console.warn(`Skipping unhealthy node: [${activeUrl}]`);
      activeUrl = rotateBackendNode(activeUrl); // Switch to next
      attempt++;
      continue;
    }

    try {
      // Make request with 8-second timeout
      lastResult = await withTimeout(
        rawBaseQuery(currentArgs, api, extraOptions),
        REQUEST_TIMEOUT
      );

      // Success or normal API error -> return immediately
      if (!lastResult.error) {
        markNodeUp(activeUrl); // Mark healthy on success
        return lastResult;
      }

      // Check error type
      const status = lastResult.error.status;
      const isServerError = status === 503 || status === 502 || status === 500;
      const isNetworkError = status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR';

      // FAILURE DETECTED - TRIGGER FAILOVER
      if (isServerError || isNetworkError) {
        console.warn(`Node [${activeUrl}] failed with ${status}. Rotating...`);
        markNodeDown(activeUrl);
        
        const nextUrl = rotateBackendNode(activeUrl); // Switch backend
        if (nextUrl === activeUrl) {
          // No other nodes available
          return lastResult; // Return original error
        }
        activeUrl = nextUrl; // Try next node
        attempt++;
      } else {
        // Non-server error (4xx) -> don't retry
        markNodeUp(activeUrl);
        return lastResult;
      }
    } catch (error) {
      // Timeout or network error
      console.warn(`Request to [${activeUrl}] timed out: ${error.message}`);
      markNodeDown(activeUrl);
      
      const nextUrl = rotateBackendNode(activeUrl);
      if (nextUrl === activeUrl) {
        return { error: { status: 'TIMEOUT_ERROR', data: error.message } };
      }
      activeUrl = nextUrl;
      attempt++;
    }
  }

  return lastResult; // Return after exhausting all nodes
};
```

**Failure Detection Triggers:**
- ✅ Network timeout (8 seconds)
- ✅ 5xx server errors (500, 502, 503)
- ✅ FETCH_ERROR or TIMEOUT_ERROR from fetch API
- ✅ Socket.IO connection failures

**Recovery Mechanism:**
- 🔄 After 30 seconds, marked-down node can be retried
- 🔄 If request succeeds on new node, cycle back to primary after recovery window
- 🔄 Failed nodes reset after HEALTH_RESET_TIME

### Flow Diagram: Frontend Failover

```
User sends request (GET /api/products)
                    ↓
        apiSlice calls getActiveBackendUrl()
                    ↓
        networkConfig checks health of stored backend
                    ↓
    Is stored backend healthy? →→ YES → Use it
                    ↓ NO
    Find first healthy node
                    ↓
    Update sessionStorage.activeBackendUrl
                    ↓
    Send request to new backend URL
                    ↓
        Response success?
                    ↓
    NO: Request timeout / 5xx error / Network error
                    ↓
    markNodeDown(current backend)
                    ↓
    rotateBackendNode() finds next healthy
                    ↓
    Update sessionStorage.activeBackendUrl
                    ↓
    Dispatch 'backendRotated' event (for UI notification)
                    ↓
    Retry request on new backend
```

---

## 2. Backend Database Cluster Switching

### Responsible Files:
- **`server/config/db.js`** ⭐ PRIMARY CONTROLLER
- **`server/config/connectionManager.js`** (Connection pooling)
- **`server/models/syncQueueModel.js`** (Queue operations)

### How It Works:

#### File: `db.js` - Dual-Cluster Management & SyncQueue

**Responsibilities:**
1. Manages connections to both MongoDB clusters (A & B)
2. Implements dual-write logic
3. Detects cluster failures
4. Queues operations when Cluster B fails
5. Replays queued operations when Cluster B recovers

**Key Configuration:**
```javascript
const PRIMARY_URI = process.env.MONGO_URI_A;     // Cluster A (Primary)
const CLUSTER_B_URI = process.env.MONGO_URI_B;   // Cluster B (Secondary)
const QUEUE_LOCK_TIMEOUT_MS = 120000; // 2 minutes lock timeout
const SYNC_WORKER_ID = `${SERVICE_NAME}-${PID}-${TIMESTAMP}`;
// Unique ID for each backend instance to prevent duplicate queue processing

let currentMode = 'none'; // 'replica' | 'standalone' | 'none'
let clusterBConnection = null;
let isProcessingQueue = false;
```

**1. Dual-Write Logic:**

```javascript
const scheduleSyncTask = async (task) => {
  if (!CLUSTER_B_URI) return; // Dual cluster not configured
  if (isClusterBOperation(task)) return; // Skip if already from Cluster B
  if (!task.modelName || !task.action) return;

  const activeConn = getActiveConnection();
  const passiveConn = getPassiveConnection();

  // Try to write to Cluster B immediately
  if (passiveConn && isConnectionReady(passiveConn)) {
    try {
      // Execute on Cluster B
      await executeTaskOnConnection(task, passiveConn);
      return; // Success - no need to queue
    } catch (err) {
      // Cluster B write failed
      console.warn(`Sync task failed, queueing for retry: ${task.action}`);
    }
  }

  // Cluster B failed or unavailable -> Queue for later
  await persistSyncTask(task);
};
// If both writes succeed: Perfect consistency
// If Cluster B fails: Operation queued on Cluster A for replay later
```

**2. Queue Persistence (When Cluster B Down):**

```javascript
const persistSyncTask = async (task) => {
  const activeConn = getActiveConnection();
  const queueModel = getQueueModel(activeConn);
  const origin = getConnectionName(activeConn);

  try {
    // Create SyncQueue document with operation details
    await queueModel.create({
      ...task,
      origin,
      status: 'pending',        // Waiting to be processed
      lockedBy: undefined,      // No lock yet
      lockedAt: undefined,
      attempts: 0,
      lastError: undefined,
    });
    console.log(`[DB] Task queued: ${task.modelName} ${task.action}`);
  } catch (err) {
    console.error('[DB] Failed to persist sync queue task:', err.message);
  }
};
// Creates document in SyncQueue collection for later replay
```

**3. Queue Processing & Replay (When Cluster B Recovers):**

```javascript
const processSyncQueueFrom = async (sourceConn, targetConn) => {
  if (!isConnectionReady(sourceConn) || !isConnectionReady(targetConn)) return;
  
  const queueModel = getQueueModel(sourceConn);
  const staleLockDate = new Date(Date.now() - QUEUE_LOCK_TIMEOUT_MS);

  while (isConnectionReady(sourceConn) && isConnectionReady(targetConn)) {
    // Find next pending task (or stale lock that can be reclaimed)
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
          status: 'processing',    // Mark as being processed
          lockedBy: SYNC_WORKER_ID, // Lock with this worker's ID
          lockedAt: new Date(),     // Lock timestamp
        },
      },
      { sort: { createdAt: 1 }, returnDocument: 'after' }
    );

    if (!task) return; // No more tasks

    try {
      // Re-execute operation on target cluster
      await executeTaskOnConnection(task, targetConn);
      
      // Success - delete from queue
      await queueModel.deleteOne({ _id: task._id, lockedBy: SYNC_WORKER_ID });
      console.log(`[DB] Task replayed: ${task.modelName}`);
    } catch (err) {
      // Handle errors
      if (task.action === 'upsert' && err.code === 11000) {
        // Duplicate key - already exists on target, safe to delete
        await queueModel.deleteOne({ _id: task._id, lockedBy: SYNC_WORKER_ID });
        continue;
      }
      
      // Other error - release lock and retry later
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
// Distributed Lock: Only one worker (Render or Replit) processes each queue item
// Lock Timeout: 120 seconds prevents deadlock if worker crashes
// Processes oldest tasks first (FIFO via createdAt)
```

**4. Cluster B Connection & Reconnection Monitoring:**

```javascript
const connectClusterB = async () => {
  if (!CLUSTER_B_URI) {
    console.log('[DB] Cluster B not configured');
    return;
  }

  if (isConnectionReady(clusterBConnection)) return clusterBConnection;
  if (clusterBConnectPromise) return clusterBConnectPromise;

  clusterBConnectPromise = (async () => {
    try {
      // Create separate connection to Cluster B
      clusterBConnection = await mongoose.createConnection(
        CLUSTER_B_URI,
        {
          bufferCommands: false,
          serverSelectionTimeoutMS: 20000,
          connectTimeoutMS: 20000,
          socketTimeoutMS: 60000,
        }
      ).asPromise();

      console.log(`✅ Secondary MongoDB connected: ${CLUSTER_B_URI}`);
      
      // Process any queued tasks now that Cluster B is online
      await processSyncQueues();

      // Monitor connection state
      clusterBConnection.on('disconnected', () => {
        console.warn('[DB] Secondary MongoDB disconnected');
      });

      clusterBConnection.on('reconnected', async () => {
        console.log('[DB] Secondary MongoDB reconnected');
        // Immediately replay queued operations
        await processSyncQueues();
      });
      
      return clusterBConnection;
    } catch (err) {
      console.error('[DB] Failed to connect secondary MongoDB:', err.message);
      // Retry in 10 seconds
      setTimeout(connectClusterB, 10000);
      return null;
    }
  })();

  return clusterBConnectPromise;
};
// Automatic reconnection: Retries every 10 seconds if initial connect fails
// Automatic queue replay: When reconnection succeeds, immediately processes queue
// Separate connection pool: Independent from primary for better isolation
```

**5. Periodic Reconnect Watcher:**

```javascript
const startReconnectWatcher = () => {
  setInterval(async () => {
    const state = mongoose.connection.readyState;

    // Check if primary connection is lost
    if (state === 0 || state === 3) {
      console.log('[DB] Primary connection lost');
      await connectDB();
      return;
    }

    // Check if secondary (Cluster B) needs reconnection
    if (CLUSTER_B_URI && (!clusterBConnection || clusterBConnection.readyState !== 1)) {
      console.log('[DB] Attempting to reconnect secondary...');
      await connectClusterB(); // This triggers queue replay on success
    }

    // Process any pending queue items
    await processSyncQueues();
  }, 15000); // Check every 15 seconds
};
// Continuous monitoring: Detects recovered clusters
// Automatic replay: Triggers processSyncQueues() every 15 seconds
// Handles primary failures: Can switch to secondary if primary goes down
```

**Cluster B Sync Plugin (For All Models):**

```javascript
const clusterBSyncPlugin = (schema) => {
  // After any save operation
  schema.post('save', async function (doc) {
    if (!doc || isClusterBOperation(doc)) return;
    
    // Schedule dual-write to Cluster B
    await scheduleSyncTask({
      modelName: doc.constructor.modelName,
      action: 'upsert',
      query: { _id: doc._id },
      payload: doc.toObject({ depopulate: true }),
    });
  });

  // After any remove operation
  schema.post('remove', async function (doc) {
    if (!doc || isClusterBOperation(doc)) return;
    
    // Schedule delete on Cluster B
    await scheduleSyncTask({
      modelName: doc.constructor.modelName,
      action: 'deleteOne',
      query: { _id: doc._id },
    });
  });

  // Similar for updateOne, updateMany, etc.
};

// Apply plugin to ALL schemas
mongoose.plugin(clusterBSyncPlugin);
```

**Auto-Applied to all models** - every save/update/delete automatically triggers Cluster B sync

---

#### File: `connectionManager.js` - Connection Pooling & Active Connection Selection

**Responsibilities:**
1. Maintains connection references for both clusters
2. Implements automatic fallback to available cluster
3. Routes operations to healthy cluster using Proxy pattern

**Key Functions:**

```javascript
// Get currently healthy connection (used by operations)
const getActiveConnection = () => {
  // Primary healthy -> use primary
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  
  // Primary down, secondary healthy -> use secondary
  if (clusterBConnection && clusterBConnection.readyState === 1) {
    return clusterBConnection;
  }
  
  // Both down -> throw error
  throw new Error('No active MongoDB connection available');
};
// Used by every operation: findOne, create, updateOne, etc.

// Get opposite connection (used for dual-writes)
const getPassiveConnection = () => {
  const activeConn = getActiveConnection();
  return activeConn === mongoose.connection ? clusterBConnection : mongoose.connection;
};

// Create model that auto-routes to active connection
const createProxiedModel = (modelName, schema, collection) => {
  return new Proxy(ModelTarget, {
    get(target, prop) {
      // Any operation goes through active connection
      const activeModel = addModelToConnection(
        getActiveConnection(),
        modelName,
        schema,
        collection
      );
      return activeModel[prop];
    },
    construct(_target, args) {
      const activeModel = addModelToConnection(
        getActiveConnection(),
        modelName,
        schema,
        collection
      );
      return new activeModel(...args);
    },
  });
};
// When Cluster B goes down: getActiveConnection() automatically returns Cluster A
// When Cluster A goes down: getActiveConnection() automatically returns Cluster B
```

**Connection States:**
- readyState 0: Disconnected
- readyState 1: Connected (ready)
- readyState 2: Connecting
- readyState 3: Disconnecting

---

#### File: `syncQueueModel.js` - Queue Storage Schema

**Schema Structure:**

```javascript
{
  modelName: String,        // 'User', 'Product', 'Order', etc.
  action: String,           // 'upsert', 'updateOne', 'deleteOne', etc.
  query: Mixed,             // Query filter for update/delete: { _id: '123' }
  payload: Mixed,           // Document data for upsert/insert: { name, email, ... }
  options: Mixed,           // MongoDB options
  origin: String,           // 'primary' or 'secondary' - where operation came from
  status: String,           // 'pending' or 'processing'
  lockedBy: String,         // SYNC_WORKER_ID of processing worker
  lockedAt: Date,           // When lock acquired
  attempts: Number,         // Retry count
  lastError: String,        // Error message if last attempt failed
  timestamps: true          // createdAt, updatedAt
}
```

**Example Queue Entry:**
```javascript
{
  _id: ObjectId('...'),
  modelName: 'User',
  action: 'upsert',
  query: { _id: ObjectId('user123') },
  payload: { name: 'Ahmed', email: 'ahmed@example.com', ... },
  status: 'pending',
  origin: 'primary',
  attempts: 0,
  createdAt: 2024-03-20T10:30:00Z
}
```

---

### Database Failover Flow

```
Operation occurs (e.g., User.create)
                ↓
        db.js dual-write plugin triggered
                ↓
    Try to write to Cluster A (primary)
                ↓
            SUCCESS ✓
                ↓
    Try to write to Cluster B (secondary)
                ↓
        Response? → SUCCESS ✓ → Return to controller
                ↓              Both clusters consistent
            TIMEOUT/ERROR
                ↓
        Operation queued in SyncQueue
        (stored on Cluster A)
                ↓
        Return SUCCESS to controller
        (User sees consistent response)
                ↓
        Application continues on Cluster A
                ↓
        Every 15 seconds: startReconnectWatcher()
                ↓
        Is Cluster B online?
                ↓
            YES → processSyncQueues()
                ↓
        Find oldest pending task
                ↓
        Claim distributed lock (SYNC_WORKER_ID)
                ↓
        Re-execute operation on Cluster B
                ↓
        Delete from SyncQueue on success
                ↓
    Both clusters now consistent again
```

---

## 3. Socket.IO Event Broadcasting Between Backends

### Responsible Files:
- **`server/utils/peerSync.js`** ⭐ PRIMARY CONTROLLER
- **`server/index.js`** (Registers /api/internal/sync endpoint)

### How It Works:

#### File: `peerSync.js` - Inter-Backend Communication

**Responsibilities:**
1. Detects when events need to be synced to peer backend
2. Makes HTTP POST to peer backend's /api/internal/sync endpoint
3. Handles peer backend temporary unavailability
4. Ensures event consistency across both backends

**Key Function:**

```javascript
const emitToAll = async (io, event, payload) => {
  // 1. Emit to all local Socket.IO clients on THIS backend
  io.emit(event, payload);
  console.log(`[Sync] Emitted locally: ${event}`);

  // 2. Send to peer backend(s) via HTTP
  const peerBackends = [PEER_BACKEND_URL].filter(
    url => url && url !== process.env.BACKEND_URL
  );

  for (const peerUrl of peerBackends) {
    try {
      await axios.post(
        `${peerUrl}/api/internal/sync`,
        { event, payload, timestamp: Date.now() },
        {
          headers: {
            'Internal-Secret': process.env.INTERNAL_SECRET
          },
          timeout: 5000 // 5-second timeout
        }
      );
      console.log(`[Sync] Synced to peer: ${peerUrl}`);
    } catch (err) {
      // Peer temporarily unreachable
      console.warn(`[Sync] Failed to sync to ${peerUrl}: ${err.message}`);
      // Peer will eventually reconnect and receive updates via next emission
    }
  }
};
```

**Used in Routes:**

```javascript
// In orderRoutes.js
module.exports = (io) => {
  const router = express.Router();

  // Attach io to every request with sync wrapper
  router.use((req, _res, next) => {
    req.io = {
      emit: (event, payload) => emitToAll(io, event, payload),
    };
    next();
  });

  // In controller, emit events with automatic syncing
  router.route('/').post(protect, addOrderItems); // Creates order
  // Inside addOrderItems controller:
  req.io.emit('orderCreated', { orderId, sellers, totalPrice });
  // ↑ This automatically broadcasts to:
  //   - All connected clients on this backend
  //   - Peer backend via HTTP POST
};
```

#### File: `server/index.js` - Internal Sync Endpoint

**The endpoint that receives sync events from peer:**

```javascript
// POST /api/internal/sync
app.post('/api/internal/sync', (req, res) => {
  const secret = req.headers['internal-secret'];
  
  // Verify authentication (peer backend must know shared secret)
  if (secret !== process.env.INTERNAL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { event, payload } = req.body;

  // Re-emit to all local Socket.IO clients on THIS backend
  io.emit(event, payload);
  console.log(`[Sync] Received and re-emitted: ${event}`);

  res.json({ success: true });
});
```

**Sync Flow:**

```
Operation on Render Backend (Primary)
                ↓
Controller calls: req.io.emit('orderCreated', {...})
                ↓
emitToAll() function (peerSync.js)
                ↓
1. Emit to Render Socket.IO clients
                ↓
2. HTTP POST to Replit: /api/internal/sync
   Headers: { 'Internal-Secret': shared_secret }
   Body: { event: 'orderCreated', payload: {...} }
                ↓
Replit receives on /api/internal/sync endpoint (index.js)
                ↓
Verify secret (authentication)
                ↓
io.emit('orderCreated', {...})
                ↓
Emit to all Replit Socket.IO clients
                ↓
Result: All buyers see "New order" notification
        regardless of which backend they're connected to
```

**Failure Handling:**
- If Replit temporarily down: HTTP POST fails, logged as warning
- Event still delivered to Render clients immediately
- When Replit comes back up: Reconnects, receives future events
- No message loss - events queued in database if needed for UI sync

---

## 4. File Upload Failover

### Responsible Files:
- **`server/middleware/uploadMiddleware.js`** (Primary upload)
- **`server/middleware/peerUploadFallback.js`** (Fallback for failed uploads)
- **`server/routes/uploadRoutes.js`** (Route definition)

### How It Works:

```javascript
// uploadRoutes.js
router.post(
  '/upload',
  uploadMiddleware.single('file'),      // Try to save to THIS backend
  peerUploadFallback,                   // If failed, proxy to PEER
  (req, res) => {
    res.json({ filename: req.file.filename });
  }
);

// peerUploadFallback.js middleware
async function peerUploadFallback(req, res, next) {
  // If upload succeeded locally, continue
  if (req.file) {
    return next();
  }

  // Local upload failed, try peer backend
  console.warn('[Upload] Local upload failed, trying peer backend...');
  
  try {
    const peerUrl = getPeerBackendUrl();
    
    // Proxy upload to peer (send same file to peer backend)
    const response = await proxyUploadToPeer(req.file, peerUrl);
    
    // Rewrite file path to point to peer backend
    req.file.filename = response.filename;
    req.file.path = `${peerUrl}/uploads/${response.filename}`;
    
    console.log('[Upload] File uploaded to peer backend');
    next(); // Continue to response handler
  } catch (error) {
    res.status(500).json({ error: 'Upload failed on both backends' });
  }
}
```

**Fallback Logic:**
1. Primary backend (Render) tries to save image
2. If succeeds: Image stored on Render server
3. If fails: Automatically proxy to Replit backend
4. Image URL rewritten to point to whichever backend succeeded
5. If both fail: Return error to client

---

## 5. Summary: Who Does What

| Component | Responsibility | Triggered By |
|-----------|-----------------|--------------|
| **networkConfig.js** | Track backend health, rotate to next healthy backend, 30-sec recovery window | Request timeouts, 5xx errors |
| **apiSlice.js** | Detect request failures, call rotateBackendNode(), retry on new backend | fetch failures, network errors |
| **db.js** | Dual-write to both clusters, queue failed ops, detect cluster failures, replay queued ops | Model save/update/delete operations |
| **connectionManager.js** | Route operations to healthy cluster via Proxy, fallback logic | getActiveConnection() calls |
| **syncQueueModel.js** | Store failed operations for replay | Persist when Cluster B unavailable |
| **peerSync.js** | Emit events to peer backend via HTTP | req.io.emit() calls in controllers |
| **server/index.js** | Receive sync events, re-emit to local clients | HTTP POST from peer backend |
| **startReconnectWatcher()** | Monitor cluster health, trigger queue replay on recovery | 15-second interval checks |
| **uploadMiddleware.js** | Save files to primary backend | File upload requests |
| **peerUploadFallback.js** | Proxy upload to secondary if primary fails | Upload failure on primary |

---

## 6. Failure Scenarios & Recovery

### Scenario 1: Secondary Backend (Replit) Fails

```
Time:        Action:                              Handled By:
0s     Replit goes offline
       ↓
1s     Frontend sends request to Render           → Works (Primary)
       ↓
2s     Order created                              → db.js: Dual-write to Cluster A ✓
       ↓
3s     Try Cluster B                              → db.js: Timeout/No connection
       ↓
4s     Queue operation in SyncQueue               → persistSyncTask()
       ↓
5s     Return success to client                   → Client unaware of Cluster B failure
       ↓
30s    If frontend requests from Render again     → Works (still primary)
       ↓
45s    startReconnectWatcher() runs               → Check Cluster B connectivity
       ↓
50s    Replit comes back online                   → connectClusterB() succeeds
       ↓
51s    Cluster B reconnection event fires         → processSyncQueues() called
       ↓
52s    Queued operations replayed to Cluster B    → Both clusters now consistent
```

### Scenario 2: Primary Backend (Render) Becomes Unavailable

```
Time:   Action:                                   Handled By:
0s  Render backend crashes
    ↓
2s  Frontend (on Render) sends request           → Connection timeout after 8s
    ↓
10s RTK Query catch handler                      → markNodeDown(Render)
    ↓
11s rotateBackendNode() finds Replit healthy     → rotateBackendNode()
    ↓
12s Update sessionStorage.activeBackendUrl       → networkConfig.js
    ↓
13s Dispatch 'backendRotated' event              → UI shows notification
    ↓
14s Retry same request to Replit                 → apiSlice retry logic
    ↓
15s Replit processes request                     → Works (secondary now primary)
    ↓
16s Database operation executes                  → Both Clusters still synchronized
    ↓
30s startReconnectWatcher() runs on Replit       → Tries to connect Cluster A
    ↓
35s Render comes back online                     → Cluster A reconnects
    ↓
36s Queue replay begins                          → processSyncQueues()
    ↓
37s Both clusters synchronized again
```

### Scenario 3: Both MongoDB Clusters Down

```
Time:   Action:
0s  Both Cluster A & B offline
    ↓
5s  Backend tries to save user                   → Both cluster writes fail
    ↓
6s  Cannot queue (Cluster A is primary source)   → Critical error
    ↓
7s  Return error to client                       → User sees "Service unavailable"
    ↓
8s  startReconnectWatcher() detects both down    → Logs critical error
    ↓
60s Cluster A comes back online                  → mongoose.connection recovers
    ↓
61s startReconnectWatcher() retries              → Attempts to reconnect Cluster B
    ↓
70s Cluster B comes online                       → clusterBConnection recovers
    ↓
71s processSyncQueues() starts                   → Replays queued operations
    ↓
72s Full consistency restored
```

---

## 7. Configuration Required

### Frontend (.env file)
```
VITE_API_BASE_URL=https://render.com         # Primary backend (Render)
VITE_FALLBACK_API_URL=https://replit.com     # Secondary backend (Replit)
```

### Backend (.env file)
```
MONGO_URI_A=mongodb+srv://cluster-a.mongodb.net    # Primary cluster
MONGO_URI_B=mongodb+srv://cluster-b.mongodb.net    # Secondary cluster
INTERNAL_SECRET=shared-secret-for-peer-sync        # For /api/internal/sync auth
SYNC_QUEUE_LOCK_TIMEOUT_MS=120000                  # 2 minutes
RENDER_SERVICE_NAME=render                        # Or REPL_SLUG for Replit
```

---

## 8. Key Takeaways

### ✅ Frontend Failover (networkConfig.js + apiSlice.js)
- Automatic backend switching on failure
- 30-second recovery window for failed nodes
- Session persistence via sessionStorage
- Transparent to user (no logout needed)

### ✅ Database Cluster Failover (db.js + connectionManager.js)
- Dual-write when both available (strong consistency)
- Queue when Cluster B unavailable (eventual consistency)
- Automatic replay on recovery
- Distributed locks prevent duplicate processing

### ✅ Event Broadcasting (peerSync.js + index.js)
- Real-time sync between backends
- HTTP POST with shared secret authentication
- Graceful handling of peer unavailability
- All connected clients stay in sync

### ✅ Upload Failover (uploadMiddleware.js + peerUploadFallback.js)
- Primary backend tries first
- Automatic proxy to secondary on failure
- URL rewriting to point to successful backend
- Transparent to frontend

### ⚡ Monitoring & Recovery (startReconnectWatcher)
- 15-second health checks
- Automatic reconnection attempts
- Queued operation replay on recovery
- Continuous eventual consistency

