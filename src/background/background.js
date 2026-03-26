/**
 * GamersClub Eagle — Background Service Worker (V3 Architecture)
 * Centralized settings, security, and messaging.
 */

importScripts('../utils/security.js');

const { GCE_Security: Security } = self;

// ── Constants ─────────────────────────────────────────────────────────────

const ALLOWED_ACTIONS = {
  GET_SETTINGS:         'GET_SETTINGS',
  SAVE_SETTINGS:        'SAVE_SETTINGS',
  GET_PLAYER_HISTORY:   'GET_PLAYER_HISTORY',
  SAVE_PLAYER_TAG:      'SAVE_PLAYER_TAG',
  DELETE_PLAYER:        'DELETE_PLAYER',
  CLEAR_HISTORY:        'CLEAR_HISTORY',
  SEND_DISCORD_WEBHOOK: 'SEND_DISCORD_WEBHOOK',
};

const SecurityManager = {
  isMessageValid(sender) {
    if (!sender?.id || sender.id !== chrome.runtime.id) return false;
    if (sender.tab && sender.url) {
      return Security.ALLOWED_ORIGINS.some(o => sender.url.startsWith(o));
    }
    return true;
  },
};

// ── Installation & Migration ──────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    chrome.storage.local.set({
      settings: {
        enabled:           true,
        highlightEnabled:  true,
        discordWebhookUrl: '',
        discordEnabled:    false,
        progressTracker:   true,
        autoAccept:        false,
        autoAcceptMode:    'instant',
        tagSystem:         true,
      },
      playerHistory: {},
    });
  } else if (reason === 'update') {
    chrome.storage.local.get('settings', async ({ settings: s }) => {
      if (!s) return;
      let changed = false;
      if (s.progressTracker === undefined) { s.progressTracker = true; changed = true; }
      if (s.discordWebhookUrl && (await Security.decrypt(s.discordWebhookUrl)) === null) {
        let plain = null;
        try { plain = Security.deobfuscate(s.discordWebhookUrl); } catch (_) {}
        if (!plain) plain = s.discordWebhookUrl;
        if (Security.validateWebhook(plain)) {
          s.discordWebhookUrl = await Security.encrypt(plain);
          changed = true;
        }
      }
      if (changed) chrome.storage.local.set({ settings: s });
    });
  }
});

// ── Command Handlers ──────────────────────────────────────────────────────

const CommandHandlers = {
  [ALLOWED_ACTIONS.GET_SETTINGS]: (message, sendResponse) => {
    chrome.storage.local.get('settings', async ({ settings: s }) => {
      const settings = s ? { ...s } : {};
      if (settings.discordWebhookUrl) {
        settings.discordWebhookUrl = await Security.decrypt(settings.discordWebhookUrl) || '';
      }
      sendResponse({ ok: true, settings });
    });
  },

  [ALLOWED_ACTIONS.SAVE_SETTINGS]: async (message, sendResponse) => {
    const toSave = { ...message.settings };
    if (toSave.discordWebhookUrl && Security.validateWebhook(toSave.discordWebhookUrl)) {
      toSave.discordWebhookUrl = await Security.encrypt(toSave.discordWebhookUrl);
    } else {
      toSave.discordWebhookUrl = '';
    }
    chrome.storage.local.set({ settings: toSave }, () => {
      sendResponse({ ok: true });
      const { discordWebhookUrl: _omit, ...safeSettings } = message.settings;
      broadcastToTabs({ action: 'SETTINGS_UPDATED', settings: safeSettings });
    });
  },

  [ALLOWED_ACTIONS.GET_PLAYER_HISTORY]: (message, sendResponse) => {
    chrome.storage.local.get('playerHistory', ({ playerHistory }) => {
      sendResponse({ ok: true, playerHistory: playerHistory || {} });
    });
  },

  [ALLOWED_ACTIONS.SAVE_PLAYER_TAG]: (message, sendResponse) => {
    chrome.storage.local.get('playerHistory', ({ playerHistory }) => {
      const history = playerHistory || {};
      const pid = String(message.playerId || '');
      if (!/^\d+$/.test(pid)) return sendResponse({ ok: false, error: 'Invalid ID' });

      const tag  = message.data?.tag;
      const name = Security.sanitize(message.data?.name || '');
      const VALID_TAGS = ['🌟','🤬','✌️','🎭','🤖','🤡'];

      if (!tag) {
        if (history[pid]) {
          delete history[pid].tag;
          if (!history[pid].rating) delete history[pid];
        }
      } else {
        if (!VALID_TAGS.includes(tag)) return sendResponse({ ok: false, error: 'Invalid tag' });
        history[pid] = {
          ...(history[pid] || {}),
          tag,
          name: name || history[pid]?.name || pid,
          updatedAt: Date.now(),
        };
      }
      chrome.storage.local.set({ playerHistory: history }, () => sendResponse({ ok: true }));
    });
  },

  [ALLOWED_ACTIONS.DELETE_PLAYER]: (message, sendResponse) => {
    chrome.storage.local.get('playerHistory', ({ playerHistory }) => {
      const history = { ...(playerHistory || {}) };
      const pid = String(message.playerId || '');
      if (!/^\d+$/.test(pid)) return sendResponse({ ok: false, error: 'Invalid ID' });
      delete history[pid];
      chrome.storage.local.set({ playerHistory: history }, () => sendResponse({ ok: true }));
    });
  },

  [ALLOWED_ACTIONS.CLEAR_HISTORY]: (message, sendResponse) => {
    chrome.storage.local.set({ playerHistory: {} }, () => sendResponse({ ok: true }));
  },

  [ALLOWED_ACTIONS.SEND_DISCORD_WEBHOOK]: (message, sendResponse) => {
    handleDiscordWebhook(message.payload, sendResponse);
  },
};

