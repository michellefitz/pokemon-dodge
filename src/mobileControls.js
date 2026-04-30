// Mobile virtual joystick controls
// Two side columns flanking the canvas: left = move, right = fire direction.
// Elements are inserted into <body> before/after #app so they never overlay gameplay.

import { initAudio } from './audio.js';

const _leftJoy  = { x: 0, y: 0 };
const _rightJoy = { x: 0, y: 0 };

let _leftZoneEl  = null, _rightZoneEl  = null;
let _leftBaseEl  = null, _leftThumbEl  = null;
let _rightBaseEl = null, _rightThumbEl = null;
let _leftTouchId  = null;
let _rightTouchId = null;

export function getJoystickVector()      { return _leftJoy; }
export function getRightJoystickVector() { return _rightJoy; }

export function showMobileControls() {
  _leftZoneEl?.classList.add('visible');
  _rightZoneEl?.classList.add('visible');
}

export function hideMobileControls() {
  _leftZoneEl?.classList.remove('visible');
  _rightZoneEl?.classList.remove('visible');
}

export function initMobileControls() {
  if (_leftZoneEl) return;

  _leftZoneEl = document.createElement('div');
  _leftZoneEl.id = 'mc-left-zone';
  _leftZoneEl.innerHTML = '<div id="mc-left-base"><div id="mc-left-thumb"></div></div>';

  _rightZoneEl = document.createElement('div');
  _rightZoneEl.id = 'mc-right-zone';
  _rightZoneEl.innerHTML = '<div id="mc-right-base"><div id="mc-right-thumb"></div></div>';

  // Insert both zones inside #app so they overlay the canvas
  const app = document.getElementById('app');
  app.appendChild(_leftZoneEl);
  app.appendChild(_rightZoneEl);

  _leftBaseEl   = document.getElementById('mc-left-base');
  _leftThumbEl  = document.getElementById('mc-left-thumb');
  _rightBaseEl  = document.getElementById('mc-right-base');
  _rightThumbEl = document.getElementById('mc-right-thumb');

  // Left zone touch handlers
  _leftZoneEl.addEventListener('touchstart', (e) => {
    e.preventDefault();
    initAudio(); // resume audio context if iOS suspended it
    for (const t of e.changedTouches) {
      if (_leftTouchId === null) {
        _leftTouchId = t.identifier;
        _moveThumb(t, _leftBaseEl, _leftThumbEl, _leftJoy);
      }
    }
  }, { passive: false });

  _leftZoneEl.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === _leftTouchId) {
        _moveThumb(t, _leftBaseEl, _leftThumbEl, _leftJoy);
      }
    }
  }, { passive: false });

  _leftZoneEl.addEventListener('touchend',    _makeLeftEnd(), { passive: false });
  _leftZoneEl.addEventListener('touchcancel', _makeLeftEnd(), { passive: false });

  // Right zone touch handlers
  _rightZoneEl.addEventListener('touchstart', (e) => {
    e.preventDefault();
    initAudio();
    for (const t of e.changedTouches) {
      if (_rightTouchId === null) {
        _rightTouchId = t.identifier;
        _moveThumb(t, _rightBaseEl, _rightThumbEl, _rightJoy);
      }
    }
  }, { passive: false });

  _rightZoneEl.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === _rightTouchId) {
        _moveThumb(t, _rightBaseEl, _rightThumbEl, _rightJoy);
      }
    }
  }, { passive: false });

  _rightZoneEl.addEventListener('touchend',    _makeRightEnd(), { passive: false });
  _rightZoneEl.addEventListener('touchcancel', _makeRightEnd(), { passive: false });
}

function _makeLeftEnd() {
  return function(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === _leftTouchId) {
        _leftTouchId = null;
        _leftJoy.x = 0;
        _leftJoy.y = 0;
        if (_leftThumbEl) _leftThumbEl.style.transform = 'translate(-50%, -50%)';
      }
    }
  };
}

function _makeRightEnd() {
  return function(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === _rightTouchId) {
        _rightTouchId = null;
        _rightJoy.x = 0;
        _rightJoy.y = 0;
        if (_rightThumbEl) _rightThumbEl.style.transform = 'translate(-50%, -50%)';
      }
    }
  };
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
