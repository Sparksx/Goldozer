# CLAUDE.md

## Project Overview

**Goldozer** is a browser-based 3D bulldozer game built with Three.js and Vite. Players drive a bulldozer to collect resources and sell them for upgrades. The game runs entirely client-side with no backend.

**Live site:** Deployed to GitHub Pages at `/Goldozer/` base path.

## Tech Stack

- **Language:** JavaScript (ES Modules, no TypeScript)
- **3D Engine:** Three.js (`three@^0.183.2`)
- **Build Tool:** Vite (`vite@^7.3.1`)
- **Deployment:** GitHub Actions → GitHub Pages (`gh-pages`)
- **No testing framework, linter, or formatter is configured**

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build to /dist
npm run preview   # Preview production build locally
npm run deploy    # Build + deploy to GitHub Pages
```

## Project Structure

```
src/
├── main.js        # Entry point, game loop, Three.js scene setup
├── bulldozer.js   # 3D bulldozer model, movement physics, camera follow
├── world.js       # Terrain generation, trees, rocks, buildings, lighting
├── resources.js   # Resource spawning and collection logic
├── economy.js     # Upgrade system, costs, selling mechanics
├── controls.js    # Keyboard (WASD/arrows) and mobile touch input
├── ui.js          # HUD, menus (pause, upgrades, settings), mobile UI
├── i18n.js        # Internationalization (French/English)
├── save.js        # LocalStorage persistence (base64 encoded)
├── version.js     # Numéro de version (source unique)
└── style.css      # All styling
index.html         # Entry HTML
vite.config.js     # Vite config (base: /Goldozer/)
CHANGELOG.md       # Historique des changements
```

## Architecture

### Module Pattern
Each file exports factory functions or objects for a single domain. Modules are composed in `main.js`:
- `createBulldozer()`, `createWorld()`, `createResources()` — factory functions returning Three.js groups and state
- `controls` — input state object polled each frame
- `gameState` — centralized mutable state object for economy/progress

### Game Loop
`main.js` runs a `requestAnimationFrame` loop with delta-time from `THREE.Clock`. Each frame: poll input → update physics → check collisions → update UI → render.

### Key Patterns
- **Seeded randomness** for deterministic world generation
- **Three.js disposal** — always call `geometry.dispose()` and `material.dispose()` when removing objects to prevent memory leaks
- **Camera follow** with lerp smoothing on the bulldozer
- **Exponential cost scaling** for upgrades (multipliers 1.6–2.0)

## Code Conventions

- **ES6 modules** — use `import`/`export`, no CommonJS
- **camelCase** for variables and functions
- **Factory functions** that return objects/groups (not classes)
- **Section comments** use dashed-line style: `// ─── Section Name ───`
- **No semicolons** (relies on ASI)
- **2-space indentation**
- **No TypeScript, no JSDoc** — keep it lightweight

## Game Controls

- **Desktop:** WASD or Arrow keys to move, E to sell, U for upgrades, Esc for pause
- **Mobile:** Virtual joystick + touch buttons

## i18n

Two languages supported: French (`fr`) and English (`en`). Translation keys are defined in `src/i18n.js`. When adding UI text, add keys to both language objects.

## Persistence

Game state is saved to LocalStorage as base64-encoded JSON via `src/save.js`. Saved data includes money, bucket contents, upgrade levels, bulldozer position/rotation, and collected resource IDs.

## Versioning & Changelog

Le projet utilise un système de versioning sémantique (semver) et un changelog.

### Règles obligatoires pour Claude

**À chaque modification du code, Claude DOIT :**

1. **Incrémenter la version** dans `src/version.js` :
   - **PATCH** (0.3.X) : bugfix, correction mineure
   - **MINOR** (0.X.0) : nouvelle fonctionnalité, amélioration notable
   - **MAJOR** (X.0.0) : changement majeur, breaking change

2. **Mettre à jour `CHANGELOG.md`** : ajouter une entrée datée dans la section `[Unreleased]` ou créer une nouvelle section versionnée avec les catégories appropriées :
   - `### Ajouté` — nouvelles fonctionnalités
   - `### Modifié` — changements de fonctionnalités existantes
   - `### Corrigé` — corrections de bugs
   - `### Supprimé` — fonctionnalités retirées

3. **Mettre à jour le changelog dans `src/ui.js`** : la fonction `getChangelogHTML()` doit refléter les changements pour que les joueurs puissent les voir dans le menu Crédits > Changelog du jeu.

### Fichiers concernés
- `src/version.js` — source unique du numéro de version (exporté comme `VERSION`)
- `CHANGELOG.md` — historique complet au format Keep a Changelog
- `src/ui.js` — `getChangelogHTML()` pour l'affichage in-game

## Deployment

Pushes to `main` trigger the GitHub Actions workflow (`.github/workflows/deploy.yml`) which runs `npm ci && npm run build` and deploys the `dist/` directory to GitHub Pages. The Vite base path is set to `/Goldozer/`.
