/**
 * GamersClub Eagle — Popup Script (v1.0.0)
 *
 * Security changes vs v1:
 *  - V-07 FIX: deletePlayer and updatePlayerTag no longer call
 *    chrome.storage.local.set() directly.  They use DELETE_PLAYER and
 *    SAVE_PLAYER_TAG messages to the background, which centralises all
 *    storage validation.
 *  - clearHistory uses the new CLEAR_HISTORY background action.
 *  - No other functional changes.
 */

const TAG_COLORS = {
  '🌟':     '#22c55e', '🤬':    '#ef4444', '✌️': '#60a5fa',
  '🎭':    '#a855f7', '🤖':  '#f97316', '🤡':    '#fbbf24',
};

let settings      = {};
let playerHistory = {};

// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const versionEl = document.getElementById('ext-version');
  if (versionEl) versionEl.textContent = 'v' + chrome.runtime.getManifest().version;

  await loadAll();
  bindTabs();
  bindControls();
  renderHistory();
  checkActiveTab();
});

// ── Data Loaders ──────────────────────────────────────────────────────────

async function loadAll() {
  try {
    const [settingsRes, historyRes] = await Promise.all([
      sendMessage({ action: 'GET_SETTINGS' }),
      sendMessage({ action: 'GET_PLAYER_HISTORY' }),
    ]);
    settings      = settingsRes?.settings     || getDefaultSettings();
    playerHistory = historyRes?.playerHistory || {};
  } catch (e) {
    console.warn('[GCE Popup] Load failed:', e);
    settings      = getDefaultSettings();
    playerHistory = {};
  }
  applySettingsToUI();
}

function getDefaultSettings() {
  return {
    enabled:           true,
    highlightEnabled:  true,
    discordWebhookUrl: '',
    discordEnabled:    false,
    autoAccept:        false,
    autoAcceptMode:    'instant',
    progressTracker:   true,
    tagSystem:         true,
  };
}

// ── Apply Settings to UI ──────────────────────────────────────────────────

function applySettingsToUI() {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!val;
    else el.value = val ?? '';
  };

  set('master-enabled',    settings.enabled);
  set('highlight-enabled', settings.highlightEnabled);
  set('auto-accept',       settings.autoAccept);
  set('progress-tracker',  settings.progressTracker);
  set('tag-system',        settings.tagSystem);

  const modeEl = document.querySelector(
    `input[name="accept-mode"][value="${settings.autoAcceptMode || 'instant'}"]`
  );
  if (modeEl) modeEl.checked = true;
  toggleAutoAcceptMode(settings.autoAccept);

  set('discord-enabled', settings.discordEnabled);
  set('webhook-url',     settings.discordWebhookUrl || '');
  toggleDiscordConfig(settings.discordEnabled);
  updateStatusBar();
}

// ── Status Bar ────────────────────────────────────────────────────────────

async function checkActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isGC  = tab?.url?.includes('gamersclub');
    const dot   = document.getElementById('status-dot');
    const text  = document.getElementById('status-text');
    if (!dot || !text) return;

    if (!settings.enabled) {
      dot.className    = 'status-bar__dot';
      text.textContent = 'Extensão desativada';
    } else if (isGC) {
      dot.className    = 'status-bar__dot status-bar__dot--active';
      text.textContent = 'Ativo na Gamers Club';
    } else {
      dot.className    = 'status-bar__dot status-bar__dot--idle';
      text.textContent = 'Página não suportada';
    }
  } catch (_) {}
}

function updateStatusBar() { checkActiveTab(); }

// ── Tab Switching ─────────────────────────────────────────────────────────

function bindTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  const panels  = document.querySelectorAll('.tab-panel');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      buttons.forEach(b => b.classList.remove('tab-btn--active'));
      panels.forEach(p  => p.classList.remove('tab-panel--active'));
      btn.classList.add('tab-btn--active');
      document.getElementById(`tab-${target}`)?.classList.add('tab-panel--active');
      if (target === 'history') renderHistory();
    });
  });
}

// ── Control Bindings ──────────────────────────────────────────────────────

