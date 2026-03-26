/**
 * GamersClub Eagle — Internal Security System (Hardened v2)
 *
 * CHANGES vs v1:
 *  - obfuscate/deobfuscate replaced by AES-GCM encryption (generateStorageKey + encrypt/decrypt)
 *  - Base64 encoding kept ONLY as a transport layer for the ciphertext bytes — not as "security"
 *  - All other public APIs (sanitize, validateWebhook, ALLOWED_ORIGINS) are unchanged
 */

const InternalSecurity = {

  // ── Constants ─────────────────────────────────────────────────────────────

  WEBHOOK_REGEX: /^https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w.-]+(?:\?.*)?$/,

  /**
   * Whitelist of allowed origins for content script → background messaging.
   * Covers all known gamersclub subdomains.
   */
  ALLOWED_ORIGINS: [
    'https://gamersclub.com.br',
    'https://www.gamersclub.com.br',
    'https://gamersclub.gg',
    'https://www.gamersclub.gg',
    'https://app.gamersclub.com.br',
    'https://play.gamersclub.com.br',
  ],

  // ── HTML Sanitisation ─────────────────────────────────────────────────────

  /**
   * Escapes HTML special characters.
   * Safe for textContent assignment; NOT for innerHTML.
   */
  sanitize: function(str) {
    if (typeof str !== 'string') return '';
    const map = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#x27;', '/': '&#x2F;',
    };
    return str.replace(/[&<>"'/]/ig, m => map[m]);
  },

  // ── Webhook Validation ────────────────────────────────────────────────────

  validateWebhook: function(url) {
    return typeof url === 'string' && this.WEBHOOK_REGEX.test(url);
  },

  // ── AES-GCM Encryption for sensitive storage values ───────────────────────
  //
  // The key is derived via PBKDF2 from a combination of:
  //   • chrome.runtime.id  (unique per extension install)
  //   • a fixed salt baked into the extension source
  //
  // This is NOT user-password-grade security; it protects against casual
  // inspection of chrome.storage via the Storage panel.  The webhook URL
  // is low-sensitivity data (anyone with the key can post to a channel),
  // so AES-GCM + PBKDF2 is a proportionate control.

  _cryptoKey: null,   // cached CryptoKey — derived once per SW lifecycle

  _SALT: new Uint8Array([
    0x47, 0x43, 0x45, 0x61, 0x67, 0x6c, 0x65, 0x53,
    0x61, 0x6c, 0x74, 0x32, 0x30, 0x32, 0x35, 0x21,
  ]),

  /**
   * Derives (or returns cached) AES-GCM CryptoKey.
   * Must be awaited before encrypt/decrypt.
   */
  _getKey: async function() {
    if (this._cryptoKey) return this._cryptoKey;

    const rawKeyMaterial = new TextEncoder().encode(
      (typeof chrome !== 'undefined' ? chrome.runtime.id : 'dev') + '_GCEagle'
    );

    const baseKey = await crypto.subtle.importKey(
      'raw', rawKeyMaterial, { name: 'PBKDF2' }, false, ['deriveKey']
    );

    this._cryptoKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: this._SALT, iterations: 100_000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return this._cryptoKey;
  },

  /**
   * Encrypts a string value with AES-GCM.
   * Returns a Base64 string of  [ 12-byte IV | ciphertext ].
   */
  encrypt: async function(plaintext) {
    if (!plaintext) return null;
    try {
      const key = await this._getKey();
      const iv  = crypto.getRandomValues(new Uint8Array(12));
      const enc = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(plaintext)
      );
      // Prepend IV so decrypt can retrieve it
      const combined = new Uint8Array(iv.byteLength + enc.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(enc), iv.byteLength);
      return btoa(String.fromCharCode(...combined));
    } catch (e) {
      console.error('[GCE Security] encrypt error:', e);
      return null;
    }
  },

  /**
   * Decrypts a value previously produced by encrypt().
   * Returns plaintext string or null on failure.
   */
  decrypt: async function(encoded) {
    if (!encoded) return null;
    try {
      const key     = await this._getKey();
      const bytes   = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      const iv      = bytes.slice(0, 12);
      const cipher  = bytes.slice(12);
      const plain   = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
      return new TextDecoder().decode(plain);
    } catch (e) {
      // Could be old Base64-only value from v1 — caller handles migration
      return null;
    }
  },

  // ── Legacy shims (v1 → v2 migration) ─────────────────────────────────────
  // background.js migration code calls these during onInstalled('update').

  /** @deprecated Use encrypt() */
  obfuscate: function(data) {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(data)))); }
    catch (e) { return null; }
  },

  /** @deprecated Use decrypt() */
  deobfuscate: function(encoded) {
    try { return JSON.parse(decodeURIComponent(escape(atob(encoded)))); }
    catch (e) { return null; }
  },

  // ── Token generation ──────────────────────────────────────────────────────

  generateToken: async function() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  },
};

// Export to the right global depending on context (SW vs content script)
const _global = typeof window !== 'undefined' ? window : self;
_global.GCE_Security = InternalSecurity;
