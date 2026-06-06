/**
 * peerSync.js
 *
 * Emits a socket event to all clients connected to THIS server,
 * then fires a best-effort HTTP ping to the PEER server so it
 * re-emits the same event to its own connected clients.
 *
 * This replaces the Redis pub/sub adapter for a simple 2-node setup.
 */

const http = require('http');
const https = require('https');

// Secret shared between both servers so the /internal/sync endpoint
// only accepts calls from a known peer (not the public internet).
const INTERNAL_SECRET = process.env.INTERNAL_SYNC_SECRET || 'gulit_internal_sync_secret';

/**
 * Emit an event locally and notify the peer server.
 *
 * @param {import('socket.io').Server} io
 * @param {string} event   - socket event name
 * @param {object} payload - data to send with the event
 */
const emitToAll = (io, event, payload = {}) => {
  // 1. Emit to all clients connected to THIS server
  io.emit(event, payload);

  // 2. Notify the peer server (fire-and-forget, never throws)
  const peerBase = process.env.API_URL; // e.g. http://10.40.210.21:3000
  if (!peerBase) return;

  try {
    const body = JSON.stringify({ event, payload });
    const url = new URL('/api/internal/sync', peerBase);

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 3000),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-internal-secret': INTERNAL_SECRET,
      },
    };

    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(options, (res) => {
      // drain the response so the socket closes cleanly
      res.resume();
    });

    req.on('error', () => {
      // Peer is down — that's fine, its clients will re-fetch on reconnect
    });

    req.setTimeout(2000, () => req.destroy());
    req.write(body);
    req.end();
  } catch (_) {
    // URL parse error or other — ignore
  }
};

module.exports = { emitToAll, INTERNAL_SECRET };
