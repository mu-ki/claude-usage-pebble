// Renders every layout (collapsed and expanded) with the demo data and saves PNGs to docs/screenshots,
// plus an animated demo GIF per layout: idle, a cursor clicks it, and the details drop open.
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
const ROOT_SIZE = '(() => { const b = document.getElementById("root").getBoundingClientRect(); return [Math.ceil(b.width), Math.ceil(b.height)]; })()';

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
      const [width, height] = await w.webContents.executeJavaScript(ROOT_SIZE);
      const img = await w.webContents.capturePage({ x: 0, y: 0, width: width * SCALE, height: height * SCALE });
      const file = path.join(out, `${layout}${open ? '-open' : ''}.png`);
      fs.writeFileSync(file, img.toPNG());
      console.log(path.relative(process.cwd(), file), `${width}x${height}`);
      w.destroy();
    }
  }
}

// ---------- demo GIFs ----------
// Each layout sits at the top edge of a mock screen. A cursor clicks it and the details drop open.
// Frames are rendered deterministically by pausing each CSS animation at a chosen time.
const GIFS = {
  // The critter is the README's hero, so give it calm numbers: it smiles below 50%.
  critter: { pct: '12,28,18', target: '.buddy ellipse', swing: true, css: '.critter .buddy { width: 150px !important; height: auto !important; }' }, // enlarged for the GIF only
  pill: { target: '.sum' },
  dot: { target: '.dot' },
  rings: { target: '.ringrow' },
  battery: { target: '.cell' },
  terminal: { target: '[data-toggle]' },
};

const SCENE_CSS = `
  html, body { background: #22272e !important; }
  body::before { content: ""; position: fixed; inset: 0 0 auto 0; height: 8px; background: #1c2128; border-bottom: 1px solid #444c56; }
  #root { left: 50% !important; top: 8px !important; transform: translateX(-50%); }
  #cursor { position: fixed; z-index: 9; width: 0; height: 0; pointer-events: none; }
  #cursor svg { position: absolute; left: -1px; top: -1px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.6)); }
  #cursor i { position: absolute; left: -15px; top: -15px; width: 30px; height: 30px; border-radius: 50%;
              border: 2px solid rgba(255,255,255,.9); opacity: 0; }
  #cursor.p1 i { opacity: .9; transform: scale(.45); }
  #cursor.p2 i { opacity: .45; transform: scale(1.15); }
  #cursor.p1 svg, #cursor.p2 svg { transform: scale(.9); }`;

const pauseAt = (selector, seconds) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (el) { el.style.animationDelay = '-${seconds}s'; el.style.animationPlayState = 'paused'; }
})()`;

// Puts a mouse pointer on the layout's clickable part; cls '' shows it, 'p1'/'p2' are the click ripple.
const cursorAt = (selector, cls) => `(() => {
  let c = document.getElementById('cursor');
  if (!c) {
    c = document.createElement('div'); c.id = 'cursor';
    c.innerHTML = '<i></i><svg width="18" height="24" viewBox="0 0 18 24"><path d="M1 1v18l4.5-4.5 3 7 3-1.3-2.9-6.8H15z" fill="#fff" stroke="#000" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
  }
  const t = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
  c.style.left = (t.left + t.width / 2) + 'px'; c.style.top = (t.top + t.height / 2) + 'px';
  c.className = ${JSON.stringify(cls)};
})()`;

async function snap(w, js) {
  if (js) await w.webContents.executeJavaScript(js);
  await wait(60); // let the offscreen renderer paint
  const img = await w.webContents.capturePage();
  const { width, height } = img.getSize();
  const rgba = Buffer.from(img.toBitmap()); // BGRA -> RGBA
  for (let i = 0; i < rgba.length; i += 4) { const b = rgba[i]; rgba[i] = rgba[i + 2]; rgba[i + 2] = b; }
  return { rgba, width, height };
}

async function demoGif(layout, { pct, target, swing, css = '' }) {
  const query = pct ? { layout, pct } : { layout };

  // Size the scene to fit the expanded layout with some breathing room.
  const m = new BrowserWindow({ show: false, width: 800, height: 900, webPreferences: { offscreen: true } });
  await m.loadFile(widget, { query: { ...query, open: '1' } });
  if (css) await m.webContents.insertCSS(css);
  await wait(400);
  const [ow, oh] = await m.webContents.executeJavaScript(ROOT_SIZE);
  m.destroy();
  const W = Math.max(ow + 56, 280), H = oh + 8 + 28;

  const w = new BrowserWindow({
    show: false, width: W * SCALE, height: H * SCALE, frame: false,
    backgroundColor: '#22272e', webPreferences: { offscreen: true, zoomFactor: SCALE },
  });
  const load = async (q) => { await w.loadFile(widget, { query: q }); await w.webContents.insertCSS(SCENE_CSS + css); await wait(500); };
  const frames = [];
  const add = async (js, delay) => frames.push({ ...(await snap(w, js)), delay });

  await load(query);
  if (swing) {
    // The swing alternates -7° → 7° over 2.8s, so one full cycle is 5.6s. Start and end at 1.4s,
    // where the critter hangs straight down, so it's still while the cursor clicks.
    for (let i = 0; i < 56; i++) await add(pauseAt('.buddy', (1.4 + i * 0.1).toFixed(2)), 100);
  } else {
    await add(null, 900);
  }
  await add(cursorAt(target, ''), 600);
  await add(cursorAt(target, 'p1'), 90);
  await add(cursorAt(target, 'p2'), 90);

  // Open: the details drop in (0.18s animation), then hold so they can be read.
  await load({ ...query, open: '1' });
  for (const t of [0, 0.04, 0.08, 0.12, 0.16]) await add(pauseAt('.panel', t), 40);
  await add(pauseAt('.panel', 0.18), swing ? 3000 : 2800);
  w.destroy();

  // One shared palette keeps colors steady between frames.
  const { width, height } = frames[0];
  const sample = [frames[0], frames.find((f) => f.delay === 600), frames[frames.length - 1]];
  const palette = quantize(Buffer.concat(sample.map((f) => f.rgba)), 256);
  const gif = GIFEncoder();
  for (const f of frames) gif.writeFrame(applyPalette(f.rgba, palette), width, height, { palette, delay: f.delay });
  gif.finish();
  const file = path.join(out, `${layout}-demo.gif`);
  fs.writeFileSync(file, gif.bytes());
  console.log(path.relative(process.cwd(), file), `${width}x${height}`, `${frames.length} frames`, `${Math.round(fs.statSync(file).size / 1024)} KB`);
}

app.whenReady().then(async () => {
  fs.mkdirSync(out, { recursive: true });
  const only = process.argv.find((a) => a.startsWith('--only='));
  try {
    if (!only || only === '--only=png') await screenshots();
    if (!only || only === '--only=gif') for (const [layout, opts] of Object.entries(GIFS)) await demoGif(layout, opts);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
  app.quit();
});
