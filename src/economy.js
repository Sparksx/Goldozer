import { saveGame, loadGame } from './save.js'
import { getResourceValue } from './resources.js'
import { getSellPriceMultiplier, getCapacityBonus } from './buildings.js'
import { getZoneSaveData } from './zones.js'
import { getBuildingSaveData } from './buildings.js'

const BASE_PRICE_PER_UNIT = 10

const UPGRADE_DEFS = {
  speed: {
    maxLevel: 10,
    baseCost: 50,
    costMultiplier: 1.8,
  },
  capacity: {
    maxLevel: 10,
    baseCost: 40,
    costMultiplier: 1.7,
  },
  power: {
    maxLevel: 10,
    baseCost: 100,
    costMultiplier: 2.0,
  },
  collectRadius: {
    maxLevel: 10,
    baseCost: 60,
    costMultiplier: 1.6,
  },
}

export function getUpgradeDefs() {
  return UPGRADE_DEFS
}

export function getUpgradeCost(type, currentLevel) {
  const def = UPGRADE_DEFS[type]
  if (!def || currentLevel >= def.maxLevel) return Infinity
  return Math.floor(def.baseCost * Math.pow(def.costMultiplier, currentLevel))
}

export function getBaseCapacity() {
  return 10
}

export function getMaxCapacity(upgrades) {
  return getBaseCapacity() + upgrades.capacity * 5 + getCapacityBonus()
}

// ─── Bucket is now multi-resource ───────────────────

function emptyBucket() {
  return { terre: 0, pierre: 0, bois: 0 }
}

function getBucketTotal(bucket) {
  if (typeof bucket === 'number') return bucket // backward compat
  return (bucket.terre || 0) + (bucket.pierre || 0) + (bucket.bois || 0)
}

export function getTotalInBucket(bucket) {
  return getBucketTotal(bucket)
}

export function createGameState(saved = null) {
  if (saved) {
    // Handle backward compatibility: old saves have bucket as number
    let bucket = saved.bucket
    if (typeof bucket === 'number') {
      bucket = { terre: bucket, pierre: 0, bois: 0 }
    } else {
      bucket = {
        terre: bucket?.terre || 0,
        pierre: bucket?.pierre || 0,
        bois: bucket?.bois || 0,
      }
    }

    return {
      money: saved.money || 0,
      bucket,
      upgrades: {
        speed: saved.upgrades?.speed || 0,
        capacity: saved.upgrades?.capacity || 0,
        power: saved.upgrades?.power || 0,
        collectRadius: saved.upgrades?.collectRadius || 0,
      },
      collectedIds: saved.collectedIds || [],
      playerPos: saved.playerPos || { x: 0, z: 0 },
      playerRot: saved.playerRot || 0,
    }
  }

  return {
    money: 0,
    bucket: emptyBucket(),
    upgrades: {
      speed: 0,
      capacity: 0,
      power: 0,
      collectRadius: 0,
    },
    collectedIds: [],
    playerPos: { x: 0, z: 0 },
    playerRot: 0,
  }
}

export function sellResources(state) {
  const total = getBucketTotal(state.bucket)
  if (total <= 0) return 0

  let earnings = 0
  for (const [type, count] of Object.entries(state.bucket)) {
    if (count <= 0) continue
    const baseValue = getResourceValue(type)
    const multiplier = getSellPriceMultiplier(type)
    earnings += Math.floor(count * baseValue * BASE_PRICE_PER_UNIT * multiplier)
  }

  state.money += earnings
  state.bucket = emptyBucket()
  persistState(state)
  return earnings
}

export function buyUpgrade(state, type) {
  const cost = getUpgradeCost(type, state.upgrades[type])
  if (cost === Infinity) return false
  if (state.money < cost) return false
  state.money -= cost
  state.upgrades[type]++
  persistState(state)
  return true
}

export function addToBucket(state, type, count) {
  const max = getMaxCapacity(state.upgrades)
  const total = getBucketTotal(state.bucket)
  const space = max - total
  const added = Math.min(count, space)
  state.bucket[type] = (state.bucket[type] || 0) + added
  return added
}

export function persistState(state) {
  saveGame({
    money: state.money,
    bucket: state.bucket,
    upgrades: state.upgrades,
    collectedIds: state.collectedIds,
    playerPos: state.playerPos,
    playerRot: state.playerRot,
    zones: getZoneSaveData(),
    buildings: getBuildingSaveData(),
  })
}

export function getPricePerUnit() {
  return BASE_PRICE_PER_UNIT
}
