import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getActiveBackendUrl, rotateBackendNode, markNodeDown, markNodeUp, isNodeHealthy, PEER_NODES } from '../../utils/networkConfig'; 

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

// ─── REQUEST TIMEOUT CONFIG ───
const REQUEST_TIMEOUT = 8000; // 8 seconds timeout per request

// Helper to create a timeout promise
const withTimeout = (promise, timeoutMs) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
};

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
  const maxAttempts = PEER_NODES.length;
  let attempt = 0;
  let lastResult;

  while (attempt < maxAttempts) {
    // Skip unhealthy nodes
    if (!isNodeHealthy(activeUrl)) {
      console.warn(`⏭️  Skipping unhealthy node: [${activeUrl}]`);
      const nextUrl = rotateBackendNode(activeUrl);
      if (nextUrl === activeUrl) break; // No more nodes to try
      activeUrl = nextUrl;
      attempt++;
      continue;
    }

    const currentArgs = cleanArgsForNode(adjustedArgs, activeUrl);
    const rawBaseQuery = fetchBaseQuery({
      baseUrl: activeUrl,
      timeout: REQUEST_TIMEOUT, // Built-in timeout
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

    try {
      // Apply timeout wrapper
      lastResult = await withTimeout(
        rawBaseQuery(currentArgs, api, extraOptions),
        REQUEST_TIMEOUT
      );

      // Success or a normal API error (e.g. 400, 401, 404) -> return it immediately
      if (!lastResult.error) {
        markNodeUp(activeUrl);
        return lastResult;
      }

      // Check if this is a server error (5xx) or network error
      const status = lastResult.error.status;
      const isServerError = status === 503 || status === 502 || status === 500;
      const isNetworkError = status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR';

      if (isServerError || isNetworkError) {
        // Mark node as down and try next
        console.warn(`🚨 Node [${activeUrl}] failed with ${status}. Rotating...`);
        markNodeDown(activeUrl);
        
        const nextUrl = rotateBackendNode(activeUrl);
        if (nextUrl === activeUrl) {
          // No other fallback node available
          return lastResult;
        }
        activeUrl = nextUrl;
        attempt++;
      } else {
        // For non-server errors (4xx), return immediately
        markNodeUp(activeUrl);
        return lastResult;
      }
    } catch (error) {
      // Timeout or other error occurred
      console.warn(`🚨 Request to [${activeUrl}] timed out or failed: ${error.message}`);
      markNodeDown(activeUrl);
      
      const nextUrl = rotateBackendNode(activeUrl);
      if (nextUrl === activeUrl) {
        // No other fallback node available
        return {
          error: {
            status: 'FETCH_ERROR',
            data: { message: 'All backend nodes are unavailable' }
          }
        };
      }
      activeUrl = nextUrl;
      attempt++;
    }
  }

  return lastResult || {
    error: {
      status: 'FETCH_ERROR',
      data: { message: 'All backend nodes exhausted' }
    }
  };
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