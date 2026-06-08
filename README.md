# 🛒 Gulit E-Commerce: Distributed Multi-Tenant Marketplace

Gulit is a robust, full-stack MERN marketplace platform featuring separated portals for **Buyers**, **Sellers**, and **Admins**. Architected as a **highly-available, resilient distributed system**, the platform guarantees operational continuity during server crashes or database cluster outages through client-side failover routing and backend write-mirroring.

---

## 🌐 Live Deployments
* **Frontend Portal (Vercel)**: [https://gulitecommerce.vercel.app](https://gulitecommerce.vercel.app)
* **Server 1 (Render)**: `https://your-render-backend.onrender.com`
* **Server 2 (Replit)**: `https://your-replit-backend.replit.app`

---

## 💎 Key Features

### 🛍️ Buyer storefront
* **Seamless Catalog**: Product search, nested category filtering, product specifications, and community ratings/reviews.
* **Smart Shopping**: Dynamic persistent cart, customizable shipping options, and checkout streams.
* **Personal Security**: Order history status tracking, profile settings, and email-based password resets.

### 🏪 Seller Dashboard
* **KYC Onboarding**: Fast seller setup requiring document verification (ID card, business license, tax receipts).
* **Store Management**: Profile customization (logo, banner, themes, social media mapping).
* **Delivery & Shipping**: Customized shipping methods (Standard, Express, Free), handling fees, warehouse locations, and status updates.
* **Earning Wallet**: Real-time balance logs and automated/manual payout configurations.

### 🛡️ Admin Control Panel
* **Seller Audits**: Review onboarding applications, approve/suspend sellers, and view history.
* **Platform Operations**: Configure category mapping and moderate disputes.
* **Announcements**: Publish, schedule, and configure rich-text announcements for buyers or sellers.

---

## 🏗️ Distributed Architecture & Resiliency

Gulit operates as a distributed active-passive server configuration and active-active mirrored databases.

```mermaid
flowchart LR
  U[User] --> V[Vercel Frontend]
  V --> R[Render Backend]
  V --> P[Replit Backend]
  R <--> A[(MongoDB Atlas Cluster A)]
  R <--> B[(MongoDB Atlas Cluster B)]
  P <--> A
  P <--> B
  R <-->|peer sync| P
```

### 1. Dynamic Request Routing
* The frontend initiates connections using the primary backend server (`VITE_API_BASE_URL`).
* The active server URL is stored in the browser's `sessionStorage`.
* In the event of a network or socket exception, the client automatically rotates request traffic to the fallback server (`VITE_FALLBACK_API_URL`) without interrupting user sessions.

### 2. Automated Server Failover (Render ↔ Replit)
* **Outage Detection**: Handled inside RTK Query interceptors and Socket.io connect listeners.
* **Endpoint Swapping**: When the active endpoint is unresponsive, the frontend shifts the base API target and re-runs the failed request.
* **Static Assets**: Image assets and media uploads are dynamically requested from the active node's storage using a dynamic media URL builder.

### 3. Dual-Cluster Database Synchronization (SyncQueue)
To guarantee data durability across database failovers:
* **Normal Mode**: Write operations are committed concurrently to both **MongoDB Cluster A** and **MongoDB Cluster B**.
* **Degraded Mode**: If Cluster B goes offline, the server processes the write on Cluster A and logs a replication task in the **`SyncQueue`** collection.
* **Self-Healing Replay**: A watcher continually monitors the database connections. Upon reconnection of Cluster B, the system locks the queue to prevent duplicate processing, replays the pending writes sequentially, and updates task statuses.

---

## 💻 Tech Stack We Used

* **Frontend**: React 19, Vite 7, Redux Toolkit (State Management), RTK Query (Caching & APIs), Tailwind CSS v4, React Toastify, Socket.io-client.
* **Backend**: Node.js, Express 5, Socket.io (Realtime sync & events), Multer (Image processing), Nodemailer & SendGrid.
* **Databases**: MongoDB Atlas (Multi-Cluster setup).

---

## 📁 Repository Structure & Key Files
```text
gulit-ecomerce/
  client/                      # React + Vite Client Application
    src/
      admin/                   # Admin pages, components, and Redux slices
      components/              # Shared components (Loaders, Footers, etc.)
      context/                 # Global Theme Context (Light/Dark mode)
      pages/                   # Buyer storefront and Seller workspace
      store/slices/            # Redux API and authentication slices
      utils/                   # Client utilities (media builders, network config)
  server/                      # Node.js + Express Backend API
    config/                    # Database connection manager (Cluster A & B setup)
    controllers/               # Express Controllers (Auth, Products, Orders)
    models/                    # Mongoose database models (User, SyncQueue, etc.)
    routes/                    # Express routing files
    utils/                     # Email services, peer socket connections
```

### Critical Source Files
* **[client/src/utils/networkConfig.js](client/src/utils/networkConfig.js)**: Manages active server state, health check validation, and route switching.
* **[client/src/store/slices/apiSlice.js](client/src/store/slices/apiSlice.js)**: Injects the dynamically selected active backend URL into all RTK Query operations.
* **[server/config/connectionManager.js](server/config/connectionManager.js)**: Handles parallel initialization and status checks for MongoDB Cluster A and B.
* **[server/models/syncQueueModel.js](server/models/syncQueueModel.js)**: Model for queueing offline writes.
* **[server/utils/peerSync.js](server/utils/peerSync.js)**: Replays pending synchronization tasks upon cluster reconnection.

---

## ⚙️ Installation & Local Setup

### 1. Install Dependencies
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure Environment Variables
Create `server/.env`:
```env
# render

API_URL=https://your-render-backend.onrender.com
BASE_URL=https://your-render-backend.onrender.com
FRONTEND_URL=https://your-vercel-frontend.vercel.app
PEER_API_URL=https://your-replit-backend.replit.app

# On replit

API_URL=https://your-replit-backend.replit.app
BASE_URL=https://your-replit-backend.replit.app
FRONTEND_URL=https://your-vercel-frontend.vercel.app
PEER_API_URL=https://your-render-backend.onrender.com


# Common variables

MONGO_URI_A=mongodb+srv://user:password@cluster-a.mongodb.net/Gulit-Ecommerce?retryWrites=true&w=majority
MONGO_URI_B=mongodb+srv://user:password@cluster-b.mongodb.net/Gulit-Ecommerce?retryWrites=true&w=majority

JWT_SECRET=your_jwt_secret
INTERNAL_SYNC_SECRET=your_internal_sync_secret
WEBHOOK_SECRET=your_webhook_secret

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com

BUYER_RESET_URL=https://your-vercel-frontend.vercel.app/forgot-password
SELLER_RESET_URL=https://your-vercel-frontend.vercel.app/seller/reset-password
ADMIN_RESET_URL=https://your-vercel-frontend.vercel.app/admin/reset-password

CHAPA_SECRET_KEY=CHASECK_TEST_your_secret_key
CHAPA_PUBLIC_KEY=CHAPUBK_TEST_your_public_key
CHAPA_ENCRYPTION_KEY=your_chapa_encryption_key
CHAPA_WEBHOOK_SECRET=your_chapa_webhook_secret
CHAPA_API_HOST=https://api.chapa.co

CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

SYNC_QUEUE_LOCK_TIMEOUT_MS=120000
```

Create `client/.env`:
```env
VITE_API_BASE_URL=https://your-frontend-url
VITE_FALLBACK_API_URL=https://your-replit-backend.replit.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_CHAPA_PUBLIC_KEY=CHAPUBK_TEST_your_public_key
```

### 3. Run Locally
**Start Server**:
```bash
cd server && npm run dev
```
**Start Client**:
```bash
cd client && npm run dev
```

---

## 🧪 Testing Failover & Synchronization

### 1. Test Server Failover
1. Start both Render and Replit backend instances.
2. Open the frontend and log in. By default, it connects to the primary endpoint (Render).
3. Shut down the Render server process.
4. Try to navigate to a new section (e.g. settings or cart). 
5. Open your browser inspector. You will observe the client detects the network timeout and rotates its base endpoint to the Replit instance, carrying out the request without logging you out.

### 2. Test SyncQueue DB Syncing
1. Intentionally enter an incorrect connection string for `MONGO_URI_B` in `server/.env` to simulate a database cluster crash.
2. Complete a write action on the frontend (e.g. register a new account or update settings).
3. The server completes the write successfully on MongoDB Cluster A and logs a task in the `syncqueues` collection.
4. Restore the correct connection parameters for `MONGO_URI_B` and restart the server.
5. The connection manager automatically identifies the restored cluster status. The system claims the pending sync task, writes the changes to Cluster B, and flushes the queue item.

---

## 🔮 Future Improvements
* **Active-Active Consensus Integration**: Moving from passive client-side rotation to decentralized load balancing.
* **Distributed Object Syncing**: Replicating user-uploaded media files (product images, KYC documents) across different nodes using object bucket replication.
* **Conflict Resolution Strategy**: Integrating vector clocks to handle conflicting concurrent writes across clusters during network split-brain scenarios.
