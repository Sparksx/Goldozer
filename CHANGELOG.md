# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.9.3] - 2026-03-08

### Changed
- Rewrite all changelogs in English
- In-game changelog simplified to player-facing language (no technical details)
- Update CLAUDE.md with changelog language and tone rules

## [0.9.2] - 2026-03-08

### Changed
- Extract `seededRandom` and `roundRect` into shared `src/utils.js` (remove duplicates from world.js, resources.js, zones.js, buildings.js)
- Dynamically update HTML `lang` attribute when language changes
- Store `requestAnimationFrame` ID for proper cleanup via `cancelAnimationFrame`

## [0.9.1] - 2026-03-08

### Fixed
- Sound/Language menu back button now returns to correct parent menu (main or pause)
- Remove unused `resourceType` parameter from `getSellPriceMultiplier`
- iPadOS detection (Safari reports as desktop user-agent)

### Changed
- Reduce shadow camera bounds (250 → 120) for sharper shadows
- Cache sell points array and use squared distance in proximity check

### Added
- Persist language choice in localStorage
- Auto-save every 30 seconds

## [0.9.0] - 2026-03-07

### Changed
- Replace raycaster-based `getTerrainHeight` with pre-computed heightmap + bilinear interpolation
- Debounce `persistState()` to max 1 call/sec to reduce localStorage writes
- Share geometries and materials across all trees and rocks (fewer GPU allocations)
- Fix overlapping notifications with `clearTimeout` before showing new one
- Pre-allocate Vector3 objects in `updateCamera()` to reduce GC pressure

### Added
- Save data validation in `loadGame()` (handles corrupted saves gracefully)
- WebGL fallback message when browser doesn't support it

## [0.8.2] - 2026-03-07

### Changed
- Bulldozer enlarged (scale 1.6 → 2.2) for better visibility
- Central Depot moved to main road (0, -40) away from buildings

### Fixed
- Gas station inaccessible: delivery radius was too small relative to building collision radius
- Delivery radius increased (10 → 14) for all buildings
- Critical memory leak on restart: all geometries, materials and textures are now disposed on restart/new game
- Double `startGame()` call when loading a save: world is no longer created twice
- Resources array never cleared between games: old meshes are disposed and array is reset
- Convert `collectedIds` to Set for O(1) lookups instead of O(n) — prevents progressive performance degradation
- Handle WebGL context loss (`webglcontextlost`/`restored`): game shows message and auto-recovers instead of crashing

## [0.8.1] - 2026-03-07

### Fixed
- Sell point and gas station no longer overlap (depot moved to city center roadside)
- Warehouse text corrected: shows +10 capacity (instead of +5)
- Progressive building costs: earth only (lv.1), earth+stone (lv.2), earth+stone+wood (lv.3+)

## [0.8.0] - 2026-03-07

### Added
- 3D bulldozer model (Kenney asset via OBJ/MTL)
- Async model loading with placeholder during load
- Cast shadows on 3D model

### Changed
- Replace procedural bulldozer with external 3D model
- Refactor modelLoader to handle MTL/texture paths correctly

## [0.7.1] - 2026-03-07

### Added
- `public/models/` directory for external 3D assets (.obj/.mtl)
- Subdirectories: `vehicles/`, `buildings/`, `nature/`
- `src/modelLoader.js`: OBJ/MTL loader with cache

## [0.7.0] - 2026-03-07

### Changed
- Warehouse and gas station: first level costs only earth (15)
- Warehouse gives 10 capacity per level (instead of 5)
- Single sell point in city center (off the road)

### Removed
- South depot and south road
- Second sell point

## [0.6.3] - 2026-03-07

### Added
- 50% speed bonus when bulldozer drives on roads

## [0.6.2] - 2026-03-07

### Changed
- Roads rebuilt as continuous geometry (BufferGeometry) that follows terrain without visible seams

## [0.6.1] - 2026-03-07

### Fixed
- Pushed nuggets now recalculate elevation (no longer fly or sink into ground)
- Roads follow terrain elevation (no longer disappear under ground)

## [0.6.0] - 2026-03-07

