// List all peer backend nodes across your ZeroTier network
export const PEER_NODES = [
  "http://10.40.210.101:3000",
  "http://10.40.210.21:3000",
];

// Always prefer the current machine backend first
const getDefaultBackendUrl = () => {
  const { protocol, hostname } = window.location;

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