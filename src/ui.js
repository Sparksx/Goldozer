import { t, setLanguage, getLanguage, getAvailableLanguages } from './i18n.js';
import { getUpgradeDefs, getUpgradeCost, getMaxCapacity, buyUpgrade, getPricePerUnit } from './economy.js';
import { hasSave, deleteSave } from './save.js';

let isMobile = false;
let onStartGame = null;
let onResumeGame = null;
let gameState = null;
let getGameState = null;
let controls = null;

export function initUI(options) {
  isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
  onStartGame = options.onStartGame;
  onResumeGame = options.onResumeGame;
  gameState = options.gameState;
  getGameState = options.getGameState || null;
  controls = options.controls;

  createHUD();
  if (isMobile) {
    createJoystick();
    createMobileButtons();
  }
}

export function isMobileDevice() {
  return isMobile;
}

// ─── HUD ─────────────────────────────────────────
function createHUD() {
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML = `
    <div id="hud-money">💰 0</div>
    <div id="hud-bucket">📦 0/10</div>
    <div id="hud-bucket-bar-container">
      <div id="hud-bucket-bar"></div>
    </div>
    <div id="hud-sell-prompt" class="hidden"></div>
  `;
  document.body.appendChild(hud);
}

export function updateHUD(state) {
  const moneyEl = document.getElementById('hud-money');
  const bucketEl = document.getElementById('hud-bucket');
  const barEl = document.getElementById('hud-bucket-bar');
  if (!moneyEl) return;

  const maxCap = getMaxCapacity(state.upgrades);
  moneyEl.textContent = `💰 ${state.money}`;
  bucketEl.textContent = `📦 ${state.bucket}/${maxCap}`;

  const pct = maxCap > 0 ? (state.bucket / maxCap) * 100 : 0;
  barEl.style.width = `${pct}%`;
  barEl.style.backgroundColor = pct >= 100 ? '#f87171' : pct >= 70 ? '#fbbf24' : '#6ee7a0';
}

