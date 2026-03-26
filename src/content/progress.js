/**
 * GamersClub Eagle — Progress Module (V3)
 * Data fetching and rendering via DOMService.
 */

window.GCEProgress = {
  _loading: false,
  _lastFetch: 0,

  init: function() {
    if (GCE.settings.progressTracker) this.scheduleLoad();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && GCE.settings.progressTracker) this.scheduleLoad();
    });
  },

  scheduleLoad: function() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.fetchAndRender(), { once: true });
    } else {
      this.fetchAndRender().catch(() => setTimeout(() => this.fetchAndRender(), 2000));
    }
  },

  fetchAndRender: async function() {
    if (!GCE.settings.progressTracker) return;
    const now = Date.now();
    if (document.hidden || this._loading) return;
    if (document.getElementById('gce-progress-bar') && (now - this._lastFetch < 20000)) return;

    this._loading = true;
    this._lastFetch = now;

    try {
      const playerId = GCE.PlayerService.extractCurrentPlayerId();
      if (!playerId) return;

      // API Box Init (Public creds)
      const headers = { 'Authorization': 'Basic ZnJvbnRlbmQ6NDdhMTZHMmtHTCFmNiRMRUQlJVpDI25X' };
      const boxRes = await fetch(`https://gamersclub.com.br/api/box/init/${playerId}?t=${now}`, { headers });
      if (!boxRes.ok) return;

      const box = await boxRes.json();
      const loggedId = box.loggedUser?.id ? String(box.loggedUser.id) : playerId;
      let finalBox = box;

      if (loggedId !== String(playerId)) {
        const loggedRes = await fetch(`https://gamersclub.com.br/api/box/init/${loggedId}?t=${now}`, { headers });
        if (loggedRes.ok) finalBox = await loggedRes.json();
      }

      const level = parseInt(finalBox.playerInfo?.level) || 0;
      const points = parseInt(finalBox.playerInfo?.rating) || 0;
      const nd = new Date();
      const ym = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`;

      let avatar = '', dayTotal = 0, dayDate = null;
      try {
        const histRes = await fetch(`https://gamersclub.com.br/players/get_playerLobbyResults/${ym}/1?t=${now}`);
        if (histRes.ok) {
          const hist = await histRes.json();
          avatar = this._validateAvatar(hist.currentUser?.avatar);
          const lista = hist.lista || [];
          if (lista.length > 0) {
            dayDate = lista[0].created_atp;
            const lastDay = dayDate.slice(0, 10);
            for (const m of lista) {
              if (m.created_atp.slice(0, 10) === lastDay) dayTotal += parseInt(m.diference) || 0;
              else break;
            }
          }
        }
      } catch (e) { console.warn('[GCE Progress] Fetch error:', e); }

      const lastMatch = finalBox.lastMatches?.[0] || null;
      const xpData = GCE.ProgressLogic.estimate(points, level);

      this.render({
        level, points, avatar, dayTotal, dayDate,
        ...xpData,
        latest: lastMatch ? { 
          points: parseInt(lastMatch.ratingDiff) || 0,
          link: `https://gamersclub.com.br/lobby/match/${lastMatch.id}`
        } : null
      });

    } finally { this._loading = false; }
  },

  _validateAvatar: (url) => {
    const ALLOWED = ['gamersclub.com.br/', 'cdn.gamersclub.com.br/', 'static.gamersclub.com.br/', 'gamersclub.gg/'];
    return (url && ALLOWED.some(a => url.includes(a))) ? url : '';
  },

  render: function(data) {
    this.removeBar();
    const curColor = GCE.ProgressLogic.getLevelColor(data.level);
    const nextLevel = data.nextLevelXp !== null ? data.level + 1 : data.level;
    const nextColor = GCE.ProgressLogic.getLevelColor(nextLevel);

    const bar = GCE.DOMService.create('div', { id: 'gce-progress-bar' }, [
      GCE.DOMService.create('div', { className: 'gce-pb-wrap' }, [
        // Level Badge
        GCE.DOMService.create('div', { 
          className: 'gce-pb-lvl-badge gce-pb-lvl-badge--current',
          style: `border-color:${curColor};background:${curColor};box-shadow:0 0 0 2px ${curColor}60, 0 0 16px ${curColor}90`
        }, [
          data.avatar ? GCE.DOMService.create('img', { className: 'gce-pb-avatar', src: data.avatar }) : null,
          GCE.DOMService.create('span', { className: 'gce-pb-lvl-num', textContent: data.level })
        ].filter(Boolean)),

        // Center Track
        GCE.DOMService.create('div', { className: 'gce-pb-center' }, [
          GCE.DOMService.create('div', { className: 'gce-pb-above-row' }, [
            data.latest ? (function() {
              const el = GCE.DOMService.create('a', {
                className: `gce-pb-bd-wrap ${data.latest.points >= 0 ? 'gce-pb-bd-wrap--pos' : 'gce-pb-bd-wrap--neg'}`,
                href: data.latest.link, target: '_blank',
                innerHTML: `<span class="gce-pb-bd-val">${(data.latest.points >= 0 ? '+' : '') + data.latest.points}</span>`
              });
              GCE.DOMService.addTooltip(el, 'Última partida');
              return el;
            })() : null,
            GCE.DOMService.create('span', { className: 'gce-pb-pts-current', textContent: data.points.toLocaleString('pt-BR') })
          ].filter(Boolean)),
          GCE.DOMService.create('div', { className: 'gce-pb-track' }, [
            GCE.DOMService.create('div', { className: 'gce-pb-fill', style: `width:${data.progress}%` }),
            GCE.DOMService.create('div', { className: 'gce-pb-thumb', style: `left:${data.progress}%` }),
            data.floorXp > 0 ? GCE.DOMService.create('div', { className: 'gce-pb-floor-mark', style: `left:${GCE.ProgressLogic.estimate(data.floorXp, data.level).progress}%` }) : null
          ].filter(Boolean)),
          GCE.DOMService.create('div', { className: 'gce-pb-below-row' }, [
            GCE.DOMService.create('span', { className: 'gce-pb-pts-floor', textContent: data.floorXp > 0 ? data.floorXp.toLocaleString('pt-BR') : '' }),
            GCE.DOMService.create('span', { className: 'gce-pb-mid' }, [
              data.points > data.floorXp ? GCE.DOMService.create('span', { className: 'gce-pb-bd-down', textContent: `-${data.points - data.floorXp}` }) : null,
              data.nextLevelXp ? GCE.DOMService.create('span', { className: 'gce-pb-bd-up', textContent: `+${data.nextLevelXp - data.points}` }) : null
            ].filter(Boolean)),
            GCE.DOMService.create('span', { className: 'gce-pb-pts-next', textContent: data.nextLevelXp ? data.nextLevelXp.toLocaleString('pt-BR') : '∞' })
          ])
        ]),

        // Next Badge
        GCE.DOMService.create('div', {
          className: 'gce-pb-lvl-badge gce-pb-lvl-badge--next',
          style: `border-color:${nextColor};background:${nextColor};box-shadow:0 0 0 2px ${nextColor}60, 0 0 16px ${nextColor}90`
        }, [
          GCE.DOMService.create('span', { className: 'gce-pb-lvl-num', textContent: data.nextLevelXp ? data.level + 1 : '∞' })
        ]),

        // Day Summary
        GCE.DOMService.create('div', { className: 'gce-pb-day-wrap' }, [
          data.dayDate ? GCE.DOMService.create('div', { className: 'gce-pb-time', textContent: GCE.ProgressLogic.timeAgo(data.dayDate) }) : null,
          data.dayTotal !== 0 ? (function() {
            const el = GCE.DOMService.create('a', {
              className: `gce-pb-bd-wrap ${data.dayTotal >= 0 ? 'gce-pb-bd-wrap--pos' : 'gce-pb-bd-wrap--neg'}`,
              href: 'https://gamersclub.com.br/my-matches', target: '_blank',
              innerHTML: `<span class="gce-pb-bd-val">${(data.dayTotal > 0 ? '+' : '') + data.dayTotal}</span>`
            });
            GCE.DOMService.addTooltip(el, 'Total do dia');
            return el;
          })() : null
        ].filter(Boolean))
      ])
    ]);
    document.body.appendChild(bar);
  },

  removeBar: () => document.getElementById('gce-progress-bar')?.remove()
};
