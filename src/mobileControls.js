// Mobile virtual joystick overlay
// Left zone: analog joystick for movement
// Right zone: fire button (tap/hold)

const _joystick = { x: 0, y: 0 };
let _fire = false;
let _el = null;
let _baseEl = null;
let _thumbEl = null;
let _fireEl = null;
let _leftTouchId = null;
let _rightTouchId = null;

export function getJoystickVector() { return _joystick; }
export function isMobileFireActive() { return _fire; }

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
      <div id="mc-base"><div id="mc-thumb"></div></div>
    </div>
    <div id="mc-right-zone">
      <div id="mc-fire"></div>
    </div>
  `;
  app.appendChild(_el);

  _baseEl  = document.getElementById('mc-base');
  _thumbEl = document.getElementById('mc-thumb');
  _fireEl  = document.getElementById('mc-fire');

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
      _moveThumb(t);
    } else if (t.clientX >= midX && _rightTouchId === null) {
      _rightTouchId = t.identifier;
      _fire = true;
      _fireEl.classList.add('pressed');
    }
  }
}

function _onMove(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === _leftTouchId) _moveThumb(t);
  }
}

function _onEnd(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === _leftTouchId) {
      _leftTouchId = null;
      _joystick.x = 0;
      _joystick.y = 0;
      _thumbEl.style.transform = 'translate(-50%, -50%)';
    } else if (t.identifier === _rightTouchId) {
      _rightTouchId = null;
      _fire = false;
      _fireEl.classList.remove('pressed');
    }
  }
}

function _moveThumb(touch) {
  const rect = _baseEl.getBoundingClientRect();
  const cx = rect.left + rect.width  / 2;
  const cy = rect.top  + rect.height / 2;
  const maxR = (rect.width / 2) * 0.6;

  let dx = touch.clientX - cx;
  let dy = touch.clientY - cy;
  const dist = Math.hypot(dx, dy);

  if (dist > maxR) {
    dx = (dx / dist) * maxR;
    dy = (dy / dist) * maxR;
  }

  _joystick.x = dx / maxR;
  _joystick.y = dy / maxR;
  _thumbEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}
