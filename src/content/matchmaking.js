/**
 * GamersClub Eagle — Matchmaking Module (V3)
 * Handles KDR badges and team averages.
 */

window.GCEMatchmaking = {
  init: function() {
    this.renderBadges();
  },

  renderBadges: function() {
    if (!GCE.settings.enabled) {
      this.removeAllBadges();
      return;
    }

    const playerLinks = GCE.DOMService.getPlayerElements();
    playerLinks.forEach(link => {
      const kdr = GCE.PlayerService.parseKDR(link.title);
      if (kdr === null) return;

      link.style.opacity = '';
      link.style.filter = '';

      let badge = link.querySelector('.gce-badge');
      if (badge) {
        if (GCE.settings.highlightEnabled) {
          badge.style.display = '';
          badge.textContent = kdr.toFixed(2);
          this.updateBadgeTier(badge, kdr);
        } else {
          badge.style.display = 'none';
        }
        if (link.firstChild !== badge) link.prepend(badge);
        return;
      }

      badge = this.createBadge(kdr);
      if (!GCE.settings.highlightEnabled) badge.style.display = 'none';
      link.prepend(badge);
    });

    this.renderTeamAverages();
  },

  renderTeamAverages: function() {
    document.querySelectorAll('.LobbyRoom__content').forEach(room => {
      const links = room.querySelectorAll('a.LobbyPlayerVertical[title]');
      let sum = 0, count = 0;

      links.forEach(link => {
        const k = GCE.PlayerService.parseKDR(link.title);
        if (k !== null) {
          sum += k;
          count++;
        }
      });

      if (count === 0) return;
      const avg = sum / count;

      let avgEl = room.querySelector('.gce-team-avg');
      if (avgEl) {
        avgEl.textContent = `KDR médio: ${avg.toFixed(2)}`;
        avgEl.dataset.kdr = avg.toFixed(2);
        this.updateTeamAvgTier(avgEl, avg);
        avgEl.style.display = GCE.settings.highlightEnabled ? '' : 'none';
        return;
      }

      avgEl = GCE.DOMService.create('div', {
        className: 'gce-team-avg',
        textContent: `KDR médio: ${avg.toFixed(2)}`,
        'data-kdr': avg.toFixed(2),
        style: { display: GCE.settings.highlightEnabled ? '' : 'none' }
      });
      this.updateTeamAvgTier(avgEl, avg);

      const title = room.querySelector('.LobbyRoom__title');
      if (title) title.insertAdjacentElement('afterend', avgEl);
      else room.prepend(avgEl);
    });
  },

  createBadge: function(kdr) {
    const el = GCE.DOMService.create('div', {
      className: 'gce-badge',
      textContent: kdr.toFixed(2)
    });
    this.updateBadgeTier(el, kdr);
    return el;
  },

  updateBadgeTier: function(el, kdr) {
    el.classList.remove('gce-bad', 'gce-ok', 'gce-good');
    if (kdr < 1.0) el.classList.add('gce-bad');
    else if (kdr < 1.2) el.classList.add('gce-ok');
    else el.classList.add('gce-good');
  },

  updateTeamAvgTier: function(el, avg) {
    el.classList.remove('gce-team-avg--bad', 'gce-team-avg--ok', 'gce-team-avg--good');
    if (avg < 1.0) el.classList.add('gce-team-avg--bad');
    else if (avg < 1.2) el.classList.add('gce-team-avg--ok');
    else el.classList.add('gce-team-avg--good');
  },

  removeAllBadges: function() {
    document.querySelectorAll('.gce-badge, .gce-team-avg').forEach(el => el.remove());
    document.querySelectorAll('a.LobbyPlayerVertical').forEach(el => {
      el.style.opacity = '';
      el.style.filter = '';
    });
  }
};
