// Claude Usage Pebble - main process.
// Usage comes from your claude.ai login (same numbers as claude.ai/settings/usage). A hidden window
// loads the page for a few seconds per refresh and is then destroyed, so memory stays low between polls.
const { app, BrowserWindow, ipcMain, Menu, screen, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const USAGE_URL = 'https://claude.ai/settings/usage';
const PARTITION = 'persist:claude';
const POLL_MS = 5 * 60 * 1000;
const LAYOUTS = [
  ['pill', 'Classic bar'],
  ['dot', 'Tiny dot'],
  ['critter', 'Hanging critter'],
  ['rings', 'Rings'],
  ['battery', 'Battery'],
  ['terminal', 'Terminal'],
];

app.disableHardwareAcceleration(); // a small widget doesn't need a GPU process
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;
let loginWin = null;
let busy = false;
let state = { status: 'loading', bars: [] };

// ---------- settings: layout + where the widget sits ----------
// The position is an anchor (horizontal center + top edge) so the widget grows and shrinks around
// the same spot whatever the layout or drawer size.
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
let settings = {};

function loadSettings() {
  try { settings = JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch { settings = {}; }
  if (!LAYOUTS.some(([id]) => id === settings.layout)) settings.layout = 'pill';
  const a = settings.anchor;
  const onScreen = a && screen.getAllDisplays().some(({ workArea: w }) => a.cx >= w.x && a.cx < w.x + w.width && a.y >= w.y && a.y < w.y + w.height);
  if (!onScreen) {
    const wa = screen.getPrimaryDisplay().workArea;
    settings.anchor = { cx: Math.round(wa.x + wa.width / 2), y: wa.y }; // top-center of the screen
  }
}

function saveSettings() {
  try { fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2)); } catch {}
}

// ---------- widget window ----------
function createWidget() {
  win = new BrowserWindow({
    x: settings.anchor.cx - 20, y: settings.anchor.y, width: 40, height: 40,
    frame: false, transparent: true, resizable: false, alwaysOnTop: true, skipTaskbar: true,
    hasShadow: false, fullscreenable: false, maximizable: false, minimizable: false, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false },
  });
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile('widget.html');
  win.webContents.on('did-finish-load', () => { sendConfig(); send(); });
}

function send() {
  if (win && !win.isDestroyed()) win.webContents.send('state', state);
}

function sendConfig() {
  if (win && !win.isDestroyed()) win.webContents.send('config', { layout: settings.layout });
}

// The page measures its layout and asks for a window that fits; the window is shown on the first fit.
ipcMain.on('size', (_e, w, h) => {
  w = Math.max(10, Math.round(w)); h = Math.max(10, Math.round(h));
  const { cx, y } = settings.anchor;
  const wa = screen.getDisplayNearestPoint({ x: cx, y }).workArea;
  const x = Math.min(Math.max(Math.round(cx - w / 2), wa.x), wa.x + wa.width - w);
  win.setBounds({ x, y: Math.min(Math.max(y, wa.y), wa.y + wa.height - h), width: w, height: h });
  if (!win.isVisible()) win.showInactive();
});
ipcMain.on('move', (_e, x, y) => {
  const b = win.getBounds();
  win.setBounds({ x: Math.round(x), y: Math.round(y), width: b.width, height: b.height });
});
ipcMain.on('moved', () => {
  const b = win.getBounds();
  settings.anchor = { cx: Math.round(b.x + b.width / 2), y: b.y };
  saveSettings();
});
ipcMain.on('refresh', () => fetchUsage());
ipcMain.on('login', () => openLogin());
ipcMain.on('menu', () => {
  Menu.buildFromTemplate([
    { label: 'Refresh now', click: fetchUsage },
    {
      label: 'Layout',
      submenu: LAYOUTS.map(([id, label]) => ({
        label, type: 'radio', checked: settings.layout === id,
        click: () => { settings.layout = id; saveSettings(); sendConfig(); },
      })),
    },
    { label: 'Sign in / switch account', click: openLogin },
    { label: 'Start at login', type: 'checkbox', checked: autostartGet(), click: (i) => autostartSet(i.checked) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]).popup({ window: win });
});

// ---------- data ----------
// Runs inside claude.ai. Tries the JSON usage endpoint first, then falls back to reading the page text.
async function scrapeInPage() {
  const isLogin = () => /\/(login|signup)/.test(location.pathname);
  if (isLogin()) return { login: true };
  try {
    const or = await fetch('/api/organizations', { credentials: 'include' });
    if (or.status === 401 || or.status === 403) return { login: true };
    const orgs = await or.json();
    if (Array.isArray(orgs) && orgs.length) {
      const org = orgs.find((o) => (o.capabilities || []).includes('chat')) || orgs[0];
      const r = await fetch('/api/organizations/' + org.uuid + '/usage', { credentials: 'include' });
      if (r.ok) return { api: await r.json() };
    }
  } catch {}
  for (let i = 0; i < 20 && !/\d+%\s*used/i.test(document.body.innerText); i++) await new Promise((r) => setTimeout(r, 500));
  if (isLogin()) return { login: true };
  const lines = document.body.innerText.split('\n').map((l) => l.trim()).filter(Boolean);
  const bars = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\d+(?:\.\d+)?)%\s*used/i);
    if (!m) continue;
    let sub = '';
    const names = [];
    for (let j = i - 1; j >= Math.max(0, i - 3) && !/^\d+(?:\.\d+)?%\s*used/i.test(lines[j]); j--) {
      if (/resets/i.test(lines[j])) sub = sub || lines[j].replace(/^.*?(Resets)/i, '$1');
      else names.push(lines[j]);
    }
    names.sort((a, b) => a.length - b.length); // "Fable this week" beats "Separate weekly limit for Fable"
    bars.push({ label: names[0] || 'Usage', sub, pct: +m[1] });
  }
  return bars.length ? { bars } : { error: 'Could not read the usage page' };
}

