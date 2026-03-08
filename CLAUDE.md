# CLAUDE.md

## Project Overview

**Goldozer** is a browser-based 3D bulldozer game built with Three.js and Vite. Players drive a bulldozer to collect resources (terre, pierre, bois), deliver them to unlock zones and construct buildings, and sell them for progression. The game runs entirely client-side with no backend.

**Current version:** `0.8.1`
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
├── main.js         # Entry point, game loop, Three.js scene setup
├── bulldozer.js    # 3D bulldozer model, movement physics, camera follow
├── modelLoader.js  # OBJ/MTL async model loader with caching
├── world.js        # Terrain generation, city, roads, buildings, lighting
├── resources.js    # Resource spawning, collection, vein respawn logic
├── economy.js      # Game state, money, bucket, selling mechanics
├── controls.js     # Keyboard (WASD/arrows) and mobile touch/joystick input
├── ui.js           # HUD, menus (pause, upgrades, settings), mobile UI
├── zones.js        # Zone definitions, progression, obstacle barriers
├── buildings.js    # Building upgrades, multi-level construction, effect bonuses
├── collision.js    # Obstacle collision detection, resource push physics
├── delivery.js     # Delivery system for chantiers and building plots
├── i18n.js         # Internationalization (French/English, 150+ keys)
├── save.js         # LocalStorage persistence (base64 encoded)
├── version.js      # Version number (single source of truth)
└── style.css       # All styling
public/
└── models/         # External 3D assets (OBJ/MTL)
    ├── vehicles/   # Bulldozer model
    ├── buildings/  # (reserved)
    └── nature/     # (reserved)