function bindControls() {
  bindToggle('master-enabled',    v => { settings.enabled          = v; save(); updateStatusBar(); });
  bindToggle('highlight-enabled', v => { settings.highlightEnabled = v; save(); });
  bindToggle('auto-accept', v => {
    settings.autoAccept = v;
    toggleAutoAcceptMode(v);
    save();
  });
  document.querySelectorAll('input[name="accept-mode"]').forEach(radio => {
    radio.addEventListener('change', () => { settings.autoAcceptMode = radio.value; save(); });
  });
  bindToggle('progress-tracker', v => { settings.progressTracker = v; save(); });
  bindToggle('tag-system',       v => { settings.tagSystem       = v; save(); });
  bindToggle('discord-enabled',  v => { settings.discordEnabled  = v; toggleDiscordConfig(v); save(); });

  const webhookInput = document.getElementById('webhook-url');
  webhookInput?.addEventListener('blur', () => {
    settings.discordWebhookUrl = webhookInput.value.trim();
    save();
  });

  document.getElementById('test-webhook-btn')?.addEventListener('click', testWebhook);
  document.getElementById('clear-history-btn')?.addEventListener('click', clearHistory);
}

function bindToggle(id, onChange) {
  const el = document.getElementById(id);
  el?.addEventListener('change', () => onChange(el.checked));
}

// ── Discord Config Visibility ─────────────────────────────────────────────

function toggleAutoAcceptMode(visible) {
  const el = document.getElementById('auto-accept-mode');
  if (el) el.style.display = visible ? 'block' : 'none';
}

function toggleDiscordConfig(visible) {
  const el = document.getElementById('discord-config');
  if (el) el.style.display = visible ? 'flex' : 'none';
}

// ── Discord Webhook Test ──────────────────────────────────────────────────

async function testWebhook() {
  const btn = document.getElementById('test-webhook-btn');
  const url = document.getElementById('webhook-url')?.value.trim();

  if (!url) { flashButton(btn, 'Sem URL!', 'error'); return; }

  flashButton(btn, 'Enviando…', 'loading');

  const embed = {
    title:       '✅ GamersClub Eagle — Teste de Webhook',
    description: 'Sua integração com o Discord está funcionando corretamente!',
    color:       0x22c55e,
  };

  try {
    const res = await sendMessage({
      action:  'SEND_DISCORD_WEBHOOK',
      payload: { webhookUrl: url, embed },
    });
    flashButton(btn, res?.ok ? '✓ Sucesso!' : '✗ Falhou', res?.ok ? 'success' : 'error');
  } catch (_) {
    flashButton(btn, '✗ Erro', 'error');
  }
}

let flashTimer = null;
function flashButton(btn, text, state) {
  if (!btn) return;
  clearTimeout(flashTimer);
  if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
  btn.textContent = text;
  btn.classList.remove('btn--loading', 'btn--success', 'btn--error');
  if      (state === 'success') btn.style.background = '#22c55e';
  else if (state === 'error')   btn.style.background = '#ef4444';
  else if (state === 'loading') { btn.style.background = '#6c63ff'; return; }
  flashTimer = setTimeout(() => {
    btn.textContent = btn.dataset.originalText;
    btn.style.background = '';
    btn.dataset.originalText = '';
  }, 2500);
}

// ── Player History ────────────────────────────────────────────────────────

function renderHistory() {
  const list = document.getElementById('history-list');
  if (!list) return;

  const entries = Object.entries(playerHistory).filter(([, d]) => d.tag || d.rating);
  while (list.firstChild) list.removeChild(list.firstChild);

  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon  = document.createElement('span');  icon.className  = 'empty-icon'; icon.textContent  = '📋';
    const text  = document.createElement('span');  text.textContent  = 'Nenhum jogador marcado ainda.';
    const small = document.createElement('small'); small.textContent = 'Marque jogadores diretamente na lobby.';
    empty.append(icon, text, small);
    list.appendChild(empty);
    return;
  }

  entries.sort(([, a], [, b]) => (b.updatedAt || 0) - (a.updatedAt || 0));

  for (const [id, data] of entries) {
    const card = document.createElement('div');
    card.className = 'history-card';

    const displayName = GCE_Security.sanitize(data.name || id);
    const tagColor    = TAG_COLORS[data.tag] || '#555';
    const profileUrl  = `https://gamersclub.com.br/jogador/${id}`;

    const info = document.createElement('div');
    info.className = 'history-player-info';
    info.title     = 'Clique para abrir o perfil';

    const nameSpan = document.createElement('span');
    nameSpan.className   = 'history-player-name';
    nameSpan.textContent = displayName;

    const idSpan = document.createElement('span');
    idSpan.className   = 'history-player-id';
    idSpan.textContent = GCE_Security.sanitize(id);

    info.append(nameSpan, idSpan);
    info.addEventListener('click', () => chrome.tabs.create({ url: profileUrl, active: false }));
    info.addEventListener('auxclick', e => {
      if (e.button === 1) chrome.tabs.create({ url: profileUrl, active: false });
    });

    const meta = document.createElement('div');
    meta.className = 'history-meta';

    if (data.tag) {
      const tagBtn = document.createElement('span');
      tagBtn.className       = 'history-tag';
      tagBtn.style.background = tagColor;
      tagBtn.title           = 'Trocar tag';
      tagBtn.textContent     = GCE_Security.sanitize(data.tag);
      tagBtn.addEventListener('click', e => {
        e.stopPropagation();
        openPopupTagEditor(id, tagBtn);
      });
      meta.appendChild(tagBtn);
    }

    const delBtn = document.createElement('button');
    delBtn.className   = 'history-delete-btn';
    delBtn.title       = 'Remover dos favoritos';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', e => { e.stopPropagation(); deletePlayer(id); });
    meta.appendChild(delBtn);

    card.append(info, meta);
    list.appendChild(card);
  }
}

