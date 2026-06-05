// List all backend nodes with failover priority (order matters!)
export const PEER_NODES = [
  // Production primary (Render)
  'https://gulit-ecommerce.onrender.com',
  // Automatic failover (Back4App) if Render is down
  'https://gulitecommerce-041ejql5.b4a.run',
  // Local development fallback
  'http://localhost:3000',
];

// Health check tracking - remember which nodes are down
const nodeHealthMap = new Map();
const HEALTH_RESET_TIME = 30000; // 30 seconds - retry failed nodes after this

export const markNodeDown = (url) => {
  nodeHealthMap.set(url, { isDown: true, timestamp: Date.now() });
};

export const markNodeUp = (url) => {
  nodeHealthMap.delete(url);
};

export const isNodeHealthy = (url) => {
  const health = nodeHealthMap.get(url);
  if (!health) return true; // Unknown nodes are assumed healthy
  
  // If node has been down for longer than reset time, retry it
  if (Date.now() - health.timestamp > HEALTH_RESET_TIME) {
    nodeHealthMap.delete(url);
    return true;
  }
  
  return !health.isDown;
};

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

  const isPrivateIp = (url) => {
    if (!url || typeof url !== 'string') return false;
    // Matches 10.x.x.x, 192.168.x.x, 172.16-31.x.x and localhost
    return /(^|:\/\/)(10\.|127\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(url) || url.includes('localhost');
  };

  // If no stored value → use default (which prefers VITE_API_BASE_URL)
  if (!stored) return getDefaultBackendUrl();

  // Ignore private ZeroTier/local IPs in deployed/frontend environments
  if (isPrivateIp(stored)) {
    sessionStorage.removeItem('activeBackendUrl');
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
  // Find the current node's index
  const currentIndex = PEER_NODES.indexOf(currentUrl);
  
  // Try to find the next healthy node in order
  for (let i = 1; i < PEER_NODES.length; i++) {
    const nextIndex = (currentIndex + i) % PEER_NODES.length;
    const nextNode = PEER_NODES[nextIndex];
    
    if (isNodeHealthy(nextNode)) {
      const clean = nextNode.replace(/\/$/, '');
      sessionStorage.setItem('activeBackendUrl', clean);
      console.warn(`🔄 Switched backend from [${currentUrl}] to [${clean}]`);
      // Dispatch custom event to notify listeners (like Socket.io connection in App.jsx)
      window.dispatchEvent(new Event('backendRotated'));
      return clean;
    }
  }
  
  // If all nodes are marked unhealthy, fall back to the first one anyway (reset)
  const fallbackNode = PEER_NODES[0];
  const clean = fallbackNode.replace(/\/$/, '');
  sessionStorage.setItem('activeBackendUrl', clean);
  console.warn(`🔄 No healthy nodes found, resetting to primary: [${clean}]`);
  nodeHealthMap.clear(); // Clear health tracking to retry
  return clean;
};

// Keep active backend URL across refreshes within the same session/tab