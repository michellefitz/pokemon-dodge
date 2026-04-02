import { W, H } from './constants.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let state = 'title';

function loop(ts) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  ctx.font = '24px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`state: ${state}`, W / 2, H / 2);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
