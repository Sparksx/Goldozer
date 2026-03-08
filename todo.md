# TODO — Améliorations potentielles de Goldozer

Analyse complète du code source effectuée le 2026-03-07.
Trié par ordre d'importance : impact sur l'expérience joueur, stabilité et gravité technique.

---

## P0 — Critique (bugs actifs, crashs, fuites)

- [x] **Fuite mémoire au redémarrage** — `startGame()` vide la scène (`scene.remove`) sans appeler `geometry.dispose()` / `material.dispose()` sur les objets retirés. Chaque "Nouvelle partie" fuit l'intégralité des géométries/matériaux/textures du monde précédent. Le jeu va ralentir puis crasher après quelques restarts.
  - Fichiers : `src/main.js:79-81`

- [x] **`startGame()` appelé deux fois au chargement** — Quand il y a une sauvegarde, `startGame()` est appelé à la ligne 104, puis potentiellement à nouveau via `onStartGame` depuis le menu. Les objets du premier appel ne sont pas correctement nettoyés → double fuite mémoire dès le lancement.
  - Fichiers : `src/main.js:103-107`

- [x] **Tableau `resources` jamais nettoyé** — Les anciens objets resource restent en mémoire entre les parties. Les ressources collectées (`.collected = true`) restent dans le tableau et sont itérées chaque frame inutilement, dégradant les performances progressivement.
  - Fichiers : `src/main.js:48,92-94`, `src/resources.js:322`

- [x] **`collectedIds` grandit indéfiniment** — Les IDs de ressources récoltées sont accumulés sans limite dans `state.collectedIds` et sauvegardés en base64 dans localStorage. Après des heures de jeu, ce tableau peut atteindre des milliers d'entrées, ralentissant la sauvegarde et risquant de saturer localStorage (~5 Mo max).
  - Fichiers : `src/main.js:201`, `src/economy.js:99-107`

- [x] **Pas de gestion de perte du contexte WebGL** — Si le contexte WebGL est perdu (`webglcontextlost` — courant sur mobile), le jeu crash silencieusement sans feedback ni tentative de récupération.
  - Fichiers : `src/main.js:25-30`

---

## P1 — Important (perf visible, bugs UX, stabilité)

- [x] **Raycaster pour la hauteur du terrain** — Chaque appel à `getTerrainHeight()` lance un raycast sur le mesh du sol (128×128 vertices). Appelé des dizaines de fois par frame et des centaines de fois au chargement. Remplacer par un tableau de hauteurs pré-calculé serait 100x plus rapide.
  - Fichiers : `src/world.js:39-49`

- [x] **`persistState()` appelé à chaque collecte de ressource** — Chaque nugget ramassé déclenche JSON.stringify + base64 encode + écriture localStorage. Sur un cluster dense, cela peut être 30+ écritures/seconde → micro-freezes visibles. Debouncer (1 fois/seconde max).
  - Fichiers : `src/main.js:205`

- [x] **`collectedIds.includes()` en O(n)** — Chaque spawn de ressource appelle `collectedIds.includes(rid)` dans une boucle, donnant une complexité O(n×m). Devrait utiliser un `Set`. Impact croissant avec le temps de jeu.
  - Fichiers : `src/resources.js:108,125,140,157`

- [x] **Centaines de géométries/matériaux non partagés** — Chaque arbre, rocher, marqueur de route crée ses propres `Geometry` et `Material`. Utiliser `InstancedMesh` ou partager les géométries réduirait le nombre de draw calls de ~300 à ~10.
  - Fichiers : `src/world.js:442-496`

- [x] **`CanvasTexture` fuitées à chaque livraison** — `refreshBuildingMarker` et `refreshChantierMarker` recréent un canvas + texture à chaque livraison partielle sans disposer les anciens. Fuite mémoire GPU progressive.
  - Fichiers : `src/buildings.js:403-480`, `src/zones.js:356-421`

- [x] **Création de `Vector3` dans la boucle de rendu** — `updateCamera()` crée 3 `new THREE.Vector3()` à chaque frame → pression sur le GC, micro-stutters possibles.
  - Fichiers : `src/bulldozer.js:117-138`

