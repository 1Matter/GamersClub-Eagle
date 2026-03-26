/**
 * GamersClub Eagle — Progress Logic (V3)
 * XP tables and estimation math.
 */

window.GCE.ProgressLogic = {
  LEVEL_TABLE: {
     0: { floor:    0, next: 1001 }, 1: { floor: 1001, next: 1056 },
     2: { floor: 1056, next: 1116 }, 3: { floor: 1116, next: 1179 },
     4: { floor: 1179, next: 1246 }, 5: { floor: 1246, next: 1316 },
     6: { floor: 1316, next: 1390 }, 7: { floor: 1390, next: 1469 },
     8: { floor: 1469, next: 1552 }, 9: { floor: 1552, next: 1639 },
    10: { floor: 1639, next: 1732 }, 11: { floor: 1732, next: 1830 },
    12: { floor: 1830, next: 1933 }, 13: { floor: 1933, next: 2042 },
    14: { floor: 2042, next: 2158 }, 15: { floor: 2158, next: 2280 },
    16: { floor: 2280, next: 2408 }, 17: { floor: 2408, next: 2544 },
    18: { floor: 2544, next: 2688 }, 19: { floor: 2688, next: 2840 },
    20: { floor: 2840, next: 2999 }, 21: { floor: 2999, next: null },
  },

  estimate: function(xp, level) {
    const entry = this.LEVEL_TABLE[level];
    if (!entry) return { progress: 50, nextLevelXp: null, floorXp: 0 };
    
    const { floor, next } = entry;
    if (next === null) return { progress: 98, nextLevelXp: null, floorXp: floor };
    
    const span = next - floor;
    const rel  = xp - floor;
    const pct  = span > 0 ? (rel / span) * 100 : 50;
    
    return {
      progress: Math.min(Math.max(pct, 2), 98),
      nextLevelXp: next,
      floorXp: floor
    };
  },

  getLevelColor: function(level) {
    const colors = {
      0: '#5C2D84', 6: '#2D3A8A', 7: '#2A7BC2', 10: '#68A761', 11: '#3E9CB7',
      12: '#53A18B', 13: '#68A761', 14: '#7CAC35', 15: '#91B20A', 16: '#BDB700',
      17: '#F0BC00', 18: '#F89A06', 19: '#FF4A00', 20: '#EB2F2F', 21: '#FF00C0'
    };
    if (level <= 5) return colors[0];
    if (level <= 9) return colors[7];
    return colors[level] || colors[0];
  },

  timeAgo: function(dateStr) {
    if (!dateStr) return '';
    let date;
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      date = new Date(dateStr.replace(' ', 'T'));
    } else {
      const [d, t] = dateStr.split(' ');
      if (!d) return '';
      const [day, month, year] = d.split('/');
      date = new Date(`${year}-${month}-${day}T${t || '00:00'}:00`);
    }
    if (isNaN(date.getTime())) return '';
    
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60)   return 'AGORA';
    if (diff < 3600) return `HÁ ${Math.floor(diff / 60)} MIN`;
    if (diff < 86400) return `HÁ ${Math.floor(diff / 3600)}H`;
    
    const days = Math.floor(diff / 86400);
    if (days === 1) return 'ONTEM';
    if (days < 7)   return `HÁ ${days} DIAS`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase();
  }
};
