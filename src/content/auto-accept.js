/**
 * GamersClub Eagle — Auto Accept Module (V3)
 */

window.GCEAutoAccept = {
  check: function() {
    if (!GCE.settings.autoAccept) return;
    
    const btn = document.querySelector('[data-test="btn:ready"]');
    if (!btn || btn.disabled) {
      if (GCE._acceptTimer) {
        clearTimeout(GCE._acceptTimer);
        GCE._acceptTimer = null;
      }
      return;
    }

    if (GCE._acceptTimer) return;

    const delay = GCE.settings.autoAcceptMode === 'delay' ? 20000 : (Math.random() * 150 + 150);
    GCE._acceptTimer = setTimeout(() => {
      GCE._acceptTimer = null;
      const readyBtn = document.querySelector('[data-test="btn:ready"]');
      if (readyBtn && !readyBtn.disabled) readyBtn.click();
    }, delay);
  }
};