/**
 * V-07 FIX: Uses DELETE_PLAYER background action instead of direct storage write.
 */
async function deletePlayer(id) {
  if (!confirm(`Deseja remover ${playerHistory[id]?.name || id} do histórico?`)) return;
  try {
    const res = await sendMessage({ action: 'DELETE_PLAYER', playerId: id });
    if (res?.ok) {
      const history = { ...playerHistory };
      delete history[id];
      playerHistory = history;
      renderHistory();
    }
  } catch (e) {
    console.error('[GCE Popup] Delete error:', e);
  }
}

function openPopupTagEditor(playerId, anchorEl) {
  document.querySelectorAll('.gce-popup-tag-overlay').forEach(el => el.remove());

  const overlay = document.createElement('div');
  overlay.className = 'gce-popup-tag-overlay';

  const grid = document.createElement('div');
  grid.className = 'gce-popup-tag-grid';

  Object.keys(TAG_COLORS).forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'gce-popup-tag-opt';
    btn.textContent       = tag;
    btn.style.borderColor = TAG_COLORS[tag];
    btn.style.color       = TAG_COLORS[tag];
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      await updatePlayerTag(playerId, tag);
      overlay.remove();
    });
    grid.appendChild(btn);
  });

  overlay.appendChild(grid);
  document.body.appendChild(overlay);

  const rect         = anchorEl.getBoundingClientRect();
  const overlayWidth = 180;
  let left = rect.left - (overlayWidth / 2);
  if (left < 10)                       left = 10;
  if (left + overlayWidth > 350)       left = 360 - overlayWidth - 10;
  overlay.style.top  = `${rect.bottom + 5}px`;
  overlay.style.left = `${left}px`;

  setTimeout(() => {
    document.addEventListener('click', () => overlay.remove(), { once: true });
  }, 0);
}

/**
 * V-07 FIX: Uses SAVE_PLAYER_TAG background action.
 */
async function updatePlayerTag(playerId, newTag) {
  const history = { ...playerHistory };
  if (!history[playerId]) return;

  const name = history[playerId].name || playerId;

  try {
    const res = await sendMessage({
      action:   'SAVE_PLAYER_TAG',
      playerId: playerId,
      data:     { tag: newTag, name },
    });
    if (res?.ok) {
      history[playerId].tag       = newTag;
      history[playerId].updatedAt = Date.now();
      playerHistory = history;
      renderHistory();
    }
  } catch (e) {
    console.error('[GCE Popup] Update tag error:', e);
  }
}

/**
 * V-07 FIX: Uses CLEAR_HISTORY background action.
 */
async function clearHistory() {
  if (!confirm('Limpar todo o histórico de jogadores? Esta ação não pode ser desfeita.')) return;
  try {
    const res = await sendMessage({ action: 'CLEAR_HISTORY' });
    if (res?.ok) {
      playerHistory = {};
      renderHistory();
    }
  } catch (e) {
    console.error('[GCE Popup] Clear history error:', e);
  }
}

// ── Save Settings ─────────────────────────────────────────────────────────

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await sendMessage({ action: 'SAVE_SETTINGS', settings });
    } catch (e) {
      console.warn('[GCE Popup] Save error:', e);
    }
  }, 300);
}

// ── Utility ───────────────────────────────────────────────────────────────

function sendMessage(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, response => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      resolve(response);
    });
  });
}
