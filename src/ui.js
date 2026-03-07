import { t, setLanguage, getLanguage, getAvailableLanguages } from './i18n.js'
import { getMaxCapacity, getPricePerUnit, getTotalInBucket } from './economy.js'
import { hasSave, deleteSave } from './save.js'
import { VERSION } from './version.js'

let isMobile = false
let onStartGame = null
let onResumeGame = null
let gameState = null
let getGameState = null
let controls = null

export function initUI(options) {
  isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024)
  onStartGame = options.onStartGame
  onResumeGame = options.onResumeGame
  gameState = options.gameState
  getGameState = options.getGameState || null
  controls = options.controls

  createHUD()
  if (isMobile) {
    createJoystick()
    createMobileButtons()
  }
}

export function isMobileDevice() {
  return isMobile
}

// ─── HUD ─────────────────────────────────────────
function createHUD() {
  const hud = document.createElement('div')
  hud.id = 'hud'
  hud.innerHTML = `
    <div id="hud-money">$ 0</div>
    <div id="hud-bucket-resources">0/10</div>
    <div id="hud-bucket-bar-container">
      <div id="hud-bucket-bar"></div>
    </div>
    <div id="hud-sell-prompt" class="hidden"></div>
    <div id="hud-delivery-prompt" class="hidden"></div>
    <div id="hud-notification" class="hidden"></div>
  `
  document.body.appendChild(hud)
}

export function updateHUD(state) {
  const moneyEl = document.getElementById('hud-money')
  const resourcesEl = document.getElementById('hud-bucket-resources')
  const barEl = document.getElementById('hud-bucket-bar')
  if (!moneyEl) return

  const maxCap = getMaxCapacity()
  const total = getTotalInBucket(state.bucket)
  moneyEl.textContent = `$ ${state.money}`

  // Multi-resource display
  let resourceText = `${total}/${maxCap}`
  const parts = []
  if (state.bucket.terre > 0) parts.push(`T:${state.bucket.terre}`)
  if (state.bucket.pierre > 0) parts.push(`P:${state.bucket.pierre}`)
  if (state.bucket.bois > 0) parts.push(`B:${state.bucket.bois}`)
  if (parts.length > 0) {
    resourceText += ` (${parts.join(' ')})`
  }
  resourcesEl.textContent = resourceText

  const pct = maxCap > 0 ? (total / maxCap) * 100 : 0
  barEl.style.width = `${pct}%`
  barEl.style.backgroundColor = pct >= 100 ? '#f87171' : pct >= 70 ? '#fbbf24' : '#6ee7a0'
}

export function showSellPrompt(show) {
  const el = document.getElementById('hud-sell-prompt')
  if (!el) return
  if (show) {
    el.textContent = isMobile ? t('sellPromptMobile') : t('sellPrompt')
    el.classList.remove('hidden')
  } else {
    el.classList.add('hidden')
  }
}

export function showDeliveryPrompt(show, target = null) {
  const el = document.getElementById('hud-delivery-prompt')
  if (!el) return
  if (show && target) {
    let text = ''
    if (target.type === 'obstacle') {
      text = `${isMobile ? t('deliverPromptMobile') : t('deliverPrompt')} — ${t(target.resource)}: ${target.delivered}/${target.required}`
    } else if (target.type === 'building') {
      const parts = []
      for (const [res, needed] of Object.entries(target.cost)) {
        const current = target.delivered[res] || 0
        if (current < needed) {
          parts.push(`${t(res)}: ${current}/${needed}`)
        }
      }
      const levelInfo = target.level !== undefined ? ` (Niv.${target.level}>${target.level + 1})` : ''
      text = `${isMobile ? t('deliverPromptMobile') : t('deliverPrompt')} — ${t(target.name)}${levelInfo} — ${parts.join(', ')}`
    }
    el.textContent = text
    el.classList.remove('hidden')
  } else {
    el.classList.add('hidden')
  }
}

export function showNotification(message, duration = 3000) {
  const el = document.getElementById('hud-notification')
  if (!el) return
  el.textContent = message
  el.classList.remove('hidden')
  el.classList.add('notification-show')
  setTimeout(() => {
    el.classList.add('hidden')
    el.classList.remove('notification-show')
  }, duration)
}

