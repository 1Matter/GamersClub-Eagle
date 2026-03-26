/**
 * GamersClub Eagle — Main Bootloader (V3)
 * Orchestrates module lifecycle and MutationObserver.
 */

(function() {
  let _observer = null;
  let _lastUrl  = location.href;

  /**
   * Main execution loop.
   */
  async function boot() {
    await window.GCE.init();
    
    // Initial run
    runModules();

    // High-performance MutationObserver
    if (_observer) _observer.disconnect();
    _observer = new MutationObserver(debounce(() => {
      if (!GCE.settings.enabled) return;
      runModules();
    }, 150));

    _observer.observe(document.body, { childList: true, subtree: true });

    // URL Change detection
    setInterval(() => {
      if (location.href !== _lastUrl) {
        _lastUrl = location.href;
        runModules();
      }
    }, 500);
  }

  /**
   * Triggers all active modules.
   */
  function runModules() {
    // 1. Master Toggle
    if (!GCE.settings.enabled) {
      window.GCETags?.removeAllTagBadges();
      window.GCEMatchmaking?.removeAllBadges();
      window.GCEProgress?.removeBar();
      return;
    }

    // 2. Tags
    if (GCE.settings.tagSystem) window.GCETags?.init();
    else window.GCETags?.removeAllTagBadges();

    // 3. Matchmaking (KDR Badges)
    if (GCE.settings.highlightEnabled) window.GCEMatchmaking?.init();
    else window.GCEMatchmaking?.removeAllBadges();
    
    // 4. Progress Tracker
    if (GCE.settings.progressTracker) window.GCEProgress?.init();
    else window.GCEProgress?.removeBar();
    
    // 5. Automation
    if (GCE.settings.autoAccept) window.GCEAutoAccept?.check();
    if (GCE.settings.discordEnabled) window.GCEMatchNotifier?.check();
  }

  function debounce(fn, ms) {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  }

  // Listen for settings updates from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'SETTINGS_UPDATED') {
      GCE.updateState({ settings: msg.settings });
      runModules();
    }
  });

  // Start the engine
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
