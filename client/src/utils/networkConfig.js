// List all peer backend nodes across your ZeroTier network
export const PEER_NODES = [
  // Production primary (Render)
  'https://gulit-ecommerce.onrender.com',
  // Alternative public backend (Replit) if you deploy there
  'https://gulit-server--yirgalemzegeye2.replit.app',
  // Local development fallback
  'http://localhost:3000',
];

// Always prefer the current machine backend first
const getDefaultBackendUrl = () => {
  const { protocol, hostname } = window.location;

  // Use the explicit frontend env var in deployed production builds.
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envBaseUrl && envBaseUrl !== '' && envBaseUrl !== 'http://localhost:3000') {
    return envBaseUrl.replace(/\/$/, '');
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }

  return `${protocol}//${hostname}:3000`;
};

// NEVER trust stale session URL blindly
export const getActiveBackendUrl = () => {
  const stored = sessionStorage.getItem('activeBackendUrl');

  // If no stored value → use local machine backend
  if (!stored) {
    return getDefaultBackendUrl();
  }

  // If stored node is not part of cluster anymore → reset
  if (!PEER_NODES.includes(stored)) {
    sessionStorage.removeItem('activeBackendUrl');
    return getDefaultBackendUrl();
  }

  return stored;
};

export const rotateBackendNode = (currentUrl) => {
  const fallbackNode = PEER_NODES.find((node) => node !== currentUrl);

  if (fallbackNode) {
    sessionStorage.setItem('activeBackendUrl', fallbackNode);
    console.warn(`🔄 Switched backend to: ${fallbackNode}`);
    // Dispatch custom event to notify listeners (like Socket.io connection in App.jsx)
    window.dispatchEvent(new Event('backendRotated'));
    return fallbackNode;
  }

  return currentUrl;
};

// Keep active backend URL across refreshes within the same session/tab