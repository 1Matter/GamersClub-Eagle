/**
 * GamersClub Eagle — DOM Service (V3 Architecture)
 * Centralized UI utilities and DOM manipulation.
 */

window.GCE.DOMService = {
  
  /**
   * Helper to create elements with attributes and children.
   */
  create: function(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    
    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'className') el.className = val;
      else if (key === 'id') el.id = val;
      else if (key === 'style' && typeof val === 'string') el.style.cssText = val;
      else if (key === 'style' && typeof val === 'object') Object.assign(el.style, val);
      else if (key.startsWith('on')) el.addEventListener(key.toLowerCase().substring(2), val);
      else if (key.startsWith('data-')) el.setAttribute(key, val);
      else el[key] = val;
    }

    if (children) {
      const childArray = Array.isArray(children) ? children : [children];
      childArray.forEach(child => {
        if (typeof child === 'string' || typeof child === 'number') {
          el.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
          el.appendChild(child);
        }
      });
    }

    return el;
  },

  /**
   * Safely adds a tooltip to an element (singleton toolitp in body).
   */
  addTooltip: function(el, text) {
    el.addEventListener('mouseenter', () => {
      let tip = document.getElementById('gce-v3-tooltip');
      if (!tip) {
        tip = this.create('div', {
          id: 'gce-v3-tooltip',
          style: {
            position: 'fixed', zIndex: '9999999', background: '#1e2235', color: '#d1d5e8',
            fontSize: '11px', fontWeight: '600', fontFamily: 'Arial, sans-serif',
            padding: '4px 10px', borderRadius: '5px', border: '1px solid #3a3f5c',
            pointerEvents: 'none', display: 'none', transform: 'translate(-50%, -100%)',
            whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
          }
        });
        document.body.appendChild(tip);
      }
      tip.textContent = GCE_Security.sanitize(text);
      tip.style.display = 'block';
      const rect = el.getBoundingClientRect();
      tip.style.left = `${rect.left + rect.width / 2}px`;
      tip.style.top  = `${rect.top - 8}px`;
    });

    el.addEventListener('mouseleave', () => {
      const tip = document.getElementById('gce-v3-tooltip');
      if (tip) tip.style.display = 'none';
    });
  },

  /**
   * Finds all GamersClub player elements in the DOM.
   */
  getPlayerElements: function() {
    return document.querySelectorAll('a.LobbyPlayerVertical[title]');
  }
};