export function showSellPrompt(show) {
  const el = document.getElementById('hud-sell-prompt');
  if (!el) return;
  if (show) {
    el.textContent = isMobile ? t('sellPromptMobile') : t('sellPrompt');
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

// ─── Main Menu ───────────────────────────────────
export function showMainMenu() {
  hideAllOverlays();
  const overlay = createOverlay('main-menu');
  const title = document.createElement('h1');
  title.textContent = '🚜 GoldoZer';
  title.className = 'menu-title';
  overlay.appendChild(title);

  const btnContainer = document.createElement('div');
  btnContainer.className = 'menu-buttons';

  if (hasSave()) {
    addMenuButton(btnContainer, `▶️ ${t('continue')}`, () => {
      hideAllOverlays();
      onResumeGame?.();
    });
  }

  addMenuButton(btnContainer, `🆕 ${t('newGame')}`, () => {
    hideAllOverlays();
    onStartGame?.(true);
  });

  addMenuButton(btnContainer, `🔧 ${t('upgrades')}`, () => {
    if (!hasSave()) return;
    showUpgradeMenu();
  });

  addMenuButton(btnContainer, `🔊 ${t('sound')}`, () => {
    showSoundMenu();
  });

  addMenuButton(btnContainer, `🌐 ${t('language')}`, () => {
    showLanguageMenu();
  });

  addMenuButton(btnContainer, `🗑️ ${t('reset')}`, () => {
    showResetConfirm();
  });

  addMenuButton(btnContainer, `ℹ️ ${t('credits')}`, () => {
    showCredits();
  });

  overlay.appendChild(btnContainer);
}

// ─── Pause Menu ──────────────────────────────────
export function showPauseMenu() {
  hideAllOverlays();
  const overlay = createOverlay('pause-menu');
  const title = document.createElement('h1');
  title.textContent = `⏸️ ${t('pauseTitle')}`;
  title.className = 'menu-title';
  overlay.appendChild(title);

  const btnContainer = document.createElement('div');
  btnContainer.className = 'menu-buttons';

  addMenuButton(btnContainer, `▶️ ${t('resume')}`, () => {
    hideAllOverlays();
    onResumeGame?.();
  });

  addMenuButton(btnContainer, `🔧 ${t('upgrades')}`, () => {
    showUpgradeMenu();
  });

  addMenuButton(btnContainer, `🔊 ${t('sound')}`, () => {
    showSoundMenu();
  });

  addMenuButton(btnContainer, `🌐 ${t('language')}`, () => {
    showLanguageMenu();
  });

  addMenuButton(btnContainer, `🗑️ ${t('reset')}`, () => {
    showResetConfirm();
  });

  addMenuButton(btnContainer, `ℹ️ ${t('credits')}`, () => {
    showCredits();
  });

  overlay.appendChild(btnContainer);
}

// ─── Upgrade Menu ────────────────────────────────
export function showUpgradeMenu() {
  hideAllOverlays();
  const currentState = getGameState ? getGameState() : gameState;
  const overlay = createOverlay('upgrade-menu');
  const title = document.createElement('h1');
  title.textContent = `🔧 ${t('upgrades')}`;
  title.className = 'menu-title';
  overlay.appendChild(title);

  const moneyInfo = document.createElement('div');
  moneyInfo.className = 'upgrade-money';
  moneyInfo.textContent = `💰 ${currentState.money}`;
  overlay.appendChild(moneyInfo);

  const defs = getUpgradeDefs();
  const upgradeKeys = ['speed', 'capacity', 'power', 'collectRadius'];

  upgradeKeys.forEach(key => {
    const def = defs[key];
    const level = currentState.upgrades[key];
    const cost = getUpgradeCost(key, level);
    const isMax = level >= def.maxLevel;

    const row = document.createElement('div');
    row.className = 'upgrade-row';

    const info = document.createElement('div');
    info.className = 'upgrade-info';
    info.innerHTML = `
      <strong>${t(key)}</strong><br>
      ${t('level')} ${level}/${def.maxLevel}
    `;
    row.appendChild(info);

    const btn = document.createElement('button');
    btn.className = 'menu-btn upgrade-btn';
    if (isMax) {
      btn.textContent = t('max');
      btn.disabled = true;
    } else {
      btn.textContent = `${t('buy')} (${cost} 💰)`;
      btn.disabled = currentState.money < cost;
      btn.addEventListener('click', () => {
        if (buyUpgrade(currentState, key)) {
          showUpgradeMenu(); // Refresh
          updateHUD(currentState);
        }
      });
    }
    row.appendChild(btn);
    overlay.appendChild(row);
  });

  addMenuButton(overlay, `⬅️ ${t('back')}`, () => {
    hideAllOverlays();
    if (onResumeGame) showPauseMenu();
    else showMainMenu();
  });
}

// ─── Sound Menu ──────────────────────────────────
let soundEnabled = true;
let musicEnabled = true;

function showSoundMenu() {
  hideAllOverlays();
  const overlay = createOverlay('sound-menu');
  const title = document.createElement('h1');
  title.textContent = `🔊 ${t('sound')}`;
  title.className = 'menu-title';
  overlay.appendChild(title);

  const btnContainer = document.createElement('div');
  btnContainer.className = 'menu-buttons';

  addMenuButton(btnContainer, soundEnabled ? t('sfxOn') : t('sfxOff'), () => {
    soundEnabled = !soundEnabled;
    showSoundMenu();
  });

  addMenuButton(btnContainer, musicEnabled ? t('musicOn') : t('musicOff'), () => {
    musicEnabled = !musicEnabled;
    showSoundMenu();
  });

  addMenuButton(btnContainer, `⬅️ ${t('back')}`, () => {
    showPauseMenu();
  });

  overlay.appendChild(btnContainer);
}

// ─── Language Menu ───────────────────────────────
function showLanguageMenu() {
  hideAllOverlays();
  const overlay = createOverlay('lang-menu');
  const title = document.createElement('h1');
  title.textContent = `🌐 ${t('language')}`;
  title.className = 'menu-title';
  overlay.appendChild(title);

  const btnContainer = document.createElement('div');
  btnContainer.className = 'menu-buttons';

  const langs = getAvailableLanguages();
  const labels = { fr: '🇫🇷 Français', en: '🇬🇧 English' };

  langs.forEach(lang => {
    const label = labels[lang] || lang;
    const current = getLanguage() === lang ? ' ✓' : '';
    addMenuButton(btnContainer, `${label}${current}`, () => {
      setLanguage(lang);
      showLanguageMenu();
    });
  });

  addMenuButton(btnContainer, `⬅️ ${t('back')}`, () => {
    showPauseMenu();
  });

  overlay.appendChild(btnContainer);
}

// ─── Reset Confirm ───────────────────────────────
function showResetConfirm() {
  hideAllOverlays();
  const overlay = createOverlay('reset-confirm');
  const title = document.createElement('h1');
  title.textContent = `⚠️ ${t('reset')}`;
  title.className = 'menu-title';
  overlay.appendChild(title);

  const msg = document.createElement('p');
  msg.textContent = t('confirmReset');
  msg.className = 'confirm-text';
  overlay.appendChild(msg);

  const btnContainer = document.createElement('div');
  btnContainer.className = 'menu-buttons';

  addMenuButton(btnContainer, `✅ ${t('yes')}`, () => {
    deleteSave();
    window.location.reload();
  });

  addMenuButton(btnContainer, `❌ ${t('no')}`, () => {
    showPauseMenu();
  });

  overlay.appendChild(btnContainer);
}

// ─── Credits ─────────────────────────────────────
function showCredits() {
  hideAllOverlays();
  const overlay = createOverlay('credits');
  const title = document.createElement('h1');
  title.textContent = `ℹ️ ${t('credits')}`;
  title.className = 'menu-title';
  overlay.appendChild(title);

  const text = document.createElement('p');
  text.textContent = t('creditsText');
  text.className = 'credits-text';
  overlay.appendChild(text);

  addMenuButton(overlay, `⬅️ ${t('back')}`, () => {
    showPauseMenu();
  });
}

// ─── Mobile Joystick (Dynamic) ───────────────────
function createJoystick() {
  const container = document.createElement('div');
  container.id = 'joystick-container';
  container.innerHTML = `
    <div id="joystick-base">
      <div id="joystick-handle"></div>
    </div>
  `;
  container.classList.add('hidden');
  document.body.appendChild(container);

  const base = document.getElementById('joystick-base');
  const handle = document.getElementById('joystick-handle');
  const maxDist = 40;
  let touching = false;
  let touchId = null;
  let startX = 0, startY = 0;

  // Listen on the whole screen for touch start - joystick appears where finger lands
  document.addEventListener('touchstart', (e) => {
    if (touching) return;
    // Ignore touches on UI elements (buttons, overlays)
    const target = e.target;
    if (target.closest('.overlay') || target.closest('#mobile-buttons') || target.closest('.menu-btn') || target.closest('.mobile-btn')) return;

    const touch = e.touches[e.touches.length - 1];
    touchId = touch.identifier;
    touching = true;
    startX = touch.clientX;
    startY = touch.clientY;

    // Position joystick where finger touched
    container.style.left = `${startX - 60}px`;
    container.style.top = `${startY - 60}px`;
    container.classList.remove('hidden');
    handle.style.transform = 'translate(0, 0)';

    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!touching) return;
    // Find the right touch by identifier
    let touch = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === touchId) {
        touch = e.touches[i];
        break;
      }
    }
    if (!touch) return;

    let dx = touch.clientX - startX;
    let dy = touch.clientY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }
    handle.style.transform = `translate(${dx}px, ${dy}px)`;
    controls?.setFromJoystick(dx / maxDist, dy / maxDist);
    e.preventDefault();
  }, { passive: false });

  function endTouch(e) {
    if (!touching) return;
    // Check if our specific touch ended
    let found = false;
    if (e.changedTouches) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          found = true;
          break;
        }
      }
    }
    if (!found && e.changedTouches) return;

    touching = false;
    touchId = null;
    handle.style.transform = 'translate(0, 0)';
    container.classList.add('hidden');
    controls?.resetJoystick();
  }

  window.addEventListener('touchend', endTouch, { passive: false });
  window.addEventListener('touchcancel', endTouch, { passive: false });
}