### Added
- Building-based upgrades: Warehouse (+capacity), Gas Station (+speed), Market (+sell price), Equipment Shop (+collect radius)
- Multi-level buildings: each can be upgraded 5 times with scaling costs
- Equipment Shop (new functional building)
- Enlarged Dealership with glass showroom, parking and displayed vehicles
- Gas Station with multiple pumps (count increases with level)
- Wide main road (14 units) through city to new zones
- Sidewalks and road markings on main road
- Widened south road to South Depot

### Changed
- Upgrades are now tied to building construction instead of a menu
- Upgrade menu removed (pause and main)
- Mobile upgrade button removed
- Building layout reorganized along main road
- Building sizes adjusted to match their purpose

### Fixed
- Building markers/pins update after each partial delivery
- Zone unlock signs disappear when zone is unlocked
- Trees no longer spawn on main road

## [0.5.0] - 2026-03-07

### Added
- Collision system: bulldozer no longer passes through trees, rocks and buildings
- Slight bounce on collision to prevent getting stuck against obstacles
- Nugget pushing: when bucket is full, bulldozer pushes nuggets instead of collecting
- Pushed nuggets visually roll in the bulldozer's direction
- Dedicated `src/collision.js` module

### Changed
- `world.js` now registers all obstacle positions (trees, rocks, buildings, sell points)
- Game loop improved with collision checks after each movement

## [0.4.2] - 2026-03-07

### Fixed
- Critical terrain bug: PlaneGeometry local Y mapped to -worldZ after rotation, causing all zones, mountains and terrain colors to be inverted
- Terrain raycaster: add `updateMatrixWorld(true)` so raycaster accounts for ground mesh rotation

## [0.4.1] - 2026-03-07

### Fixed
- Smooth terrain: replace pseudo-random noise with proper value noise using bilinear interpolation and smoothstep (multi-octave fBm)
- Mountains too steep: wider mounds (radius 70) with smoothstep falloff
- Zone 2 hills: smooth transitions at zone boundaries with progressive blending
- Resources under terrain: nuggets placed higher (y + size * 0.9) with increased size for visibility
- Increased nugget emissive intensity (0.3 → 0.4)

## [0.4.0] - 2026-03-07

### Added
- Central city zone with flat terrain, roads and organized buildings
- Roads (north-south and east-west) with road markings in city
- Resources redesigned as colored nuggets (icosahedrons) with emissive glow
- Resource veins with automatic respawn (30-45s timer)
- Visual ground markers for resource veins
- 4 new WIP buildings: Dealership, Foundry, Gas Station, Laboratory
- 3D models for all new buildings
- South Depot (second sell point south of map)

### Changed
- Map enlarged (MAP_SIZE 200 → 400) for more exploration space
- Zone 2 (Hills) expanded: z 65-135 → z 90-250
- Zone 3 (Forest) expanded: z 145-200 → z 260-400
- Larger, more visible and more numerous resources
- Varied resource colors per type (4-color palettes)
- More trees and rocks across all zones
- Shadow and fog adjusted for larger map

### Fixed
- Floating resources: better terrain sampling (raycaster at y=100)
- Trees and buildings sinking into ground: terrain flattened in city
- Invisible/buried river: now follows terrain height
- Terrain flattened around river to prevent visual artifacts
- No resources spawn in city zone (radius exclusion)

## [0.3.0] - 2026-03-07

### Added
- Changelog and versioning system
- `CHANGELOG.md` file to track change history
- `src/version.js` module centralizing version number
- Version and changelog display in game credits menu
- Instructions in `CLAUDE.md` to maintain changelog on every change

## [0.2.0]

### Added
- Resource delivery system for construction sites and buildings
- Multiple zones (Plains, Hills, Forest) with progressive unlocking
- Building construction (House, Warehouse, Market, Sawmill) with effects
- Construction site obstacles (rockslide, river) unlocked with resources
- Multiple resources: earth, stone, wood
- Internationalization system (FR/EN)
- LocalStorage save with base64 encoding

## [0.1.0]

### Added
- Controllable 3D bulldozer (WASD/arrows + mobile joystick)
- Procedural world generation (terrain, trees, rocks)
- Resource collection and selling system
- Upgrade system (speed, capacity, power, radius)
- HUD with money and bucket display
- Main menu, pause, sound options, credits
- Mobile support (virtual joystick + touch buttons)
