// Mobile gamepad overlay — d-pad + fire buttons
// Injects HTML into #app and tracks touch state.

const _dpad = { up: false, down: false, left: false, right: false };
let _fire = false;
let _el = null;

export function getDpadState() { return _dpad; }
export function isMobileFireActive() { return _fire; }

export function showMobileControls() {
  if (_el) _el.classList.add('visible');
}

export function hideMobileControls() {
  if (_el) _el.classList.remove('visible');
}

function press(key, down) {
  return function (e) {
    e.preventDefault();
    if (key === 'fire') {
      _fire = down;
    } else {
      _dpad[key] = down;
    }
    // Visual pressed state
    if (down) e.currentTarget.classList.add('pressed');
    else e.currentTarget.classList.remove('pressed');
  };
}

function bind(el, key) {
  el.addEventListener('touchstart',  press(key, true),  { passive: false });
  el.addEventListener('touchend',    press(key, false), { passive: false });
  el.addEventListener('touchcancel', press(key, false), { passive: false });
}

export function initMobileControls() {
  if (_el) return;

  const app = document.getElementById('app');

  _el = document.createElement('div');
  _el.id = 'mobile-controls';
  _el.innerHTML = `
    <div id="mc-dpad">
      <button class="mc-dpad-btn" id="mc-up">&#9650;</button>
      <div class="mc-dpad-row">
        <button class="mc-dpad-btn" id="mc-left">&#9664;</button>
        <div class="mc-dpad-center"></div>
        <button class="mc-dpad-btn" id="mc-right">&#9654;</button>
      </div>
      <button class="mc-dpad-btn" id="mc-down">&#9660;</button>
    </div>
    <div id="mc-fire">
      <button class="mc-fire-btn" id="mc-btn-b">B</button>
      <button class="mc-fire-btn" id="mc-btn-a">A</button>
    </div>
  `;

  app.appendChild(_el);

  bind(document.getElementById('mc-up'),    'up');
  bind(document.getElementById('mc-down'),  'down');
  bind(document.getElementById('mc-left'),  'left');
  bind(document.getElementById('mc-right'), 'right');
  bind(document.getElementById('mc-btn-a'), 'fire');
  bind(document.getElementById('mc-btn-b'), 'fire');
}