function toBars(api) {
  const bars = [];
  const add = (key, label) => {
    const d = api[key];
    if (d && typeof d === 'object' && d.utilization != null) bars.push({ label, pct: +d.utilization, resetsAt: d.resets_at || null });
  };
  add('five_hour', 'Current session');
  add('seven_day', 'This week');
  for (const key of Object.keys(api)) { // per-model weekly limits, e.g. seven_day_fable / seven_day_opus
    if (!key.startsWith('seven_day_') || /oauth|apps/.test(key)) continue;
    const model = key.slice(10).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    add(key, model + ' this week');
  }
  return bars;
}

const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);

async function fetchUsage() {
  if (busy || loginWin) return;
  busy = true;
  state = { ...state, loading: true };
  send();
  const w = new BrowserWindow({ show: false, width: 1000, height: 800, webPreferences: { partition: PARTITION } });
  try {
    await w.loadURL(USAGE_URL).catch(() => {}); // a redirect to /login aborts the first load; the script checks for that
    const r = await withTimeout(w.webContents.executeJavaScript(`(${scrapeInPage.toString()})()`, true), 30000, 'Timed out reaching claude.ai');
    if (r.login) state = { status: 'login', bars: [] };
    else if (r.error) state = { ...state, status: 'error', message: r.error };
    else {
      const bars = r.api ? toBars(r.api) : r.bars;
      state = bars.length ? { status: 'ok', bars, updated: Date.now() } : { ...state, status: 'error', message: 'No usage data found' };
    }
  } catch (e) {
    state = { ...state, status: 'error', message: e.message };
  } finally {
    w.destroy();
    busy = false;
    state.loading = false;
    send();
  }
}

// Visible claude.ai sign-in window; you type your own credentials. It closes itself once you're in.
function openLogin() {
  if (loginWin) return loginWin.focus();
  loginWin = new BrowserWindow({ width: 480, height: 720, title: 'Sign in to Claude', autoHideMenuBar: true, alwaysOnTop: true, webPreferences: { partition: PARTITION } });
  const check = (_e, url) => {
    try {
      const u = new URL(url);
      if (u.hostname === 'claude.ai' && !/login|signup|magic|auth|verify/.test(u.pathname)) setTimeout(() => loginWin && loginWin.close(), 1200);
    } catch {}
  };
  loginWin.webContents.on('did-navigate', check);
  loginWin.webContents.on('did-navigate-in-page', check);
  loginWin.on('closed', () => { loginWin = null; fetchUsage(); });
  loginWin.loadURL('https://claude.ai/login');
}

// ---------- start at login (Windows/macOS via Electron, Linux via an autostart .desktop file) ----------
const linuxAutostart = () => path.join(os.homedir(), '.config', 'autostart', 'claude-usage-pebble.desktop');
const loginArgs = () => (app.isPackaged ? [] : [app.getAppPath()]);

function autostartGet() {
  if (process.platform === 'linux') return fs.existsSync(linuxAutostart());
  return app.getLoginItemSettings({ args: loginArgs() }).openAtLogin;
}

function autostartSet(on) {
  if (process.platform !== 'linux') return app.setLoginItemSettings({ openAtLogin: on, args: loginArgs() });
  const file = linuxAutostart();
  if (!on) return fs.rmSync(file, { force: true });
  const exec = [process.env.APPIMAGE || process.execPath, ...loginArgs()].map((a) => `"${a}"`).join(' ');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `[Desktop Entry]\nType=Application\nName=Claude Usage Pebble\nExec=${exec}\nX-GNOME-Autostart-enabled=true\n`);
}

// ---------- app ----------
app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
  // Drop "Electron/x.y" from the user agent so claude.ai treats the window like a normal browser.
  const ses = session.fromPartition(PARTITION);
  ses.setUserAgent(ses.getUserAgent().replace(/\s*(Electron|claude-usage-pebble)\/\S+/g, ''));
  loadSettings();
  createWidget();
  fetchUsage();
  setInterval(fetchUsage, POLL_MS);
});

app.on('window-all-closed', (e) => e.preventDefault()); // closing the login window must not quit the app
