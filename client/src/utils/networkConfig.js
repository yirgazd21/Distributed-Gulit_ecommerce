const PRIMARY_URL = import.meta.env.VITE_API_BASE_URL;
const FALLBACK_URL = import.meta.env.VITE_FALLBACK_API_URL;

export const PEER_NODES = [
PRIMARY_URL,
FALLBACK_URL,
].filter(Boolean);

const nodeHealthMap = new Map();
const HEALTH_RESET_TIME = 30000;

// Track node failures
export const markNodeDown = (url) => {
nodeHealthMap.set(url, {
isDown: true,
timestamp: Date.now(),
});
};

export const markNodeUp = (url) => {
nodeHealthMap.delete(url);
};

export const isNodeHealthy = (url) => {
const health = nodeHealthMap.get(url);

if (!health) return true;

if (Date.now() - health.timestamp > HEALTH_RESET_TIME) {
nodeHealthMap.delete(url);
return true;
}

return false === health.isDown;
};

// Get all currently healthy nodes
export const getHealthyNodes = () => {
return PEER_NODES.filter(isNodeHealthy);
};

// Random load distribution
export const getRandomBackendUrl = () => {
const healthyNodes = getHealthyNodes();

if (healthyNodes.length === 0) {
nodeHealthMap.clear();
return PEER_NODES[0];
}

const randomIndex = Math.floor(
Math.random() * healthyNodes.length
);

return healthyNodes[randomIndex];
};

// Active backend for current session
export const getActiveBackendUrl = () => {
let active = sessionStorage.getItem("activeBackendUrl");

if (!active || !isNodeHealthy(active)) {
active = getRandomBackendUrl();
sessionStorage.setItem(
"activeBackendUrl",
active
);
}

return active;
};

// Failover to another healthy node
export const rotateBackendNode = (currentUrl) => {
markNodeDown(currentUrl);

const healthyNodes = getHealthyNodes().filter(
(node) => node !== currentUrl
);

if (healthyNodes.length === 0) {
nodeHealthMap.clear();

```
const fallback = PEER_NODES[0];

sessionStorage.setItem(
  "activeBackendUrl",
  fallback
);

return fallback;
```

}

const nextNode =
healthyNodes[
Math.floor(Math.random() * healthyNodes.length)
];

sessionStorage.setItem(
"activeBackendUrl",
nextNode
);

window.dispatchEvent(
new Event("backendRotated")
);

console.warn(
`Switched backend from ${currentUrl} to ${nextNode}`
);

return nextNode;
};
