# TODO — Améliorations potentielles de Goldozer

Analyse complète du code source effectuée le 2026-03-07.

---

## Bugs

- [ ] **Fuite mémoire au redémarrage** — `startGame()` vide la scène (`scene.remove`) sans appeler `geometry.dispose()` / `material.dispose()` sur les objets retirés. Chaque "Nouvelle partie" fuit l'intégralité des géométries/matériaux/textures du monde précédent.
  - Fichiers : `src/main.js:79-81`

- [ ] **Tableau `resources` jamais nettoyé** — Quand on lance `startGame()`, les anciens objets resource restent dans le tableau `resources` (on fait `resources = spawnResources(...)` mais les anciens meshes ont juste été retirés de la scène sans dispose). De plus, les ressources collectées (`.collected = true`) restent dans le tableau et sont itérées chaque frame.
  - Fichiers : `src/main.js:48,92-94`, `src/resources.js:322`

- [ ] **`collectedIds` grandit indéfiniment** — Les IDs de ressources récoltées sont accumulés sans limite dans `state.collectedIds` et sauvegardés en base64 dans localStorage. Après des heures de jeu, ce tableau peut atteindre des milliers d'entrées, ralentissant la sauvegarde et saturant localStorage (~5 Mo max).
  - Fichiers : `src/main.js:201`, `src/economy.js:99-107`

- [ ] **`collectedIds.includes()` en O(n)** — Chaque spawn de ressource appelle `collectedIds.includes(rid)` dans une boucle, ce qui donne une complexité O(n×m). Devrait utiliser un `Set`.
  - Fichiers : `src/resources.js:108,125,140,157`

- [ ] **Notifications empilables** — `showNotification()` utilise un `setTimeout` fixe. Si plusieurs notifications arrivent rapidement (vente + zone débloquée), elles se superposent et le premier timer cache la deuxième prématurément.
  - Fichiers : `src/ui.js:112-122`

- [ ] **Son : variables sans effet** — `soundEnabled` et `musicEnabled` dans `ui.js` sont toggles dans le menu, mais ne sont ni exportées ni connectées à un système audio. Le menu Son est un placebo.
  - Fichiers : `src/ui.js:204-233`

- [ ] **`getSellPriceMultiplier` ignore le type de ressource** — La fonction reçoit un paramètre `resourceType` mais ne l'utilise jamais (le bonus s'applique uniformément). Soit le paramètre est inutile, soit c'est un oubli si l'on veut des bonus différenciés.
  - Fichiers : `src/buildings.js:184-194`

- [ ] **Langue non persistée** — Changer de langue via le menu ne sauvegarde pas le choix. Au rechargement, on retombe sur `'fr'`.
  - Fichiers : `src/i18n.js:152`

- [ ] **Menu Son : retour toujours vers Pause** — Le bouton "Retour" du menu Son navigue vers `showPauseMenu()` même si on y est arrivé depuis le menu principal.
  - Fichiers : `src/ui.js:228-230`

- [ ] **Détection mobile fragile** — La regex user-agent pour détecter le mobile est incomplète (manque certains tablets, iPadOS Safari se présente en desktop). `navigator.maxTouchPoints > 0 && window.innerWidth < 1024` est un fallback approximatif.
  - Fichiers : `src/ui.js:14-15`

---

## Stabilité

- [ ] **Pas de gestion des erreurs sur le rendu** — Si le contexte WebGL est perdu (`webglcontextlost`), le jeu crash silencieusement sans feedback ni tentative de récupération.
  - Fichiers : `src/main.js:25-30`

- [ ] **`groundMesh` et `groundRaycaster` sont des variables globales mutables** — Si `createWorld()` est appelé avant que le terrain soit prêt, `getTerrainHeight()` retourne 0 silencieusement. Un appel prématuré pourrait placer des objets au mauvais endroit.
  - Fichiers : `src/world.js:31-49`

- [ ] **Modules avec état global mutable** — `zonesState`, `buildingsState`, `veinStates`, `worldObstacles` sont des variables de module modifiées en place. Pas de protection contre les accès concurrents ni de réinitialisation propre entre les parties.
  - Fichiers : `src/zones.js:52`, `src/buildings.js:73`, `src/resources.js:176`, `src/world.js:33`

- [ ] **`requestAnimationFrame` sans possibilité d'arrêt** — La boucle de jeu tourne indéfiniment sans moyen de la stopper proprement (pas de `cancelAnimationFrame`). Problème si le jeu est intégré dans un SPA.
  - Fichiers : `src/main.js:133-302`

