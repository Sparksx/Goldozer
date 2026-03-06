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
    return JSON.parse(json);
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
