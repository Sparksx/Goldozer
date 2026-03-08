const SAVE_KEY = 'goldozer_save';

export function saveGame(data) {
  try {
    const json = JSON.stringify(data);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    localStorage.setItem(SAVE_KEY, encoded);
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
}

export function loadGame() {
  try {
    const encoded = localStorage.getItem(SAVE_KEY);
    if (!encoded) return null;
    const json = decodeURIComponent(escape(atob(encoded)));
    const data = JSON.parse(json);
    // Validate essential fields
    if (typeof data !== 'object' || data === null) return null;
    if (typeof data.money !== 'number' || !isFinite(data.money) || data.money < 0) {
      data.money = 0;
    }
    if (!data.playerPos || typeof data.playerPos.x !== 'number' || typeof data.playerPos.z !== 'number') {
      data.playerPos = { x: 0, z: 0 };
    }
    if (typeof data.playerRot !== 'number' || !isFinite(data.playerRot)) {
      data.playerRot = 0;
    }
    if (!Array.isArray(data.collectedIds)) {
      data.collectedIds = [];
    }
    return data;
  } catch (e) {
    console.warn('Failed to load save:', e);
    return null;
  }
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}