// ─── Main Menu ───────────────────────────────────
export function showMainMenu() {
  hideAllOverlays()
  const overlay = createOverlay('main-menu')
  const title = document.createElement('h1')
  title.textContent = 'GoldoZer'
  title.className = 'menu-title'
  overlay.appendChild(title)

  const btnContainer = document.createElement('div')
  btnContainer.className = 'menu-buttons'

  if (hasSave()) {
    addMenuButton(btnContainer, t('continue'), () => {
      hideAllOverlays()
      onResumeGame?.()
    })
  }

  addMenuButton(btnContainer, t('newGame'), () => {
    hideAllOverlays()
    onStartGame?.(true)
  })

  addMenuButton(btnContainer, t('sound'), () => {
    showSoundMenu()
  })

  addMenuButton(btnContainer, t('language'), () => {
    showLanguageMenu()
  })

  addMenuButton(btnContainer, t('reset'), () => {
    showResetConfirm()
  })

  addMenuButton(btnContainer, t('credits'), () => {
    showCredits()
  })

  overlay.appendChild(btnContainer)
}

// ─── Pause Menu ──────────────────────────────────
export function showPauseMenu() {
  hideAllOverlays()
  const overlay = createOverlay('pause-menu')
  const title = document.createElement('h1')
  title.textContent = t('pauseTitle')
  title.className = 'menu-title'
  overlay.appendChild(title)

  const btnContainer = document.createElement('div')
  btnContainer.className = 'menu-buttons'

  addMenuButton(btnContainer, t('resume'), () => {
    hideAllOverlays()
    onResumeGame?.()
  })

  addMenuButton(btnContainer, t('sound'), () => {
    showSoundMenu()
  })

  addMenuButton(btnContainer, t('language'), () => {
    showLanguageMenu()
  })

  addMenuButton(btnContainer, t('reset'), () => {
    showResetConfirm()
  })

  addMenuButton(btnContainer, t('credits'), () => {
    showCredits()
  })

  overlay.appendChild(btnContainer)
}

// ─── Sound Menu ──────────────────────────────────
let soundEnabled = true
let musicEnabled = true

function showSoundMenu() {
  hideAllOverlays()
  const overlay = createOverlay('sound-menu')
  const title = document.createElement('h1')
  title.textContent = t('sound')
  title.className = 'menu-title'
  overlay.appendChild(title)

  const btnContainer = document.createElement('div')
  btnContainer.className = 'menu-buttons'

  addMenuButton(btnContainer, soundEnabled ? t('sfxOn') : t('sfxOff'), () => {
    soundEnabled = !soundEnabled
    showSoundMenu()
  })

  addMenuButton(btnContainer, musicEnabled ? t('musicOn') : t('musicOff'), () => {
    musicEnabled = !musicEnabled
    showSoundMenu()
  })

  addMenuButton(btnContainer, t('back'), () => {
    showPauseMenu()
  })

  overlay.appendChild(btnContainer)
}

// ─── Language Menu ───────────────────────────────
function showLanguageMenu() {
  hideAllOverlays()
  const overlay = createOverlay('lang-menu')
  const title = document.createElement('h1')
  title.textContent = t('language')
  title.className = 'menu-title'
  overlay.appendChild(title)

  const btnContainer = document.createElement('div')
  btnContainer.className = 'menu-buttons'

  const langs = getAvailableLanguages()
  const labels = { fr: 'Francais', en: 'English' }

  langs.forEach(lang => {
    const label = labels[lang] || lang
    const current = getLanguage() === lang ? ' *' : ''
    addMenuButton(btnContainer, `${label}${current}`, () => {
      setLanguage(lang)
      showLanguageMenu()
    })
  })

  addMenuButton(btnContainer, t('back'), () => {
    showPauseMenu()
  })

  overlay.appendChild(btnContainer)
}

