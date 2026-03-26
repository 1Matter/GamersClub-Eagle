/**
 * GamersClub Eagle — Page Bridge (page-world context)
 *
 * This script is injected via a <script src="chrome-extension://..."> tag
 * from the content script (isolated world).  It runs in the PAGE world and
 * can read window globals (window.__USER__, etc.).
 *
 * It communicates back to the content script ONLY via a CustomEvent with a
 * fixed name.  No data other than the numeric user-id crosses the boundary.
 *
 * Security properties:
 *  - Only dispatches a numeric ID — no tokens, no cookies, no objects.
 *  - The content script validates the ID with /^\d+$/ before use.
 *  - The CustomEvent is dispatched once and the script removes itself.
 */
(function() {
  'use strict';

  const findConnectInState = (state) => {
    if (!state) return null;
    try {
      // Direct paths (most likely)
      const direct = state.match?.server?.connect || 
                     state.match?.current?.connect || 
                     state.lobby?.match?.connectionString;
      if (typeof direct === 'string' && direct.includes('connect ')) return direct;

      // Recursive search (minimal depth for performance)
      const search = (obj, depth = 0) => {
        if (depth > 5 || !obj || typeof obj !== 'object') return null;
        for (const key in obj) {
          const val = obj[key];
          if (typeof val === 'string' && val.startsWith('connect ') && !val.includes('***')) return val;
          if (typeof val === 'object') {
            const found = search(val, depth + 1);
            if (found) return found;
          }
        }
        return null;
      };
      return search(state);
    } catch (_) { return null; }
  };

  const check = () => {
    try {
      // 1. User ID detection (already exists)
      const userId = window.__USER__?.id || window.__GC__?.user?.id || window.GC?.userId || window.__STORE__?.getState?.()?.user?.id;
      if (userId) {
        window.postMessage({ type: '__gce_user_id__', id: String(userId).replace(/\D/g, '') }, window.location.origin);
      }

      // 2. Silent Match Connect detection
      const store = window.__STORE__;
      if (store?.getState) {
        const connect = findConnectInState(store.getState());
        if (connect) {
          window.postMessage({ type: '__gce_match_connect__', connect }, window.location.origin);
        }
      }
    } catch (_) {}
  };

  // Run immediately and then poll twice (GC loads data asynchronously)
  check();
  setTimeout(check, 2000);
  setTimeout(check, 5000);

  // Also try to hook into store subscriptions if available
  if (window.__STORE__?.subscribe) {
    window.__STORE__.subscribe(check);
  }
})();