index.html          # Entry HTML
vite.config.js      # Vite config (base: /Goldozer/)
CHANGELOG.md        # Historique des changements
```

## Architecture

### Module Pattern
Each file exports factory functions or objects for a single domain. Modules are composed in `main.js`:
- `createBulldozer()`, `createWorld()`, `createResources()` — factory functions returning Three.js groups and state
- `createGameState()`, `createZonesState()`, `createBuildingsState()` — state factories with optional saved data
- `createControls()` — input state object polled each frame
- `gameState` — centralized mutable state object for economy/progress

### Module Dependency Graph
```
main.js
├── world.js          (terrain, roads, obstacles, sell points)
├── bulldozer.js      (3D model, physics, camera)
│   └── modelLoader.js  (async OBJ/MTL loading with cache)
├── resources.js      (spawning, collection, veins)
├── economy.js        (game state, money, bucket, selling)
├── controls.js       (keyboard + joystick input)
├── ui.js             (HUD, menus, mobile)
│   └── i18n.js
├── zones.js          (zone progression, barriers)
│   └── i18n.js
├── buildings.js      (building upgrades, bonuses)
│   └── i18n.js
├── collision.js      (obstacle & resource collision physics)
├── delivery.js       (chantier & building delivery)
│   ├── zones.js
│   └── buildings.js
├── save.js           (localStorage persistence)
├── i18n.js           (translations)
└── version.js        (VERSION constant)
```

### Game Loop
`main.js` runs a `requestAnimationFrame` loop with delta-time from `THREE.Clock`. Each frame:
1. Poll input (keyboard/joystick)
2. Update bulldozer physics (acceleration, rotation, position)
3. Resolve obstacle collisions (push-out + bounce)
4. Check resource collection (or push if bucket full)
5. Check delivery/sell point proximity
6. Handle action inputs (sell, deliver)
7. Update HUD
8. Render scene

### Key Patterns
- **Seeded randomness** for deterministic world generation
- **Three.js disposal** — always call `geometry.dispose()` and `material.dispose()` when removing objects to prevent memory leaks
- **Camera follow** with lerp smoothing (factor 0.04) on the bulldozer — "balloon on string" feel
- **Exponential cost scaling** for building upgrades (multipliers 1.6–2.0)
- **Multi-resource bucket** — `{ terre: #, pierre: #, bois: # }` object, not a single number
- **Raycasting for terrain height** — `getTerrainHeight(x, z)` uses `THREE.Raycaster` to sample the mesh
- **Terrain coordinate mapping** — PlaneGeometry local Y maps to -worldZ after rotation (critical quirk, documented in `world.js`)

## Game Systems

### Resources
Three types: **terre** (earth, value 1), **pierre** (stone, value 3), **bois** (wood, value 2). Resources exist as:
- **Scattered resources** — 1000+ persistent nuggets placed per zone
- **Mountain clusters** — 9 static clusters per zone (40 resources each)
- **Veins** — 10 respawning clusters (14-second respawn timer)

### Zones
- **Zone 1 (Plains):** z -400 to 80, terre resources, unlocked by default
- **Zone 2 (Hills):** z 90 to 250, pierre resources, locked (requires 50 terre at rockslide)
- **Zone 3 (Forest):** z 260 to 400, bois resources, locked (requires 40 pierre at river)

Zone obstacles (rockslide, river) act as physical barriers. Players deliver resources to chantier markers to unlock zones.

### Buildings
5 buildings along the main avenue, upgradeable up to 5 levels:
1. **Entrepôt** (Warehouse): +10 capacity/level, cost scale 1.6x
2. **Station-Service** (Gas Station): +1 speed/level, cost scale 1.7x
3. **Marché** (Market): +10% sell price/level, cost scale 1.8x
4. **Magasin d'Équipement** (Equipment Shop): +1.5 collect radius/level, cost scale 1.6x
5. **Concession** (Dealership): WIP (future vehicle upgrades)

Progressive costs: level 1 = terre only, level 2 = terre+pierre, level 3+ = all three resource types.

### Delivery System
Players deliver resources by pressing E near a target. Two delivery target types:
- **Chantiers** (zone obstacles): single resource type, progress tracked visually
- **Building plots**: multi-resource costs, multi-level construction

### Collision
Circle-circle collision between bulldozer (radius 2.5) and obstacles. Push-out with -0.3 velocity bounce. When bucket is full, resources are pushed instead of collected with visual rolling.

## Code Conventions

- **ES6 modules** — use `import`/`export`, no CommonJS
- **camelCase** for variables and functions
- **Factory functions** that return objects/groups (not classes)
- **Section comments** use dashed-line style: `// ─── Section Name ───`
- **No semicolons** (relies on ASI)
- **2-space indentation**
- **No TypeScript, no JSDoc** — keep it lightweight

## Game Controls

- **Desktop:** WASD or Arrow keys to move, E to sell/deliver, Esc for pause
- **Mobile:** Virtual joystick (analog intensity, deadzone 0.15) + touch buttons (sell, deliver)

## i18n

Two languages supported: French (`fr`) and English (`en`). 150+ translation keys defined in `src/i18n.js`. When adding UI text, add keys to both language objects. Use `t(key, params)` for translation with optional placeholder interpolation.

## Persistence

Game state is saved to `localStorage['goldozer_save']` as base64-encoded JSON via `src/save.js`. Saved data includes: money, bucket contents, collectedIds (persistent resources), playerPos/playerRot, zone unlock progress, building levels and delivered resources.

## Versioning & Changelog

The project uses semantic versioning (semver) and a changelog.

### Mandatory rules for Claude

**On every code change, Claude MUST:**

1. **Increment the version** in `src/version.js`:
   - **PATCH** (0.3.X): bugfix, minor fix
   - **MINOR** (0.X.0): new feature, notable improvement
   - **MAJOR** (X.0.0): breaking change

2. **Update `CHANGELOG.md`** (in English): add a dated entry with appropriate categories:
   - `### Added` — new features
   - `### Changed` — changes to existing features
   - `### Fixed` — bug fixes
   - `### Removed` — removed features

3. **Update the in-game changelog in `src/ui.js`**: the `getChangelogHTML()` function must reflect changes so players can see them in the Credits > Changelog menu.

### Changelog language and tone

- **`CHANGELOG.md`**: Written in **English**. Technical and detailed — aimed at developers.
- **In-game changelog (`getChangelogHTML()`)**: Written in **English**. Player-facing and concise — only mention what the player can see or feel (e.g. "Better shadows", "Auto-save added"). Do NOT expose internal technical details (e.g. "refactored utils", "replaced raycaster with heightmap", "debounced persistState"). Keep entries short and simple.

### Fichiers concernés
- `src/version.js` — source unique du numéro de version (exporté comme `VERSION`)
- `CHANGELOG.md` — historique complet au format Keep a Changelog
- `src/ui.js` — `getChangelogHTML()` pour l'affichage in-game

## Deployment

Pushes to `main` trigger the GitHub Actions workflow (`.github/workflows/deploy.yml`) which runs `npm ci && npm run build` and deploys the `dist/` directory to GitHub Pages. The Vite base path is set to `/Goldozer/`.
