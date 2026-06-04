const axios = require('axios');

const normalizeNameFromEmail = (email) => {
  const local = String(email || '').split('@')[0] || 'User';
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
};

const verifyGoogleCredential = async (credential) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured on server');
  }
  if (!credential) {
    throw new Error('Google credential token is required');
  }

  const { data } = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
    params: { id_token: credential },
  });

  if (data.aud !== googleClientId) {
    throw new Error('Google token audience mismatch');
  }
  if (data.email_verified !== 'true') {
    throw new Error('Google email is not verified');
  }

  const email = String(data.email || '').toLowerCase();
  const name = data.name || normalizeNameFromEmail(email);
  const googleId = data.sub;

  if (!email || !googleId) {
    throw new Error('Invalid Google token payload');
  }

  return { email, name, googleId };
};

module.exports = { verifyGoogleCredential, normalizeNameFromEmail };
