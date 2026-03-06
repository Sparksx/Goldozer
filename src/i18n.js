const translations = {
  fr: {
    continue: 'Continuer',
    newGame: 'Nouvelle partie',
    upgrades: 'Améliorations',
    sound: 'Son',
    language: 'Langue',
    reset: 'Réinitialiser la progression',
    credits: 'Crédits',
    confirmReset: 'Êtes-vous sûr ? Toute la progression sera perdue.',
    yes: 'Oui',
    no: 'Non',
    cancel: 'Annuler',
    back: 'Retour',
    money: 'Argent',
    bucket: 'Godet',
    speed: 'Vitesse',
    capacity: 'Capacité du godet',
    power: 'Puissance',
    collectRadius: 'Rayon de collecte',
    level: 'Niv.',
    cost: 'Coût',
    max: 'MAX',
    buy: 'Acheter',
    sell: 'Vendre',
    sellPrompt: 'Appuyez sur E pour vendre',
    sellPromptMobile: 'Vendre',
    nearSellPoint: 'Point de vente à proximité',
    soundOn: 'Son : ON',
    soundOff: 'Son : OFF',
    musicOn: 'Musique : ON',
    musicOff: 'Musique : OFF',
    sfxOn: 'Effets : ON',
    sfxOff: 'Effets : OFF',
    creditsText: 'GoldoZer — v0.1.0',
    menu: 'Menu',
    resume: 'Reprendre',
    pauseTitle: 'Pause',
  },
  en: {
    continue: 'Continue',
    newGame: 'New Game',
    upgrades: 'Upgrades',
    sound: 'Sound',
    language: 'Language',
    reset: 'Reset Progress',
    credits: 'Credits',
    confirmReset: 'Are you sure? All progress will be lost.',
    yes: 'Yes',
    no: 'No',
    cancel: 'Cancel',
    back: 'Back',
    money: 'Money',
    bucket: 'Bucket',
    speed: 'Speed',
    capacity: 'Bucket Capacity',
    power: 'Power',
    collectRadius: 'Collect Radius',
    level: 'Lv.',
    cost: 'Cost',
    max: 'MAX',
    buy: 'Buy',
    sell: 'Sell',
    sellPrompt: 'Press E to sell',
    sellPromptMobile: 'Sell',
    nearSellPoint: 'Sell point nearby',
    soundOn: 'Sound: ON',
    soundOff: 'Sound: OFF',
    musicOn: 'Music: ON',
    musicOff: 'Music: OFF',
    sfxOn: 'SFX: ON',
    sfxOff: 'SFX: OFF',
    creditsText: 'GoldoZer — v0.1.0',
    menu: 'Menu',
    resume: 'Resume',
    pauseTitle: 'Pause',
  },
};

let currentLang = 'fr';

export function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
  }
}

export function getLanguage() {
  return currentLang;
}

export function t(key) {
  return translations[currentLang]?.[key] || translations.fr[key] || key;
}

export function getAvailableLanguages() {
  return Object.keys(translations);
}
