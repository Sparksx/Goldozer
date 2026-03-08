// ─── Game Constants ──────────────────────────────
// Centralized gameplay configuration values.

// Map
export const MAP_SIZE = 400
export const CITY_RADIUS = 50
export const CITY_CENTER = { x: 0, z: 0 }
export const HEIGHTMAP_RES = 129

// Bulldozer physics
export const BULLDOZER_RADIUS = 2.5
export const MAX_SPEED = 15
export const ACCELERATION = 20
export const DECELERATION = 15
export const TURN_SPEED = 2.0
export const ROAD_SPEED_BONUS = 1.5

// Camera
export const CAMERA_HEIGHT = 12
export const CAMERA_DISTANCE = 18
export const CAMERA_LERP = 0.04
export const CAMERA_LOOK_AHEAD = 8
export const CAMERA_LOOK_HEIGHT = 2

// Interaction radii
export const SELL_RADIUS = 12
export const DELIVERY_RADIUS = 14
export const PUSH_RADIUS = 3.5
export const PUSH_STRENGTH = 12
export const BASE_COLLECT_RADIUS = 4

// Collision
export const BOUNCE_FACTOR = -0.3

// Economy
export const BASE_PRICE_PER_UNIT = 10
export const BASE_CAPACITY = 10
export const PERSIST_DEBOUNCE_MS = 1000
export const AUTO_SAVE_INTERVAL = 30

// Resources
export const MOUNTAIN_RADIUS = 22
export const MOUNTAIN_RESOURCE_COUNT = 40

// Controls
export const JOYSTICK_DEADZONE = 0.15

// Rendering
export const MAX_DELTA = 0.05
