const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const ALLOWED_UPLOAD_NAME = /^[a-zA-Z0-9._-]+$/;

const getPeerBaseUrl = () => process.env.PEER_API_URL || process.env.API_URL || '';

const fetchFromPeer = (filename, destination) =>
  new Promise((resolve, reject) => {
    const peerBase = getPeerBaseUrl();
    if (!peerBase) {
      reject(new Error('Peer API URL is not configured'));
      return;
    }

    let url;
    try {
      url = new URL(`/uploads/${encodeURIComponent(filename)}`, peerBase);
    } catch (err) {
      reject(err);
      return;
    }

    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.get(url, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Peer upload returned ${response.statusCode}`));
        return;
      }

      fs.mkdirSync(path.dirname(destination), { recursive: true });
      const file = fs.createWriteStream(destination, { flags: 'wx' });

      response.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', (err) => {
        fs.promises.unlink(destination).catch(() => {});
        reject(err);
      });
    });

    request.setTimeout(5000, () => request.destroy(new Error('Peer upload request timed out')));
    request.on('error', reject);
  });

const peerUploadFallback = async (req, res, next) => {
  const filename = path.basename(req.path);
  if (!filename || !ALLOWED_UPLOAD_NAME.test(filename)) {
    return res.status(400).json({ message: 'Invalid upload path' });
  }

  const localPath = path.join(UPLOADS_DIR, filename);

  try {
    await fetchFromPeer(filename, localPath);
    return res.sendFile(localPath);
  } catch (err) {
    return next();
  }
};

module.exports = peerUploadFallback;
