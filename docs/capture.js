// Renders every layout (collapsed and expanded) with the demo data and saves PNGs to docs/screenshots,
// plus an animated demo GIF of the hanging critter swinging and then being clicked open.
// Run with: npm run screenshots
const { app, BrowserWindow } = require('electron');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const path = require('path');
const fs = require('fs');

const LAYOUTS = ['pill', 'dot', 'critter', 'rings', 'battery', 'terminal'];
const SCALE = 2; // retina-crisp images
const out = path.join(__dirname, 'screenshots');
const widget = path.join(__dirname, '..', 'widget.html');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.disableHardwareAcceleration();
app.on('window-all-closed', () => {}); // keep running between captures; we quit when done

async function screenshots() {
  for (const layout of LAYOUTS) {
    for (const open of [false, true]) {
      const w = new BrowserWindow({
        show: false, width: 400 * SCALE, height: 520 * SCALE, frame: false, transparent: true,
        backgroundColor: '#00000000', webPreferences: { offscreen: true, zoomFactor: SCALE },
      });
      await w.loadFile(widget, { query: open ? { layout, open: '1' } : { layout } });
      await w.webContents.insertCSS('*, *::before, *::after { animation: none !important; transition: none !important; }');
      await wait(500); // demo data arrives after 100ms; give layout and fonts time to settle
      const [width, height] = await w.webContents.executeJavaScript(
        '(() => { const b = document.getElementById("root").getBoundingClientRect(); return [Math.ceil(b.width), Math.ceil(b.height)]; })()');
      const img = await w.webContents.capturePage({ x: 0, y: 0, width: width * SCALE, height: height * SCALE });
      const file = path.join(out, `${layout}${open ? '-open' : ''}.png`);
      fs.writeFileSync(file, img.toPNG());
      console.log(path.relative(process.cwd(), file), `${width}x${height}`);
      w.destroy();
    }
  }
}

// ---------- critter demo GIF ----------
// The critter hangs from the top edge of a mock screen, swings for one full cycle, then drops its sign.
// Frames are rendered deterministically by pausing each CSS animation at a chosen time.
const GIF_W = 320, GIF_H = 350;
const SCENE_CSS = `
  html, body { background: #22272e !important; }
  body::before { content: ""; position: fixed; inset: 0 0 auto 0; height: 8px; background: #1c2128; border-bottom: 1px solid #444c56; }
  #root { left: 50% !important; top: 8px !important; transform: translateX(-50%); }`;

async function frameAt(w, selector, seconds) {
  await w.webContents.executeJavaScript(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (el) { el.style.animationDelay = '-${seconds}s'; el.style.animationPlayState = 'paused'; }
  })()`);
  await wait(60); // let the offscreen renderer paint
  const img = await w.webContents.capturePage({ x: 0, y: 0, width: GIF_W * SCALE, height: GIF_H * SCALE });
  const { width, height } = img.getSize();
  const rgba = Buffer.from(img.toBitmap()); // BGRA -> RGBA
  for (let i = 0; i < rgba.length; i += 4) { const b = rgba[i]; rgba[i] = rgba[i + 2]; rgba[i + 2] = b; }
  return { rgba, width, height };
}

async function critterGif() {
  const w = new BrowserWindow({
    show: false, width: GIF_W * SCALE, height: GIF_H * SCALE, frame: false,
    backgroundColor: '#22272e', webPreferences: { offscreen: true, zoomFactor: SCALE },
  });
  const frames = [];
  const load = async (query) => {
    await w.loadFile(widget, { query });
    await w.webContents.insertCSS(SCENE_CSS);
    await wait(500);
  };

  // Swing: the animation alternates -7° → 7° over 2.8s, so one full cycle is 5.6s.
  // Start and end at 1.4s, where the critter hangs straight down, so the cut to "open" is seamless.
  await load({ layout: 'critter' });
  for (let i = 0; i < 56; i++) frames.push({ ...(await frameAt(w, '.buddy', (1.4 + i * 0.1).toFixed(2))), delay: 100 });

  // Click: the sign drops in (0.18s animation), then holds so it can be read.
  await load({ layout: 'critter', open: '1' });
  for (const t of [0, 0.04, 0.08, 0.12, 0.16]) frames.push({ ...(await frameAt(w, '.panel', t)), delay: 40 });
  frames.push({ ...(await frameAt(w, '.panel', 0.18)), delay: 2600 });
  w.destroy();

  // One shared palette (from a swing frame and the open frame) keeps colors steady between frames.
  const { width, height } = frames[0];
  const palette = quantize(Buffer.concat([frames[0].rgba, frames[frames.length - 1].rgba]), 256);
  const gif = GIFEncoder();
  for (const f of frames) gif.writeFrame(applyPalette(f.rgba, palette), width, height, { palette, delay: f.delay });
  gif.finish();
  const file = path.join(out, 'critter-demo.gif');
  fs.writeFileSync(file, gif.bytes());
  console.log(path.relative(process.cwd(), file), `${width}x${height}`, `${frames.length} frames`, `${Math.round(fs.statSync(file).size / 1024)} KB`);
}

app.whenReady().then(async () => {
  fs.mkdirSync(out, { recursive: true });
  try {
    await screenshots();
    await critterGif();
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
  app.quit();
});
