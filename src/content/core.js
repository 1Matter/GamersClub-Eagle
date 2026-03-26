/**
 * GamersClub Eagle — Core (V3 Architecture)
 * Centralized state, initialization, and Event Bus.
 */

window.GCE = {
  initialized: false,
  settings: {
    enabled: true,
    highlightEnabled: true,
    discordWebhookUrl: '',
    discordEnabled: false,
    progressTracker: true,
    autoAccept: false,
    autoAcceptMode: 'instant',
    tagSystem: true,
  },
  playerHistory: {},
  
  // Event Bus
  events: {
    _listeners: {},
    on(event, callback) {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(callback);
    },
    emit(event, data) {
      if (this._listeners[event]) {
        this._listeners[event].forEach(cb => cb(data));
      }
    }
  },

  /**
   * Universal initialization. Fetches storage and boots modules.
   */
  init: async function() {
    if (this.initialized) return;
    this.initialized = true;

    return new Promise((resolve) => {
      chrome.storage.local.get(['settings', 'playerHistory'], (res) => {
        if (res.settings) this.settings = { ...this.settings, ...res.settings };
        if (res.playerHistory) this.playerHistory = res.playerHistory;

        // Initialize Services
        GCE.PlayerService.init();
        
        // Initialize Modules
        if (window.GCEMatchmaking) window.GCEMatchmaking.init();
        if (window.GCETags)        window.GCETags.init();
        if (window.GCEProgress)    window.GCEProgress.init();
        if (window.GCEMatchNotifier) window.GCEMatchNotifier.init();
        
        resolve();
      });
    });
  },

  /**
   * Global state update from external sources (popup/storage).
   */
  updateState: function(changes) {
    if (changes.settings) {
      this.settings = { ...this.settings, ...changes.settings };
      this.events.emit('settings_updated', this.settings);
    }
    if (changes.playerHistory) {
      this.playerHistory = changes.playerHistory;
      this.events.emit('history_updated', this.playerHistory);
    }
  }
};
