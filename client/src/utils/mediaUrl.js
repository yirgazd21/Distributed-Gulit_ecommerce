import { PEER_NODES, getActiveBackendUrl } from './networkConfig';

const normalizePath = (path) => {
  if (!path) return '';
  if (String(path).startsWith('http')) return String(path);
  return `/${String(path).replace(/^\/+/, '')}`;
};

export const buildMediaUrl = (path, baseUrl = getActiveBackendUrl()) => {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath || normalizedPath.startsWith('http')) return normalizedPath;
  return `${String(baseUrl || '').replace(/\/$/, '')}${normalizedPath}`;
};

export const handleMediaError = (path, placeholder = '/placeholder.jpg') => (event) => {
  const normalizedPath = normalizePath(path);
  const target = event.currentTarget;

  if (!normalizedPath || normalizedPath.startsWith('http')) {
    target.src = placeholder;
    return;
  }

  const currentSrc = target.src;
  const candidates = [
    getActiveBackendUrl(),
    ...PEER_NODES,
  ]
    .filter(Boolean)
    .map((baseUrl) => buildMediaUrl(normalizedPath, baseUrl));

  const nextSrc = candidates.find((candidate) => candidate && candidate !== currentSrc);
  target.src = nextSrc || placeholder;
};
