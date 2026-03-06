export function createControls() {
  const state = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    action: false, // E key or sell button
    upgrade: false, // U key
    menu: false, // Escape key
  };

  // Keyboard controls
  const keyMap = {
    KeyW: 'forward', ArrowUp: 'forward',
    KeyS: 'backward', ArrowDown: 'backward',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
  };

  function onKeyDown(e) {
    if (keyMap[e.code]) {
      state[keyMap[e.code]] = true;
      e.preventDefault();
    }
    if (e.code === 'KeyE') {
      state.action = true;
    }
    if (e.code === 'KeyU') {
      state.upgrade = true;
    }
    if (e.code === 'Escape') {
      state.menu = true;
    }
  }

  function onKeyUp(e) {
    if (keyMap[e.code]) {
      state[keyMap[e.code]] = false;
      e.preventDefault();
    }
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // Consume one-shot actions
  function consumeAction() {
    if (state.action) {
      state.action = false;
      return true;
    }
    return false;
  }

  function consumeUpgrade() {
    if (state.upgrade) {
      state.upgrade = false;
      return true;
    }
    return false;
  }

  function consumeMenu() {
    if (state.menu) {
      state.menu = false;
      return true;
    }
    return false;
  }

  return {
    state,
    consumeAction,
    consumeUpgrade,
    consumeMenu,
    setFromJoystick(dx, dy) {
      // dy negative = forward, positive = backward
      // dx negative = left, positive = right
      const deadzone = 0.2;
      state.forward = dy < -deadzone;
      state.backward = dy > deadzone;
      state.left = dx < -deadzone;
      state.right = dx > deadzone;
    },
    resetJoystick() {
      state.forward = false;
      state.backward = false;
      state.left = false;
      state.right = false;
    },
  };
}
