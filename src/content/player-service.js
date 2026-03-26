/**
 * GamersClub Eagle — Player Service (V3 Architecture)
 * Centralized player identification and KDR parsing.
 */

window.GCE.PlayerService = {
  _bridgeCachedId: null,

  init: function() {
    this.injectPageBridge();
    
    // Listen for bridge messages
    window.addEventListener('message', (e) => {
      if (e.source !== window || !e.data || e.data.type !== '__gce_user_id__') return;
      const raw = e.data.id;
      const id  = raw ? String(raw).replace(/\D/g, '') : null;
      if (id) this._bridgeCachedId = id;
    });
  },

  /**
   * Unified KDR parser.
   */
  parseKDR: function(title) {
    if (!title) return null;
    const match = title.match(/KDR:\s*([\d.]+)/i);
    return match ? parseFloat(match[1]) : null;
  },

  /**
   * Multi-strategy player ID extraction.
   */
  extractCurrentPlayerId: function() {
    // 1. Data attributes
    const dataEl = document.querySelector('[data-player-id],[data-user-id],[data-id]');
    const dataId = dataEl?.dataset.playerId || dataEl?.dataset.userId || dataEl?.dataset.id;
    if (dataId && /^\d+$/.test(dataId)) return dataId;

    // 2. Bridge cache
    if (this._bridgeCachedId) return this._bridgeCachedId;

    // 3. URL/Links
    const urlMatch = location.pathname.match(/\/jogador\/(\d+)/);
    if (urlMatch) return urlMatch[1];

    const linkEl = document.querySelector('a[href*="/jogador/"]');
    const linkMatch = linkEl?.href.match(/\/jogador\/(\d+)/);
    return linkMatch ? linkMatch[1] : null;
  },

  /**
   * Extracts ID from a player element link.
   */
  getIdFromLink: function(href) {
    const m = href?.match(/\/(?:jogador|player)\/([^/?#]+)/);
    return m ? m[1] : null;
  },

  injectPageBridge: function() {
    if (document.getElementById('gce-v3-bridge')) return;
    const script = document.createElement('script');
    script.id = 'gce-v3-bridge';
    script.src = chrome.runtime.getURL('src/bridge/page-bridge.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }
};
