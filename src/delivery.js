import { deliverToObstacle, getNearbyChantier } from './zones.js'
import { deliverToBuilding, getNearbyBuildingPlot, getBuildingById } from './buildings.js'

const DELIVERY_RADIUS = 10

export function getDeliveryRadius() {
  return DELIVERY_RADIUS
}

// Check if bulldozer is near a delivery target (chantier or building plot)
export function checkDeliveryProximity(bx, bz) {
  // Check obstacle chantiers first
  const chantier = getNearbyChantier(bx, bz, DELIVERY_RADIUS)
  if (chantier) return chantier

  // Check building plots
  const plot = getNearbyBuildingPlot(bx, bz, DELIVERY_RADIUS)
  if (plot) return plot

  return null
}

// Check if the player has any deliverable resource for a target
export function canDeliverTo(target, bucket) {
  if (!target) return false

  if (target.type === 'obstacle') {
    return (bucket[target.resource] || 0) > 0
  }

  if (target.type === 'building') {
    for (const [res, needed] of Object.entries(target.cost)) {
      const current = target.delivered[res] || 0
      if (current >= needed) continue
      if ((bucket[res] || 0) > 0) return true
    }
  }

  return false
}

// Perform delivery: remove resources from bucket, add to target
// Returns { delivered, resourceType, targetName, justCompleted } or null
export function performDelivery(target, bucket) {
  if (!target) return null

  if (target.type === 'obstacle') {
    const resourceType = target.resource
    const available = bucket[resourceType] || 0
    if (available <= 0) return null

    const delivered = deliverToObstacle(target.zoneId, resourceType, available)
    if (delivered > 0) {
      bucket[resourceType] -= delivered
      const newTotal = target.delivered + delivered
      return {
        delivered,
        resourceType,
        targetName: `zone${target.zoneId}`,
        justCompleted: newTotal >= target.required,
      }
    }
    return null
  }

  if (target.type === 'building') {
    let totalDelivered = 0
    let deliveredType = null

    for (const [res, needed] of Object.entries(target.cost)) {
      const current = target.delivered[res] || 0
      const remaining = needed - current
      if (remaining <= 0) continue

      const available = bucket[res] || 0
      if (available <= 0) continue

      const delivered = deliverToBuilding(target.buildingId, res, available)
      if (delivered > 0) {
        bucket[res] -= delivered
        totalDelivered += delivered
        deliveredType = res
      }
    }

    if (totalDelivered > 0) {
      const building = getBuildingById(target.buildingId)
      return {
        delivered: totalDelivered,
        resourceType: deliveredType,
        targetName: target.name,
        justCompleted: building?.built || false,
      }
    }
    return null
  }

  return null
}