- [x] **Notifications empilables** — `showNotification()` utilise un `setTimeout` fixe. Si plusieurs notifications arrivent rapidement (vente + zone débloquée), elles se superposent et le premier timer cache la deuxième prématurément.
  - Fichiers : `src/ui.js:112-122`

- [x] **Pas de validation de la sauvegarde** — `loadGame()` fait confiance au JSON décodé sans valider la structure. Une sauvegarde corrompue peut provoquer des erreurs runtime (ex: `bucket` n'est pas un objet, `money` est NaN).
  - Fichiers : `src/save.js:13-22`, `src/economy.js:40-69`

- [x] **Modules avec état global mutable non réinitialisé** — `zonesState`, `buildingsState`, `veinStates`, `worldObstacles` sont des variables de module modifiées en place. Pas de réinitialisation propre entre les parties → état fantôme de la partie précédente.
  - Fichiers : `src/zones.js:52`, `src/buildings.js:73`, `src/resources.js:176`, `src/world.js:33`

- [x] **Pas de fallback WebGL** — Si WebGL n'est pas supporté, la page affiche un div vide noir sans message d'erreur. L'utilisateur ne sait pas pourquoi rien ne s'affiche.
  - Fichiers : `src/main.js:25`

---

## P2 — Moyen (bugs mineurs, UX, qualité de code)

- [x] **Langue non persistée** — Changer de langue via le menu ne sauvegarde pas le choix. Au rechargement, on retombe sur `'fr'`.
  - Fichiers : `src/i18n.js:152`

- [x] **Menu Son : retour toujours vers Pause** — Le bouton "Retour" du menu Son navigue vers `showPauseMenu()` même si on y est arrivé depuis le menu principal.
  - Fichiers : `src/ui.js:228-230`

- [ ] **Son : variables sans effet** — `soundEnabled` et `musicEnabled` sont toggles dans le menu, mais ne sont ni exportées ni connectées à un système audio. Le menu Son est un placebo.
  - Fichiers : `src/ui.js:204-233`

- [x] **`getSellPriceMultiplier` ignore le type de ressource** — La fonction reçoit un paramètre `resourceType` mais ne l'utilise jamais. Soit le paramètre est inutile, soit c'est un oubli.
  - Fichiers : `src/buildings.js:184-194`

- [x] **Shadow map très large** — La shadow map couvre 500×500 unités en 2048×2048 → résolution d'ombre très basse (~0.24 unité/pixel). Un shadow map cascadé ou ciblé autour du joueur donnerait des ombres nettes.
  - Fichiers : `src/world.js:289-299`

- [ ] **Marqueurs route : ~80 petits meshes** — Les lignes de route et marqueurs sont des `PlaneGeometry` individuels. Regrouper en un seul `BufferGeometry` ou une texture peinte.
  - Fichiers : `src/world.js:392-440`

- [x] **Pas de sauvegarde auto périodique** — La sauvegarde ne se fait que lors d'une collecte, d'une vente, ou quand l'onglet perd le focus. Si le navigateur crash entre deux actions, la progression est perdue.

- [ ] **Pas de tutoriel / onboarding** — Un nouveau joueur ne sait pas quoi faire. Aucune indication sur les mécaniques de base.

- [ ] **Pas de minimap / boussole** — Sur une carte de 800×800, il est facile de se perdre. Pas d'indication de direction vers les points de vente ou chantiers.

- [x] **Détection mobile fragile** — La regex user-agent est incomplète (iPadOS Safari se présente en desktop). Le fallback `maxTouchPoints` est approximatif.
  - Fichiers : `src/ui.js:14-15`

- [x] **`checkSellPointProximity()` recalcule `getSellPoints()` chaque frame** — Micro-optimisation possible : un seul sell point statique, pas besoin de boucle.
  - Fichiers : `src/main.js:112-126`

---

## P3 — Faible (améliorations, dette technique, polish)

- [x] **Fonction `roundRect` dupliquée** — Identique dans `zones.js:424` et `buildings.js:482`. Extraire dans un utilitaire commun.
  - Fichiers : `src/zones.js:424-436`, `src/buildings.js:482-494`

- [x] **Fonction `seededRandom` dupliquée** — Identique dans `world.js:578` et `resources.js:350`. Extraire dans un utilitaire commun.
  - Fichiers : `src/world.js:578-581`, `src/resources.js:350-353`

- [ ] **Fichier `ui.js` monolithique** — ~600 lignes couvrant HUD, menus, joystick, boutons, overlays, changelog. Découper en sous-modules.

- [ ] **Constantes magiques dispersées** — `SELL_RADIUS`, `DELIVERY_RADIUS`, `PUSH_RADIUS`, `BASE_COLLECT_RADIUS`, etc. dans différents fichiers sans centralisation.

- [ ] **Pas de système d'événements** — Les modules communiquent par appels directs et mutation d'état partagé. Un EventEmitter léger aiderait à découpler.

- [ ] **Pas de linter/formatter** — Inconsistance de style (`;` présents dans certains fichiers, absents dans d'autres). Pas d'ESLint ni Prettier.

- [ ] **Pas de tests** — Aucun test unitaire, d'intégration, ou E2E. Les régressions sont découvertes uniquement en jouant.

- [x] **`requestAnimationFrame` sans possibilité d'arrêt** — La boucle de jeu tourne indéfiniment sans `cancelAnimationFrame`. Problème si le jeu est intégré dans un SPA.
  - Fichiers : `src/main.js:133-302`

- [ ] **Pas de frustum culling spatial** — Three.js fait du culling automatique par mesh, mais un octree/grid spatial pour 850+ ressources aiderait sur les appareils faibles.

- [x] **`lang="fr"` hardcodé dans le HTML** — L'attribut `lang` du HTML ne change pas quand on passe en anglais.
  - Fichiers : `index.html:2`

- [ ] **HUD trop minimaliste** — Pas d'indication de zone, pas d'icônes de ressources, pas de feedback visuel godet plein.

- [ ] **Pas d'accessibilité clavier dans les menus** — Pas de navigation Tab, pas de focus visible, pas de rôles ARIA.
  - Fichiers : `src/ui.js`

- [ ] **Pas de contrôle de la caméra** — Impossible de zoomer ou tourner la caméra. Le `lerp(0.04)` fixe rend la caméra lente.
  - Fichiers : `src/bulldozer.js:128`

---

## P4 — Nice to have (features futures, polish avancé)

- [ ] **Pas de feedback audio** — Aucun son (collecte, vente, collision, ambiance). Implémenter Web Audio API.

- [ ] **Pas de particules / effets visuels** — Aucun feedback visuel pour la collecte, la vente, le débloquage de zone.

- [ ] **Concession "En construction"** — Le bâtiment est `wip: true` et non fonctionnel. Feature à implémenter.
  - Fichiers : `src/buildings.js:60-70`

- [ ] **Pas de support manette / gamepad** — Seuls clavier et tactile sont supportés. L'API Gamepad n'est pas utilisée.

- [ ] **Pas de mode plein écran** — Pas de bouton ni raccourci (Fullscreen API).

- [ ] **Pas de manifest / PWA** — Pas de `manifest.json`, pas de service worker. Pas d'installation ni de mode hors-ligne.

- [ ] **Google Fonts en dépendance externe** — La police Fredoka est chargée depuis Google Fonts. Embarquer localement pour fiabilité.
  - Fichiers : `index.html:7-9`

- [ ] **`devicePixelRatio` cappé à 2** — Bon compromis perf mais pourrait être configurable dans les options graphiques.
  - Fichiers : `src/main.js:27`

- [ ] **Sauvegarde triviale à manipuler** — L'encodage base64 n'offre aucune protection. Ajouter un checksum si un leaderboard est prévu.
  - Fichiers : `src/save.js`

- [ ] **Pas de sanitization de l'innerHTML** — `getChangelogHTML()` utilise du HTML hardcodé via `innerHTML`. Sans risque actuel, mais à surveiller si le contenu devient dynamique.
  - Fichiers : `src/ui.js:334`

- [ ] **Console ouverte = accès complet** — Normal pour un jeu client-side, mais à noter si un système compétitif est prévu.
