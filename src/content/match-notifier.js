/**
 * GamersClub Eagle — Match Notifier Module (V3)
 * Automatic connection capture and Discord notifications.
 */

window.GCEMatchNotifier = {
  _lastMatchId: null,

  init: function() {
    window.addEventListener('message', (e) => {
      if (e.source !== window || !e.data || e.data.type !== '__gce_match_connect__') return;
      this.handleSilentPeek(e.data.matchId, e.data.connectString);
    });
  },

  check: function() {
    if (!GCE.settings.enabled || !GCE.settings.discordEnabled) return;

    // Check DOM as fallback
    const connectInput = document.querySelector('input[id*="match-connect"]');
    if (connectInput && connectInput.value && connectInput.value.includes('connect')) {
      const matchId = window.location.pathname.match(/\/lobby\/match\/(\d+)/)?.[1] || 'manual';
      this.handleSilentPeek(matchId, connectInput.value);
    }
  },

  handleSilentPeek: function(matchId, connectString) {
    if (matchId === this._lastMatchId) return;
    this._lastMatchId = matchId;

    const sanitized = GCE_Security.sanitize(connectString.trim());
    const embed = {
      title: '🎮 Partida Iniciada!',
      description: 'Um novo servidor de CS2 está pronto para conectar.',
      color: 0xef4444,
      fields: [{ name: '🔗 Comando de Conexão', value: '```' + sanitized + '```' }],
      footer: { text: 'GamersClub Eagle' },
    };

    chrome.runtime.sendMessage({
      action: 'SEND_DISCORD_WEBHOOK',
      payload: { embed }
    });
  }
};
