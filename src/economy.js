import { saveGame, loadGame } from './save.js';

const PRICE_PER_UNIT = 10;

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
};

export function getUpgradeDefs() {
  return UPGRADE_DEFS;
}

export function getUpgradeCost(type, currentLevel) {
  const def = UPGRADE_DEFS[type];
  if (!def || currentLevel >= def.maxLevel) return Infinity;
  return Math.floor(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
}

export function getBaseCapacity() {
  return 10;
}

export function getMaxCapacity(upgrades) {
  return getBaseCapacity() + upgrades.capacity * 5;
}

export function createGameState(saved = null) {
  if (saved) {
    return {
      money: saved.money || 0,
      bucket: saved.bucket || 0,
      upgrades: {
        speed: saved.upgrades?.speed || 0,
        capacity: saved.upgrades?.capacity || 0,
        power: saved.upgrades?.power || 0,
        collectRadius: saved.upgrades?.collectRadius || 0,
      },
      collectedIds: saved.collectedIds || [],
      playerPos: saved.playerPos || { x: 0, z: 0 },
      playerRot: saved.playerRot || 0,
    };
  }

  return {
    money: 0,
    bucket: 0,
    upgrades: {
      speed: 0,
      capacity: 0,
      power: 0,
      collectRadius: 0,
    },
    collectedIds: [],
    playerPos: { x: 0, z: 0 },
    playerRot: 0,
  };
}

export function sellResources(state) {
  if (state.bucket <= 0) return 0;
  const earnings = state.bucket * PRICE_PER_UNIT;
  state.money += earnings;
  const sold = state.bucket;
  state.bucket = 0;
  persistState(state);
  return sold;
}

export function buyUpgrade(state, type) {
  const cost = getUpgradeCost(type, state.upgrades[type]);
  if (cost === Infinity) return false;
  if (state.money < cost) return false;
  state.money -= cost;
  state.upgrades[type]++;
  persistState(state);
  return true;
}

export function addToBucket(state, count) {
  const max = getMaxCapacity(state.upgrades);
  const space = max - state.bucket;
  const added = Math.min(count, space);
  state.bucket += added;
  return added;
}

export function persistState(state) {
  saveGame({
    money: state.money,
    bucket: state.bucket,
    upgrades: state.upgrades,
    collectedIds: state.collectedIds,
    playerPos: state.playerPos,
    playerRot: state.playerRot,
  });
}

export function getPricePerUnit() {
  return PRICE_PER_UNIT;
}
