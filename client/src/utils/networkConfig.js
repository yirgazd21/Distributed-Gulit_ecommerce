const normalizeUrl = (url) => String(url || '').replace(/\/$/, '');

const PRIMARY_URL = normalizeUrl(import.meta.env.VITE_API_BASE_URL);
const FALLBACK_URL = normalizeUrl(import.meta.env.VITE_FALLBACK_API_URL);

export const PEER_NODES = [PRIMARY_URL, FALLBACK_URL].filter(Boolean);
export const PRIMARY_BACKEND_URL = PEER_NODES[0] || '';

const nodeHealthMap = new Map();
const HEALTH_RESET_TIME = 30000;

export const markNodeDown = (url) => {
  if (!url) return;
  nodeHealthMap.set(normalizeUrl(url), {
    isDown: true,
    timestamp: Date.now(),
  });
};

export const markNodeUp = (url) => {
  if (!url) return;
  nodeHealthMap.delete(normalizeUrl(url));
};

export const isNodeHealthy = (url) => {
  const normalizedUrl = normalizeUrl(url);
  const health = nodeHealthMap.get(normalizedUrl);

  if (!health) return true;

  if (Date.now() - health.timestamp > HEALTH_RESET_TIME) {
    nodeHealthMap.delete(normalizedUrl);
    return true;
  }

  return health.isDown === false;
};

export const getHealthyNodes = () => PEER_NODES.filter(isNodeHealthy);

export const getPreferredBackendUrl = () => {
  const preferred = PEER_NODES.find(isNodeHealthy);
  if (preferred) return preferred;

  nodeHealthMap.clear();
  return PRIMARY_BACKEND_URL;
};

export const getActiveBackendUrl = () => {
  let active = normalizeUrl(sessionStorage.getItem('activeBackendUrl'));

  if (!active || !PEER_NODES.includes(active) || !isNodeHealthy(active)) {
    active = getPreferredBackendUrl();
    if (active) {
      sessionStorage.setItem('activeBackendUrl', active);
    }
  }

  return active;
};

export const rotateBackendNode = (currentUrl) => {
  const current = normalizeUrl(currentUrl || getActiveBackendUrl());
  markNodeDown(current);

  const nextNode = PEER_NODES.find((node) => node !== current && isNodeHealthy(node));
  const selectedNode = nextNode || getPreferredBackendUrl();

  if (selectedNode) {
    sessionStorage.setItem('activeBackendUrl', selectedNode);
  }

  window.dispatchEvent(new Event('backendRotated'));

  if (selectedNode && selectedNode !== current) {
    console.warn(`Switched backend from ${current} to ${selectedNode}`);
  }

  return selectedNode;
};
