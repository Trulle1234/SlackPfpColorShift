// paint‑once‑per‑minute.js
const { WebClient }    = require('@slack/web-api');
const { createCanvas, loadImage } = require('canvas');

const HALF_DAY_S   = 12 * 3600;
const START_HUE    = 43.3;      // your base hue at 00:00 & 12:00
const SPEED_FACTOR = 1;         // 1 = real‑time (2 cycles/day), 2 = twice as fast, etc.

module.exports = async (req, res) => {
  // Always load image and create canvas
  const img    = await loadImage('./pfp.png');
  const canvas = createCanvas(img.width, img.height);
  const ctx    = canvas.getContext('2d');

  const now = new Date();
  const secsSinceBoundary =
    (now.getHours() % 12) * 3600 +
    now.getMinutes() * 60 +
    now.getSeconds();

  const frac = (secsSinceBoundary / HALF_DAY_S) * SPEED_FACTOR;
  const hue  = (START_HUE + frac * 360) % 360;

  ctx.fillStyle = `hsl(${hue.toFixed(1)},100%,90%)`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  try {
    const slack = new WebClient(process.env.SLACK_TOKEN);
    const result = await slack.users.setPhoto({
      image: canvas.createPNGStream()
    });
    res.status(200).send(`OK: hue ${hue.toFixed(1)} (ok=${result.ok})`);
  } catch (err) {
    res.status(500).send("Slack API error: " + (err.data || err));
  }
};
