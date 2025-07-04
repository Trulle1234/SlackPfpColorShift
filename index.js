const { WebClient, ErrorCode } = require('@slack/web-api');
const { createCanvas, loadImage } = require('canvas');

const INTERVAL_MS        = 1000;   
const HALF_DAY_S         = 12 * 3600;
const START_HUE          = 43.3;   

const SPEED_FACTOR       = 1;

const MAX_UPDATES_PER_MIN = 1;

const HUE_THRESHOLD      = (SPEED_FACTOR / 2) / MAX_UPDATES_PER_MIN;

let canvas, ctx, img, lastHue;

(async () => {
  img    = await loadImage('./pfp.png');
  canvas = createCanvas(img.width, img.height);
  ctx    = canvas.getContext('2d');
  lastHue = NaN; 

  tick();
  setInterval(tick, INTERVAL_MS);
})();

const slack = new WebClient(process.env.SLACK_TOKEN);

async function tick() {
  const now  = new Date();
  const secs = now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds();
  const sweep = ((secs % HALF_DAY_S) / HALF_DAY_S) * 360 * SPEED_FACTOR;
  const hue   = (START_HUE + sweep) % 360;

  if (isNaN(lastHue) || Math.abs(hue - lastHue) >= HUE_THRESHOLD) {
    lastHue = hue;

    ctx.fillStyle = `hsl(${hue.toFixed(1)},100%,90%)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    try {
      await slack.users.setPhoto({ image: canvas.createPNGStream() });
      console.log(`[${now.toLocaleTimeString()}] → hue ${hue.toFixed(1)}`);
    } catch (err) {
      if (err.code === ErrorCode.RateLimitedError) {
        console.warn(`Rate limited! retrying in ${err.retryAfter}s`);
      } else {
        console.error("Slack API error:", err.data || err);
      }
    }
  }
}