// ─── Reset Confirm ───────────────────────────────
function showResetConfirm() {
  hideAllOverlays()
  const overlay = createOverlay('reset-confirm')
  const title = document.createElement('h1')
  title.textContent = t('reset')
  title.className = 'menu-title'
  overlay.appendChild(title)

  const msg = document.createElement('p')
  msg.textContent = t('confirmReset')
  msg.className = 'confirm-text'
  overlay.appendChild(msg)

  const btnContainer = document.createElement('div')
  btnContainer.className = 'menu-buttons'

  addMenuButton(btnContainer, t('yes'), () => {
    deleteSave()
    window.location.reload()
  })

  addMenuButton(btnContainer, t('no'), () => {
    showPauseMenu()
  })

  overlay.appendChild(btnContainer)
}

// ─── Credits ─────────────────────────────────────
function showCredits() {
  hideAllOverlays()
  const overlay = createOverlay('credits')
  const title = document.createElement('h1')
  title.textContent = t('credits')
  title.className = 'menu-title'
  overlay.appendChild(title)

  const versionText = document.createElement('p')
  versionText.textContent = `v${VERSION}`
  versionText.className = 'credits-version'
  overlay.appendChild(versionText)

  const text = document.createElement('p')
  text.textContent = t('creditsText')
  text.className = 'credits-text'
  overlay.appendChild(text)

  addMenuButton(overlay, t('changelog'), () => {
    showChangelog()
  })

  addMenuButton(overlay, t('back'), () => {
    showPauseMenu()
  })
}

// ─── Changelog ───────────────────────────────────
function showChangelog() {
  hideAllOverlays()
  const overlay = createOverlay('changelog')
  const title = document.createElement('h1')
  title.textContent = t('changelog')
  title.className = 'menu-title'
  overlay.appendChild(title)

  const content = document.createElement('div')
  content.className = 'changelog-content'
  content.innerHTML = getChangelogHTML()
  overlay.appendChild(content)

  addMenuButton(overlay, t('back'), () => {
    showCredits()
  })
}

function getChangelogHTML() {
  return `
    <div class="changelog-entry">
      <h3>v0.6.0 <span class="changelog-date">2026-03-07</span></h3>
      <ul>
        <li>Ameliorations par batiments (plus de menu)</li>
        <li>Entrepot=capacite, Station=vitesse, Marche=prix, Equipement=rayon</li>
        <li>Batiments multi-niveaux (5 max, cout croissant)</li>
        <li>Concession agrandie avec parking et showroom</li>
        <li>Station-service avec pompes multiples</li>
        <li>Artere principale large traversant la ville</li>
        <li>Fix: pins mis a jour apres livraison</li>
        <li>Fix: pancartes de zone disparaissent</li>
      </ul>
    </div>
    <div class="changelog-entry">
      <h3>v0.5.0 <span class="changelog-date">2026-03-07</span></h3>
      <ul>
        <li>Collisions avec arbres, rochers et batiments</li>
        <li>Poussee des pepites quand le godet est plein</li>
      </ul>
    </div>
    <div class="changelog-entry">
      <h3>v0.4.2 <span class="changelog-date">2026-03-07</span></h3>
      <ul>
        <li>Fix critique : terrain inverse</li>
        <li>Fix raycaster : hauteur terrain reelle</li>
      </ul>
    </div>
    <div class="changelog-entry">
      <h3>v0.4.0 <span class="changelog-date">2026-03-07</span></h3>
      <ul>
        <li>Carte agrandie, zones 2 et 3 plus grandes</li>
        <li>Zone ville centrale avec routes et batiments</li>
        <li>Ressources en pepites colorees lumineuses</li>
        <li>Filons avec respawn automatique</li>
      </ul>
    </div>
    <div class="changelog-entry">
      <h3>v0.3.0 <span class="changelog-date">2026-03-07</span></h3>
      <ul>
        <li>Systeme de changelog et versioning</li>
      </ul>
    </div>
  `
}

