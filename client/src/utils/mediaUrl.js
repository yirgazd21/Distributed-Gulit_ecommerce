import { PEER_NODES, getActiveBackendUrl } from './networkConfig';

const normalizeUrl = (url) => String(url || '').replace(/\/$/, '');

const getKnownOrigins = () => new Set(PEER_NODES.map(normalizeUrl));

const isBackendLikeHost = (host = '') =>
  /(?:\.?onrender(?:\.com)?|\.?replit(?:\.app|\.dev)?|localhost|127\.0\.0\.1)/i.test(String(host || ''));

const stripKnownBackendOrigin = (value) => {
  const rawValue = String(value || '');
  if (!rawValue) return '';

  if (!/^https?:\/\//i.test(rawValue)) {
    return rawValue;
  }

  try {
    const parsed = new URL(rawValue);
    const origin = `${parsed.protocol}//${parsed.host}`;
    if (getKnownOrigins().has(origin) || isBackendLikeHost(parsed.hostname)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch (_) {
    return rawValue;
  }

  return rawValue;
};

const normalizePath = (path) => {
  if (!path) return '';
  const strippedPath = stripKnownBackendOrigin(path);
  if (String(strippedPath).startsWith('http')) return String(strippedPath);
  return `/${String(strippedPath).replace(/^\/+/, '')}`;
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
