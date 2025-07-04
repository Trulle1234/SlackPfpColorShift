// paint‑once‑per‑minute.js
const { WebClient }    = require('@slack/web-api');
const { createCanvas, loadImage } = require('canvas');

const HALF_DAY_S   = 12 * 3600;
const START_HUE    = 43.3;      // your base hue at 00:00 & 12:00
const SPEED_FACTOR = 1;         // 1 = real‑time (2 cycles/day), 2 = twice as fast, etc.

let canvas, ctx, img;

async function tick() {
  // 1) load your image once
  if (!img) {
    img    = await loadImage('./pfp.png');
    canvas = createCanvas(img.width, img.height);
    ctx    = canvas.getContext('2d');
  }

  // 2) compute seconds since the last 00:00 or 12:00
  const now = new Date();
  const secsSinceBoundary =
    (now.getHours() % 12) * 3600 +
    now.getMinutes() * 60 +
    now.getSeconds();

  // 3) fraction of half‑day elapsed, then scaled by SPEED_FACTOR
  const frac = (secsSinceBoundary / HALF_DAY_S) * SPEED_FACTOR;
  const hue  = (START_HUE + frac * 360) % 360;

  // 4) paint
  ctx.fillStyle = `hsl(${hue.toFixed(1)},100%,90%)`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  // 5) push to Slack
  try {
    const slack = new WebClient(process.env.SLACK_TOKEN);
    const res   = await slack.users.setPhoto({
      image: canvas.createPNGStream()
    });
    console.log(`${now.toLocaleTimeString()} → hue ${hue.toFixed(1)} (ok=${res.ok})`);
  } catch (err) {
    console.error("Slack API error:", err.data || err);
  }
}

// run once immediately, then every 60 000 ms (1 min)
tick();
setInterval(tick, 60_000);