// ─── Mobile Joystick (Dynamic) ───────────────────
function createJoystick() {
  const container = document.createElement('div')
  container.id = 'joystick-container'
  container.innerHTML = `
    <div id="joystick-base">
      <div id="joystick-handle"></div>
    </div>
  `
  container.classList.add('hidden')
  document.body.appendChild(container)

  const base = document.getElementById('joystick-base')
  const handle = document.getElementById('joystick-handle')
  const maxDist = 40
  let touching = false
  let touchId = null
  let startX = 0, startY = 0

  document.addEventListener('touchstart', (e) => {
    if (touching) return
    const target = e.target
    if (target.closest('.overlay') || target.closest('#mobile-buttons') || target.closest('.menu-btn') || target.closest('.mobile-btn')) return

    const touch = e.touches[e.touches.length - 1]
    touchId = touch.identifier
    touching = true
    startX = touch.clientX
    startY = touch.clientY

    container.style.left = `${startX - 60}px`
    container.style.top = `${startY - 60}px`
    container.classList.remove('hidden')
    handle.style.transform = 'translate(0, 0)'

    e.preventDefault()
  }, { passive: false })

  document.addEventListener('touchmove', (e) => {
    if (!touching) return
    let touch = null
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === touchId) {
        touch = e.touches[i]
        break
      }
    }
    if (!touch) return

    let dx = touch.clientX - startX
    let dy = touch.clientY - startY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist
      dy = (dy / dist) * maxDist
    }
    handle.style.transform = `translate(${dx}px, ${dy}px)`
    controls?.setFromJoystick(dx / maxDist, dy / maxDist)
    e.preventDefault()
  }, { passive: false })

  function endTouch(e) {
    if (!touching) return
    let found = false
    if (e.changedTouches) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          found = true
          break
        }
      }
    }
    if (!found && e.changedTouches) return

    touching = false
    touchId = null
    handle.style.transform = 'translate(0, 0)'
    container.classList.add('hidden')
    controls?.resetJoystick()
  }

  window.addEventListener('touchend', endTouch, { passive: false })
  window.addEventListener('touchcancel', endTouch, { passive: false })
}

// ─── Mobile Buttons ──────────────────────────────
function createMobileButtons() {
  const container = document.createElement('div')
  container.id = 'mobile-buttons'

  // Sell button
  const sellBtn = document.createElement('button')
  sellBtn.id = 'mobile-sell-btn'
  sellBtn.className = 'mobile-btn hidden'
  sellBtn.textContent = `$ ${t('sell')}`
  sellBtn.addEventListener('touchstart', (e) => {
    e.preventDefault()
    controls.state.action = true
  })
  container.appendChild(sellBtn)

  // Deliver button
  const deliverBtn = document.createElement('button')
  deliverBtn.id = 'mobile-deliver-btn'
  deliverBtn.className = 'mobile-btn hidden'
  deliverBtn.textContent = t('deliverPromptMobile')
  deliverBtn.addEventListener('touchstart', (e) => {
    e.preventDefault()
    controls.state.action = true
  })
  container.appendChild(deliverBtn)

  // Menu button
  const menuBtn = document.createElement('button')
  menuBtn.id = 'mobile-menu-btn'
  menuBtn.className = 'mobile-btn'
  menuBtn.textContent = '='
  menuBtn.addEventListener('touchstart', (e) => {
    e.preventDefault()
    controls.state.menu = true
  })
  container.appendChild(menuBtn)

  document.body.appendChild(container)
}

export function showMobileSellButton(show) {
  const btn = document.getElementById('mobile-sell-btn')
  if (!btn) return
  if (show) btn.classList.remove('hidden')
  else btn.classList.add('hidden')
}

export function showMobileDeliverButton(show) {
  const btn = document.getElementById('mobile-deliver-btn')
  if (!btn) return
  if (show) btn.classList.remove('hidden')
  else btn.classList.add('hidden')
}

// ─── Helpers ─────────────────────────────────────
function createOverlay(id) {
  const overlay = document.createElement('div')
  overlay.id = id
  overlay.className = 'overlay'
  document.body.appendChild(overlay)
  return overlay
}

function addMenuButton(parent, text, onClick) {
  const btn = document.createElement('button')
  btn.className = 'menu-btn'
  btn.textContent = text
  btn.addEventListener('click', onClick)
  parent.appendChild(btn)
  return btn
}

export function hideAllOverlays() {
  document.querySelectorAll('.overlay').forEach(el => el.remove())
}

export function isOverlayOpen() {
  return document.querySelector('.overlay') !== null
}