// ─── Mobile Buttons ──────────────────────────────
function createMobileButtons() {
  const container = document.createElement('div');
  container.id = 'mobile-buttons';

  // Sell button
  const sellBtn = document.createElement('button');
  sellBtn.id = 'mobile-sell-btn';
  sellBtn.className = 'mobile-btn hidden';
  sellBtn.textContent = `💰 ${t('sell')}`;
  sellBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    controls.state.action = true;
  });
  container.appendChild(sellBtn);

  // Menu button
  const menuBtn = document.createElement('button');
  menuBtn.id = 'mobile-menu-btn';
  menuBtn.className = 'mobile-btn';
  menuBtn.textContent = `☰`;
  menuBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    controls.state.menu = true;
  });
  container.appendChild(menuBtn);

  // Upgrade button
  const upgradeBtn = document.createElement('button');
  upgradeBtn.id = 'mobile-upgrade-btn';
  upgradeBtn.className = 'mobile-btn';
  upgradeBtn.textContent = `🔧`;
  upgradeBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    controls.state.upgrade = true;
  });
  container.appendChild(upgradeBtn);

  document.body.appendChild(container);
}

export function showMobileSellButton(show) {
  const btn = document.getElementById('mobile-sell-btn');
  if (!btn) return;
  if (show) btn.classList.remove('hidden');
  else btn.classList.add('hidden');
}

// ─── Helpers ─────────────────────────────────────
function createOverlay(id) {
  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.className = 'overlay';
  document.body.appendChild(overlay);
  return overlay;
}

function addMenuButton(parent, text, onClick) {
  const btn = document.createElement('button');
  btn.className = 'menu-btn';
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  parent.appendChild(btn);
  return btn;
}

export function hideAllOverlays() {
  document.querySelectorAll('.overlay').forEach(el => el.remove());
}

export function isOverlayOpen() {
  return document.querySelector('.overlay') !== null;
}
