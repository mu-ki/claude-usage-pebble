// Renders every layout (collapsed and expanded) with the demo data and saves PNGs to docs/screenshots.
// Run with: npm run screenshots
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const LAYOUTS = ['pill', 'dot', 'critter', 'rings', 'battery', 'terminal'];
const SCALE = 2; // retina-crisp images
const out = path.join(__dirname, 'screenshots');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.disableHardwareAcceleration();
app.on('window-all-closed', () => {}); // keep running between captures; we quit when done

app.whenReady().then(async () => {
  fs.mkdirSync(out, { recursive: true });
  for (const layout of LAYOUTS) {
    for (const open of [false, true]) {
      const w = new BrowserWindow({
        show: false, width: 400 * SCALE, height: 520 * SCALE, frame: false, transparent: true,
        backgroundColor: '#00000000', webPreferences: { offscreen: true, zoomFactor: SCALE },
      });
      await w.loadFile(path.join(__dirname, '..', 'widget.html'), { query: open ? { layout, open: '1' } : { layout } });
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
  app.quit();
});
