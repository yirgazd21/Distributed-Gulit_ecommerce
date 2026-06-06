const http = require('http');
const { Server } = require('socket.io');

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB, startReconnectWatcher } = require('./config/db');
const { emitToAll, INTERNAL_SECRET } = require('./utils/peerSync');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const path = require('path');
const uploadRoutes = require('./routes/uploadRoutes');
const peerUploadFallback = require('./middleware/peerUploadFallback');
const orderRoutes = require('./routes/orderRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const sellerProductRoutes = require('./routes/sellerProductRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminSellerRoutes = require('./routes/adminSellerRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const adminOrderRoutes = require('./routes/adminOrderRoutes');
const adminFinanceRoutes = require('./routes/adminFinanceRoutes');
const adminSupportRoutes = require('./routes/adminSupportRoutes');
const adminSystemRoutes = require('./routes/adminSystemRoutes');
const platformUpdateRoutes = require('./routes/platformUpdateRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── HTTP + SOCKET.IO SETUP ───────────────────────────────────────────────────
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});


// ─── MIDDLEWARES ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── DATABASE ─────────────────────────────────────────────────────────────────
// connectDB tries replica set first, falls back to local MongoDB automatically
connectDB();
startReconnectWatcher();

app.get('/', (req, res) => {
    res.status(200).send('Backend is running on cluster A');
});

// ─── INTERNAL PEER-SYNC ENDPOINT ─────────────────────────────────────────────
// Called by the peer server to re-emit socket events to THIS server's clients.
// Protected by a shared secret — never exposed to the public.
app.post('/api/internal/sync', express.json(), (req, res) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== INTERNAL_SECRET) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const { event, payload } = req.body;
  if (event) {
    io.emit(event, payload || {});
    console.log(`[PeerSync] Re-emitted '${event}' from peer`);
  }
  res.json({ ok: true });
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/orders', orderRoutes(io));
app.use('/api/sellers', sellerRoutes);
app.use('/api/sellers/products', sellerProductRoutes(io));
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/sellers', adminSellerRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/finance', adminFinanceRoutes);
app.use('/api/admin/support', adminSupportRoutes);
app.use('/api/admin/system', adminSystemRoutes);
app.use('/api/platform', platformUpdateRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/webhooks', webhookRoutes);

app.use('/uploads', express.static(path.join(__dirname, '/uploads')));
app.use('/uploads', peerUploadFallback);


// ─── ENV CHECK ────────────────────────────────────────────────────────────────
console.log('--- ENV CHECK ---');
console.log('CHAPA_SECRET_KEY exists:', !!process.env.CHAPA_SECRET_KEY);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('-----------------');


// ─── GLOBAL JSON ERROR HANDLER ───────────────────────────────────────────────
// Must be registered AFTER all routes. Catches any error passed via next(err)
// or thrown inside an async handler wrapped with express-async-errors / asyncHandler.
// Without this, Express falls back to its default HTML error page.
app.use((err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', (err) => {
  if (err) console.error(err);
  console.log(`✅ Backend listening on PORT ${PORT} `);
});