// ── Message Router ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!SecurityManager.isMessageValid(sender)) {
    sendResponse({ ok: false, error: 'Access denied' });
    return false;
  }

  const handler = CommandHandlers[message.action];
  if (handler) {
    handler(message, sendResponse);
    return true; 
  }
  return false;
});

// ── Discord Webhook Handler ───────────────────────────────────────────────

function handleDiscordWebhook(payload, sendResponse) {
  const { embed, content, webhookUrl } = payload || {};

  if (!webhookUrl) {
    chrome.storage.local.get('settings', async ({ settings: s }) => {
      if (!s?.discordWebhookUrl) return sendResponse({ ok: false, error: 'No webhook configured' });
      const plain = await Security.decrypt(s.discordWebhookUrl);
      if (!plain || !Security.validateWebhook(plain)) return sendResponse({ ok: false, error: 'Invalid stored webhook' });
      _dispatchWebhook(plain, embed, content, sendResponse);
    });
    return;
  }

  if (!Security.validateWebhook(webhookUrl)) return sendResponse({ ok: false, error: 'Invalid webhook' });
  _dispatchWebhook(webhookUrl, embed, content, sendResponse);
}

function _dispatchWebhook(url, embed, content, sendResponse) {
  const body = {
    embeds: [{
      title:       Security.sanitize(embed?.title || ''),
      description: Security.sanitize(embed?.description || ''),
      color:       (typeof embed?.color === 'number') ? embed.color : 0,
      fields: (Array.isArray(embed?.fields) ? embed.fields : []).map(f => ({
        name:   Security.sanitize(f.name || ''),
        value:  Security.sanitize(f.value || ''),
        inline: !!f.inline,
      })),
      footer:    { text: Security.sanitize(embed?.footer?.text || '') },
      timestamp: new Date().toISOString(),
    }],
  };
  if (content) body.content = Security.sanitize(content);

  fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
    .then(r => sendResponse({ ok: r.ok, status: r.status }))
    .catch(() => sendResponse({ ok: false, error: 'Network error' }));
}

// ── Utilities ─────────────────────────────────────────────────────────────

async function broadcastToTabs(message) {
  try {
    const tabs = await chrome.tabs.query({ url: Security.ALLOWED_ORIGINS.map(o => o + '/*') });
    for (const tab of tabs) chrome.tabs.sendMessage(tab.id, message).catch(() => {});
  } catch (e) {
    console.error('[GCE] Broadcast error:', e);
  }
}
