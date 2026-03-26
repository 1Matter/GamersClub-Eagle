/**
 * GamersClub Eagle — Tag System Module (V3)
 * Handles player marking and overlays.
 */

window.GCETags = {
  TAG_COLORS: {
    '🌟': '#22c55e', '🤬': '#ef4444', '✌️': '#60a5fa',
    '🎭': '#a855f7', '🤖': '#f97316', '🤡': '#fbbf24',
  },
  _overlay: null,

  init: function() {
    if (!GCE.settings.tagSystem) return;
    this.applyTagBadges();
  },

  applyTagBadges: function() {
    if (!GCE.settings.tagSystem) {
      this.removeAllTagBadges();
      return;
    }
    this.applyToProfilePage();

    const playerLinks = GCE.DOMService.getPlayerElements();
    playerLinks.forEach(link => {
      const playerId = GCE.PlayerService.getIdFromLink(link.href);
      if (!playerId) return;

      if (link.querySelector('.gce-tag-wrap')) return;

      if (window.getComputedStyle(link).position === 'static') {
        link.style.position = 'relative';
      }

      const wrap = GCE.DOMService.create('div', {
        className: 'gce-tag-wrap',
        'data-pid': playerId
      });
      link.appendChild(wrap);

      const nameEl = link.querySelector('[class*="name"], [class*="nick"], .LobbyPlayerVertical_nickname');
      const playerName = nameEl?.textContent?.trim() || link.title?.split('|')[0]?.trim() || playerId;
      
      const saved = GCE.playerHistory[playerId];

      // Auto-update name if missing
      if (saved && (!saved.name || saved.name === playerId) && playerName !== playerId) {
        this.saveTag(playerId, saved.tag, playerName);
      }

      this.updateBadgeInDOM(playerId, saved?.tag, playerName);
    });
  },

  applyToProfilePage: function() {
    const playerId = GCE.PlayerService.extractCurrentPlayerId();
    if (!playerId || !window.location.href.includes('/jogador/')) return;

    const existingWrap = document.getElementById('gce-profile-tag-wrap');
    if (existingWrap) {
      if (existingWrap.dataset.pid === playerId) return;
      existingWrap.remove();
    }

    const mainSidebar = document.querySelector('div[class*="gc-profile-sidebar-main"]');
    if (!mainSidebar) return;

    const wrap = GCE.DOMService.create('div', {
      id: 'gce-profile-tag-wrap',
      className: 'gce-tag-wrap gce-profile-tag-wrap',
      'data-pid': playerId,
      style: {
        position: 'relative', marginTop: '36px', marginBottom: '12px',
        marginLeft: 'auto', marginRight: 'auto', alignSelf: 'center'
      }
    });

    const nameEl = document.querySelector('[class*="username"],[class*="nickname"],[class*="PlayerName"]');
    const playerName = nameEl?.textContent?.trim() || document.title.split('|')[0].trim() || playerId;

    mainSidebar.appendChild(wrap);

    const saved = GCE.playerHistory[playerId];
    if (saved && (!saved.name || saved.name === playerId) && playerName !== playerId) {
      this.saveTag(playerId, saved.tag, playerName);
    }
    
    this.updateBadgeInDOM(playerId, saved?.tag, playerName);
  },

  saveTag: function(playerId, tag, name) {
    // Optimistic UI update
    const history = { ...GCE.playerHistory };
    if (!tag) {
      if (history[playerId]) {
        delete history[playerId].tag;
        if (!history[playerId].rating) delete history[playerId];
      }
    } else {
      history[playerId] = {
        ...(history[playerId] || {}),
        tag,
        name: name || history[playerId]?.name || playerId,
        updatedAt: Date.now(),
      };
    }
    GCE.playerHistory = history;
    this.updateBadgeInDOM(playerId, tag, name);

    // Persist to background
    chrome.runtime.sendMessage({
      action: 'SAVE_PLAYER_TAG',
      playerId,
      data: { tag: tag || null, name: name || '' }
    }, (res) => {
      if (!res?.ok) {
        console.warn('[GCE Tags] Save failed, reverting...');
        // In a real scenario, we'd fetch storage and re-render.
      }
    });
  },

  updateBadgeInDOM: function(playerId, tag, name) {
    const wraps = document.querySelectorAll(`.gce-tag-wrap[data-pid="${playerId}"]`);
    wraps.forEach(wrap => {
      wrap.innerHTML = '';
      const isProfile = wrap.classList.contains('gce-profile-tag-wrap');

      if (tag) {
        const badge = GCE.DOMService.create('span', {
          className: 'gce-tag-badge',
          textContent: tag,
          style: {
            background: this.TAG_COLORS[tag] || '#555',
            fontSize: isProfile ? '18px' : '',
            padding: isProfile ? '4px 12px' : '',
            borderRadius: isProfile ? '6px' : '',
            boxShadow: isProfile ? '0 4px 10px rgba(0,0,0,0.5)' : ''
          },
          onclick: (e) => {
            e.preventDefault(); e.stopPropagation();
            this.openOverlay(playerId, badge, name);
          }
        });
        wrap.appendChild(badge);
      } else {
        const config = isProfile ? {
          textContent: '+ ADICIONAR TAG',
          style: 'width:max-content;height:auto;padding:8px 24px;border-radius:6px;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;box-shadow:0 4px 10px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1)'
        } : {
          textContent: '+',
          title: 'Marcar jogador'
        };
        const btn = GCE.DOMService.create('button', {
          className: 'gce-tag-btn',
          ...config,
          onclick: (e) => {
            e.preventDefault(); e.stopPropagation();
            this.openOverlay(playerId, btn, name);
          }
        });
        wrap.appendChild(btn);
      }
    });
  },

  openOverlay: function(playerId, anchor, name) {
    this.closeOverlay();

    const grid = GCE.DOMService.create('div', { className: 'gce-tag-overlay-grid' });
    const current = GCE.playerHistory[playerId]?.tag;

    Object.keys(this.TAG_COLORS).forEach(tag => {
      const btn = GCE.DOMService.create('button', {
        className: `gce-tag-option ${current === tag ? 'gce-tag-option--active' : ''}`,
        textContent: tag,
        style: { borderColor: this.TAG_COLORS[tag], color: this.TAG_COLORS[tag] },
        onclick: (e) => {
          e.stopPropagation();
          this.saveTag(playerId, tag === current ? null : tag, name);
          this.closeOverlay();
        }
      });
      grid.appendChild(btn);
    });

    const overlay = GCE.DOMService.create('div', {
      id: 'gce-tag-overlay',
      className: 'gce-tag-overlay'
    }, [
      GCE.DOMService.create('div', { className: 'gce-tag-overlay-title', textContent: 'Marcar Jogador' }),
      grid
    ]);

    if (current) {
      overlay.appendChild(GCE.DOMService.create('button', {
        className: 'gce-tag-remove',
        textContent: '✕ Remover tag',
        onclick: (e) => {
          e.stopPropagation();
          this.saveTag(playerId, null, name);
          this.closeOverlay();
        }
      }));
    }

    document.body.appendChild(overlay);
    this._overlay = overlay;

    const rect = anchor.getBoundingClientRect();
    overlay.style.top = `${rect.bottom + window.scrollY + 4}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;

    setTimeout(() => {
      document.addEventListener('click', () => this.closeOverlay(), { once: true });
    }, 0);
  },

  closeOverlay: function() {
    this._overlay?.remove();
    this._overlay = null;
  },

  removeAllTagBadges: function() {
    document.querySelectorAll('.gce-tag-wrap').forEach(el => el.remove());
    this.closeOverlay();
  }
};
