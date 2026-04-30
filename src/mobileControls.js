// Mobile virtual joystick overlay
// Left zone: analog joystick for movement
// Right zone: analog joystick for fire direction (amber)

const _leftJoy  = { x: 0, y: 0 };
const _rightJoy = { x: 0, y: 0 };

let _el = null;
let _leftBaseEl  = null, _leftThumbEl  = null;
let _rightBaseEl = null, _rightThumbEl = null;
let _leftTouchId  = null;
let _rightTouchId = null;

export function getJoystickVector()      { return _leftJoy; }
export function getRightJoystickVector() { return _rightJoy; }

export function showMobileControls() {
  if (_el) _el.classList.add('visible');
}

export function hideMobileControls() {
  if (_el) _el.classList.remove('visible');
}

export function initMobileControls() {
  if (_el) return;

  const app = document.getElementById('app');
  _el = document.createElement('div');
  _el.id = 'mobile-controls';
  _el.innerHTML = `
    <div id="mc-left-zone">
      <div id="mc-left-base"><div id="mc-left-thumb"></div></div>
    </div>
    <div id="mc-right-zone">
      <div id="mc-right-base"><div id="mc-right-thumb"></div></div>
    </div>
  `;
  app.appendChild(_el);

  _leftBaseEl   = document.getElementById('mc-left-base');
  _leftThumbEl  = document.getElementById('mc-left-thumb');
  _rightBaseEl  = document.getElementById('mc-right-base');
  _rightThumbEl = document.getElementById('mc-right-thumb');

  _el.addEventListener('touchstart',  _onStart,  { passive: false });
  _el.addEventListener('touchmove',   _onMove,   { passive: false });
  _el.addEventListener('touchend',    _onEnd,    { passive: false });
  _el.addEventListener('touchcancel', _onEnd,    { passive: false });
}

function _onStart(e) {
  e.preventDefault();
  const overlayRect = _el.getBoundingClientRect();
  const midX = overlayRect.left + overlayRect.width / 2;

  for (const t of e.changedTouches) {
    if (t.clientX < midX && _leftTouchId === null) {
      _leftTouchId = t.identifier;
      _moveThumb(t, _leftBaseEl, _leftThumbEl, _leftJoy);
    } else if (t.clientX >= midX && _rightTouchId === null) {
      _rightTouchId = t.identifier;
      _moveThumb(t, _rightBaseEl, _rightThumbEl, _rightJoy);
    }
  }
}

function _onMove(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === _leftTouchId) {
      _moveThumb(t, _leftBaseEl, _leftThumbEl, _leftJoy);
    } else if (t.identifier === _rightTouchId) {
      _moveThumb(t, _rightBaseEl, _rightThumbEl, _rightJoy);
    }
  }
}

function _onEnd(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === _leftTouchId) {
      _leftTouchId = null;
      _leftJoy.x = 0;
      _leftJoy.y = 0;
      _leftThumbEl.style.transform = 'translate(-50%, -50%)';
    } else if (t.identifier === _rightTouchId) {
      _rightTouchId = null;
      _rightJoy.x = 0;
      _rightJoy.y = 0;
      _rightThumbEl.style.transform = 'translate(-50%, -50%)';
    }
  }
}

function _moveThumb(touch, baseEl, thumbEl, joy) {
  const rect  = baseEl.getBoundingClientRect();
  const cx    = rect.left + rect.width  / 2;
  const cy    = rect.top  + rect.height / 2;
  const maxR  = (rect.width / 2) * 0.6;

  let dx = touch.clientX - cx;
  let dy = touch.clientY - cy;
  const dist = Math.hypot(dx, dy);

  if (dist > maxR) {
    dx = (dx / dist) * maxR;
    dy = (dy / dist) * maxR;
  }

  joy.x = dx / maxR;
  joy.y = dy / maxR;
  thumbEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}
