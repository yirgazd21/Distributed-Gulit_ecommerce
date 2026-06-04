import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getActiveBackendUrl, rotateBackendNode, PEER_NODES } from '../../utils/networkConfig'; 

// ─── ONE-TIME MIGRATION ───────────────────────────────────────────────────────
// Old versions stored the active backend URL in localStorage which caused
// stale peer URLs to persist across sessions. Remove it so the new
// sessionStorage-based logic takes over cleanly.
if (localStorage.getItem('activeBackendUrl')) {
  localStorage.removeItem('activeBackendUrl');
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── SMART DYNAMIC BASE_URL EXPORT ───
// This acts exactly like a standard string so your existing code doesn't break,
// but it executes a functional lookup every time a component reads it!
export const BASE_URL = {
  toString: () => getActiveBackendUrl(),
  valueOf: () => getActiveBackendUrl()
};
// ─────────────────────────────────────

// ─── CUSTOM DYNAMIC CLUSTER BASE QUERY WRAPPER ───
const dynamicClusterBaseQuery = async (args, api, extraOptions) => {
  let activeUrl = getActiveBackendUrl();
  let adjustedArgs = typeof args === 'string' ? args : { ...args };

  const cleanArgsForNode = (urlArgs, nodeUrl) => {
    let resultArgs = typeof urlArgs === 'string' ? urlArgs : { ...urlArgs };
    if (typeof resultArgs === 'string') {
      PEER_NODES.forEach((node) => {
        if (resultArgs.startsWith(node) && node !== nodeUrl) {
          resultArgs = resultArgs.replace(node, '');
        }
      });
    } else if (resultArgs.url) {
      PEER_NODES.forEach((node) => {
        if (resultArgs.url.startsWith(node) && node !== nodeUrl) {
          resultArgs.url = resultArgs.url.replace(node, '');
        }
      });
    }
    return resultArgs;
  };

  // Keep trying nodes in the cluster until one works or we have tried all options
  const maxAttempts = PEER_NODES.length + 1; // local + peers
  let attempt = 0;
  let lastResult;

  while (attempt < maxAttempts) {
    const currentArgs = cleanArgsForNode(adjustedArgs, activeUrl);
    const rawBaseQuery = fetchBaseQuery({
      baseUrl: activeUrl,
      prepareHeaders: (headers, { getState, endpoint }) => {
        const userToken = getState().auth?.userInfo?.token;
        const sellerToken = getState().sellerAuth?.sellerInfo?.token;
        const adminToken = getState().adminAuth?.adminInfo?.token;

        let token = userToken;
        const endpointLower = endpoint?.toLowerCase() || '';
        const isSellerAction = endpointLower.includes('seller') || endpointLower.includes('upload');
        const isAdminAction = endpointLower.includes('admin');

        if (isAdminAction && adminToken) {
          token = adminToken;
        } else if (isSellerAction && sellerToken) {
          token = sellerToken;
        } else if (sellerToken && !userToken) {
          token = sellerToken;
        } else if (adminToken && !userToken && !sellerToken) {
          token = adminToken;
        }

        if (token) {
          headers.set('authorization', `Bearer ${token}`);
        }

        return headers;
      },
    });

    lastResult = await rawBaseQuery(currentArgs, api, extraOptions);

    if (!lastResult.error || (lastResult.error.status !== 'FETCH_ERROR' && lastResult.error.status !== 503)) {
      // Success or a normal API error (e.g. 400, 401, 404) -> return it immediately
      return lastResult;
    }

    // Node is down - rotate to next
    console.warn(`🚨 RTK Query Cluster Watchdog: Node [${activeUrl}] down. Rotating routes...`);
    const nextUrl = rotateBackendNode(activeUrl);
    if (nextUrl === activeUrl) {
      // No other fallback node available
      break;
    }
    activeUrl = nextUrl;
    attempt++;
  }

  return lastResult;
};

// ─── INITIALIZE CENTRALIZED API SLICE ───
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: dynamicClusterBaseQuery,
  tagTypes: [
    'Product', 'Category', 'Order', 'User', 'Favorites', 'BrowseHistory', 'Cart',
    'seller', 'SellerProduct', 'SellerOrder', 'AdminSeller', 'AdminUser', 
    'AdminOrder', 'AdminFinance', 'AdminSupport'
  ],
  endpoints: (builder) => ({}),
});