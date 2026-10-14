// Renders build/icon.svg to build/icon.png (1024x1024, transparent corners).
// electron-builder turns that PNG into the Windows .ico, macOS .icns and Linux icons.
// Run with: npm run icon
// The SVG is drawn onto a 1024px canvas inside the page, so the result doesn't depend on the
// window size (windows can't be taller than the screen) or the display's scaling.
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const SIZE = 1024;
const svg = fs.readFileSync(path.join(__dirname, '..', 'build', 'icon.svg'), 'utf8');

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const w = new BrowserWindow({ show: false, width: 200, height: 200, webPreferences: { offscreen: true } });
  await w.loadURL('data:text/html,<!doctype html><title>icon</title>');
  const dataUrl = await w.webContents.executeJavaScript(`new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = ${SIZE};
      c.getContext('2d').drawImage(img, 0, 0, ${SIZE}, ${SIZE});
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('could not load the SVG'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(${JSON.stringify(svg)});
  })`);
  const png = Buffer.from(dataUrl.split(',')[1], 'base64');
  const file = path.join(__dirname, '..', 'build', 'icon.png');
  fs.writeFileSync(file, png);
  console.log(path.relative(process.cwd(), file), `${SIZE}x${SIZE}`, `${Math.round(png.length / 1024)} KB`);
  app.quit();
});
