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
    creditsText: 'GoldoZer — Un jeu de bulldozer en 3D',
    changelog: 'Changelog',
    menu: 'Menu',
    resume: 'Reprendre',
    pauseTitle: 'Pause',
    // Resources
    terre: 'Terre',
    pierre: 'Pierre',
    bois: 'Bois',
    // Zones
    zone1: 'Plaine de départ',
    zone2: 'Collines',
    zone3: 'Forêt',
    zoneUnlocked: 'Zone débloquée !',
    zoneLocked: 'Zone verrouillée',
    // Delivery
    deliverPrompt: 'Appuyez sur E pour livrer',
    deliverPromptMobile: 'Livrer',
    delivering: 'Livraison',
    delivered: 'Livré',
    deliverProgress: 'Livrer {resource} : {current}/{total}',
    // Buildings
    maison: 'Maison',
    entrepot: 'Entrepôt',
    marche: 'Marché',
    scierie: 'Scierie',
    concession: 'Concession',
    fonderie: 'Fonderie',
    stationService: 'Station-service',
    laboratoire: 'Laboratoire',
    wipLabel: '🚧 En construction',
    buildingBuilt: '{name} construite !',
    maisonEffect: '+5% prix vente terre',
    entrepotEffect: '+10 capacité de stock',
    marcheEffect: 'Prix dynamiques débloqués',
    scierieEffect: 'Bois x1.5 valeur',
    concessionEffect: 'Achat de véhicules (bientôt)',
    fonderieEffect: 'Raffinage de ressources (bientôt)',
    stationServiceEffect: 'Boost de vitesse (bientôt)',
    laboratoireEffect: 'Recherche avancée (bientôt)',
    // Obstacle chantiers
    rockslideChantier: 'Chantier de déblaiement',
    riverChantier: 'Chantier du pont',
    obstacleCleared: 'Passage ouvert !',
    // HUD
    emptyBucket: 'Godet vide',
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
    creditsText: 'GoldoZer — A 3D bulldozer game',
    changelog: 'Changelog',
    menu: 'Menu',
    resume: 'Resume',
    pauseTitle: 'Pause',
    // Resources
    terre: 'Earth',
    pierre: 'Stone',
    bois: 'Wood',
    // Zones
    zone1: 'Starting Plains',
    zone2: 'Hills',
    zone3: 'Forest',
    zoneUnlocked: 'Zone unlocked!',
    zoneLocked: 'Zone locked',
    // Delivery
    deliverPrompt: 'Press E to deliver',
    deliverPromptMobile: 'Deliver',
    delivering: 'Delivering',
    delivered: 'Delivered',
    deliverProgress: 'Deliver {resource} : {current}/{total}',
    // Buildings
    maison: 'House',
    entrepot: 'Warehouse',
    marche: 'Market',
    scierie: 'Sawmill',
    concession: 'Dealership',
    fonderie: 'Foundry',
    stationService: 'Gas Station',
    laboratoire: 'Research Lab',
    wipLabel: '🚧 Coming Soon',
    buildingBuilt: '{name} built!',
    maisonEffect: '+5% earth sell price',
    entrepotEffect: '+10 storage capacity',
    marcheEffect: 'Dynamic prices unlocked',
    scierieEffect: 'Wood x1.5 value',
    concessionEffect: 'Buy vehicles (coming soon)',
    fonderieEffect: 'Resource refining (coming soon)',
    stationServiceEffect: 'Speed boost (coming soon)',
    laboratoireEffect: 'Advanced research (coming soon)',
    // Obstacle chantiers
    rockslideChantier: 'Clearing site',
    riverChantier: 'Bridge site',
    obstacleCleared: 'Passage opened!',
    // HUD
    emptyBucket: 'Bucket empty',
  },
}

let currentLang = 'fr'

export function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang
  }
}

export function getLanguage() {
  return currentLang
}

export function t(key, params = {}) {
  let text = translations[currentLang]?.[key] || translations.fr[key] || key
  // Replace {param} placeholders
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(`{${k}}`, v)
  }
  return text
}

export function getAvailableLanguages() {
  return Object.keys(translations)
}
