import { saveGame, loadGame } from './save.js'
import { getResourceValue } from './resources.js'
import { getSellPriceMultiplier, getCapacityBonus, getSpeedBonus, getCollectRadiusBonus } from './buildings.js'
import { getZoneSaveData } from './zones.js'
import { getBuildingSaveData } from './buildings.js'

const BASE_PRICE_PER_UNIT = 10

export function getBaseCapacity() {
  return 10
}

export function getMaxCapacity() {
  return getBaseCapacity() + getCapacityBonus()
}

export function getSpeedLevel() {
  return getSpeedBonus()
}

export function getCollectRadiusLevel() {
  return getCollectRadiusBonus()
}

// ─── Bucket is now multi-resource ───────────────────

function emptyBucket() {
  return { terre: 0, pierre: 0, bois: 0 }
}

function getBucketTotal(bucket) {
  if (typeof bucket === 'number') return bucket
  return (bucket.terre || 0) + (bucket.pierre || 0) + (bucket.bois || 0)
}

export function getTotalInBucket(bucket) {
  return getBucketTotal(bucket)
}

export function createGameState(saved = null) {
  if (saved) {
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
      collectedIds: saved.collectedIds || [],
      playerPos: saved.playerPos || { x: 0, z: 0 },
      playerRot: saved.playerRot || 0,
    }
  }

  return {
    money: 0,
    bucket: emptyBucket(),
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

export function addToBucket(state, type, count) {
  const max = getMaxCapacity()
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