- [ ] **Pas de validation de la sauvegarde** — `loadGame()` fait confiance au JSON décodé sans valider la structure. Une sauvegarde corrompue ou manipulée manuellement peut provoquer des erreurs runtime (ex: `bucket` n'est pas un objet, `money` est NaN, etc.).
  - Fichiers : `src/save.js:13-22`, `src/economy.js:40-69`

- [ ] **`startGame()` appelé deux fois au chargement** — Quand il y a une sauvegarde, `startGame()` est appelé à la ligne 104, puis potentiellement à nouveau via `onStartGame` depuis le menu. Les objets du premier appel ne sont pas correctement nettoyés.
  - Fichiers : `src/main.js:103-107`

---

## Performance

- [ ] **Raycaster pour la hauteur du terrain** — Chaque appel à `getTerrainHeight()` lance un raycast sur le mesh du sol (128×128 vertices). Cette fonction est appelée des dizaines de fois par frame (bulldozer, ressources poussées, etc.) et des centaines de fois au chargement (arbres, rochers, routes). Remplacer par un tableau de hauteurs pré-calculé serait bien plus rapide.
  - Fichiers : `src/world.js:39-49`

- [ ] **Centaines de géométries/matériaux non partagés** — Chaque arbre, rocher, marqueur de route crée ses propres `Geometry` et `Material`. Les arbres partagent les mêmes formes mais instancient de nouvelles géométries à chaque fois. Utiliser `InstancedMesh` ou au minimum partager les géométries.
  - Fichiers : `src/world.js:442-496`

- [ ] **Marqueurs route : des dizaines de petits meshes** — Les lignes de route et marqueurs sont créés comme des `PlaneGeometry` individuels. ~80 petits meshes qui pourraient être regroupés en un seul `BufferGeometry` ou une texture.
  - Fichiers : `src/world.js:392-440`

- [ ] **`CanvasTexture` pour chaque label** — Chaque bâtiment, chantier et badge crée un canvas 2D, dessine du texte, et en fait une texture. Ces textures ne sont jamais réutilisées ni disposées quand le label est mis à jour (`refreshBuildingMarker` crée un nouveau canvas à chaque livraison partielle).
  - Fichiers : `src/buildings.js:403-480`, `src/zones.js:356-421`

- [ ] **Pas de frustum culling explicite** — Tous les 850+ objets ressource et les marqueurs sont dans la scène même quand ils sont hors du champ de la caméra. Three.js fait du frustum culling automatique par mesh, mais les sprites et petits objets lointains pourraient bénéficier d'un LOD ou d'un culling spatial.
  - Fichiers : `src/resources.js`, `src/world.js`

- [ ] **Création de `Vector3` dans la boucle de rendu** — `updateCamera()` crée 3 `new THREE.Vector3()` à chaque frame. Ces allocations répétées mettent de la pression sur le GC.
  - Fichiers : `src/bulldozer.js:117-138`

- [ ] **Shadow map très large** — La shadow map couvre 500×500 unités (`camera.left/right/top/bottom = ±250`) en 2048×2048. Pour une map de 800×800, la résolution des ombres est très basse (~0.24 unité/pixel). Un shadow map cascadé ou ciblé autour du joueur serait plus efficace.
  - Fichiers : `src/world.js:289-299`

- [ ] **`checkSellPointProximity()` recalcule `getSellPoints()` chaque frame** — Appel de fonction + boucle chaque frame alors qu'il n'y a qu'un seul sell point statique.
  - Fichiers : `src/main.js:112-126`

- [ ] **`persistState()` appelé à chaque collecte de ressource** — Chaque nugget ramassé déclenche une sérialisation JSON + encode base64 + écriture localStorage. Sur un cluster dense, cela peut être 30+ écritures par seconde. Debouncer les sauvegardes (ex: 1 fois par seconde max).
  - Fichiers : `src/main.js:205`

---

## Sécurité / Triche

- [ ] **Sauvegarde triviale à manipuler** — L'encodage base64 n'offre aucune protection. Un joueur peut décoder, modifier `money: 999999` et réencoder. Ajouter au minimum un checksum/HMAC si l'intégrité de la progression est importante.
  - Fichiers : `src/save.js`

- [ ] **Pas de sanitization de l'innerHTML** — `getChangelogHTML()` retourne du HTML brut injecté via `innerHTML`. Actuellement le contenu est hardcodé donc sans risque, mais si le changelog devient dynamique (API, CMS), c'est un vecteur XSS.
  - Fichiers : `src/ui.js:334`

- [ ] **Console ouverte = accès complet** — Aucune variable n'est protégée. Depuis la console du navigateur, on peut accéder à `state`, modifier `money`, etc. (Normal pour un jeu client-side, mais à noter si un leaderboard est prévu.)

---

## UX / Accessibilité

- [ ] **Pas de feedback audio** — Aucun son dans le jeu (collecte, vente, collision, ambiance). Le menu Son existe mais ne fait rien.

- [ ] **Pas de minimap / boussole** — Sur une carte de 800×800, il est facile de se perdre. Pas d'indication de direction vers les points de vente ou chantiers.

- [ ] **Pas de tutoriel / onboarding** — Un nouveau joueur ne sait pas quoi faire. Pas d'indication que les nuggets se ramassent en roulant dessus, qu'il faut aller au dépôt pour vendre, etc.

- [ ] **HUD trop minimaliste** — Pas d'indication du type de zone actuelle, pas de mini-inventaire visuel (icônes des ressources), pas de feedback visuel quand le godet est plein.

- [ ] **Pas de contrôle de la caméra** — Impossible de zoomer, tourner la caméra indépendamment, ou passer en vue de dessus. Le `lerp(0.04)` fixe rend la caméra lente à suivre les mouvements brusques.
  - Fichiers : `src/bulldozer.js:128`

- [ ] **Pas d'accessibilité clavier dans les menus** — Les menus sont entièrement click/touch. Pas de navigation Tab, pas de focus visible, pas de rôles ARIA.
  - Fichiers : `src/ui.js`

- [ ] **`lang="fr"` hardcodé dans le HTML** — L'attribut `lang` du HTML ne change pas quand on passe en anglais.
  - Fichiers : `index.html:2`

---

## Architecture / Maintenabilité

- [ ] **Fonction `roundRect` dupliquée** — Implémentée identiquement dans `zones.js:424` et `buildings.js:482`. Extraire dans un utilitaire commun.
  - Fichiers : `src/zones.js:424-436`, `src/buildings.js:482-494`

- [ ] **Fonction `seededRandom` dupliquée** — Implémentée identiquement dans `world.js:578` et `resources.js:350`. Extraire dans un utilitaire commun.
  - Fichiers : `src/world.js:578-581`, `src/resources.js:350-353`

- [ ] **Pas de tests** — Aucun test unitaire, d'intégration, ou E2E. Les régressions sont découvertes uniquement en jouant.

- [ ] **Pas de linter/formatter** — Inconsistance de style (certains fichiers avec `;`, d'autres sans). Pas d'ESLint ni Prettier configuré.

- [ ] **Fichier `ui.js` monolithique** — ~600 lignes qui gèrent le HUD, les menus, le joystick mobile, les boutons, les overlays, le changelog. Devrait être découpé en sous-modules (menu.js, hud.js, mobile.js).

- [ ] **Constantes magiques dispersées** — `SELL_RADIUS = 10`, `DELIVERY_RADIUS = 10`, `PUSH_RADIUS = 3.5`, `BASE_COLLECT_RADIUS = 4`, etc. sont définies dans différents fichiers sans centralisation ni documentation de leurs relations.

- [ ] **Pas de système d'événements** — Les modules communiquent par appels directs et mutation d'état partagé. Un EventEmitter léger aiderait à découpler les systèmes (ex: "resource_collected" → UI update + save + sound).

---

## Fonctionnalités manquantes / En attente

- [ ] **Concession "En construction"** — Le bâtiment est flaggé `wip: true` et non fonctionnel. Il est affiché avec un label "En construction" mais le joueur ne peut pas interagir.
  - Fichiers : `src/buildings.js:60-70`

- [ ] **Pas de système audio** — Pas de Web Audio API, pas de fichiers son. Le menu Son toggle des booléens inutilisés.

- [ ] **Pas de particules / effets visuels** — Aucun feedback visuel pour la collecte, la vente, le débloquage de zone. Juste un texte de notification.

- [ ] **Pas de sauvegarde auto périodique** — La sauvegarde ne se fait que lors d'une collecte, d'une vente, ou quand l'onglet perd le focus. Si le navigateur crash entre deux actions, la progression est perdue.

- [ ] **Pas de support manette / gamepad** — Seuls le clavier et le tactile sont supportés. L'API Gamepad n'est pas utilisée.

- [ ] **Pas de mode plein écran** — Pas de bouton ni raccourci pour passer en plein écran (Fullscreen API).

---

## Compatibilité

- [ ] **Pas de fallback WebGL** — Si WebGL n'est pas supporté, la page affiche un div vide noir sans message d'erreur.
  - Fichiers : `src/main.js:25`

- [ ] **Google Fonts en dépendance externe** — La police Fredoka est chargée depuis Google Fonts. En cas d'indisponibilité ou de CSP restrictive, le texte passe en fallback sans notification.
  - Fichiers : `index.html:7-9`

- [ ] **Pas de manifest / PWA** — Pas de `manifest.json`, pas de service worker. Le jeu ne peut pas être installé en application ni joué hors-ligne.

- [ ] **`devicePixelRatio` cappé à 2** — Les écrans 3x (certains mobiles haut de gamme) auront un rendu légèrement flou. C'est un bon compromis perf mais pourrait être configurable.
  - Fichiers : `src/main.js:27`
