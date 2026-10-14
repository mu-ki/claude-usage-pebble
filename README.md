# Claude Usage Pebble

A tiny always-on-top desktop widget (a "pebble" that sits on your screen) that shows your Claude plan usage: the current session, this week, and any per-model weekly limits (for example Fable). Click it to pull down the details. Works on **Windows, macOS and Linux**.

Pick from six layouts, from a 30px dot to a little critter hanging off the top of your screen.

> Unofficial community project. Not affiliated with or endorsed by Anthropic. "Claude" is a trademark of Anthropic.

## Layouts

Right-click the widget → **Layout** to switch. Your choice and position are remembered.

<table>
  <tr><th>Layout</th><th>Collapsed</th><th>Click to expand</th></tr>
  <tr>
    <td><b>Classic bar</b><br>A slim tab at the top of the screen. Click to pull down the drawer.</td>
    <td><img src="docs/screenshots/pill.png" width="300" alt="Classic bar, collapsed"></td>
    <td><img src="docs/screenshots/pill-open.png" width="300" alt="Classic bar, expanded"></td>
  </tr>
  <tr>
    <td><b>Tiny dot</b><br>A 30px ring that fills with session usage.</td>
    <td><img src="docs/screenshots/dot.png" width="30" alt="Tiny dot, collapsed"></td>
    <td><img src="docs/screenshots/dot-open.png" width="250" alt="Tiny dot, expanded"></td>
  </tr>
  <tr>
    <td><b>Hanging critter</b><br>Dangles on a thread, hangs lower as the week fills up, and looks worried above 80%.</td>
    <td><img src="docs/screenshots/critter.png" width="84" alt="Hanging critter, collapsed"></td>
    <td><img src="docs/screenshots/critter-open.png" width="250" alt="Hanging critter, expanded"></td>
  </tr>
  <tr>
    <td><b>Rings</b><br>One gauge per limit, always visible.</td>
    <td><img src="docs/screenshots/rings.png" width="184" alt="Rings, collapsed"></td>
    <td><img src="docs/screenshots/rings-open.png" width="270" alt="Rings, expanded"></td>
  </tr>
  <tr>
    <td><b>Battery</b><br>How much of the session is <i>left</i>, like a phone battery.</td>
    <td><img src="docs/screenshots/battery.png" width="124" alt="Battery, collapsed"></td>
    <td><img src="docs/screenshots/battery-open.png" width="260" alt="Battery, expanded"></td>
  </tr>
  <tr>
    <td><b>Terminal</b><br>A monospace status line for the command-line crowd.</td>
    <td><img src="docs/screenshots/terminal.png" width="290" alt="Terminal, collapsed"></td>
    <td><img src="docs/screenshots/terminal-open.png" width="355" alt="Terminal, expanded"></td>
  </tr>
</table>

Bars turn amber at 75% and red at 90%. Screenshots use sample data.

To preview every layout live, serve the folder (for example `npx serve .`) and open `docs/gallery.html`, or open `widget.html?layout=critter&open` directly. After changing a layout, run `npm run screenshots` to regenerate these images.

## Install and run

You need [Node.js](https://nodejs.org) 18 or later.

```bash
git clone https://github.com/mu-ki/claude-usage-pebble.git
cd claude-usage-pebble
npm install
npm start
```

On first run the widget says **Click to sign in**. Click it, sign in to claude.ai in the window that opens, and it closes by itself. If Google sign-in is refused inside the app, use the email sign-in option.

### Controls

- **Click** the widget to expand or collapse it
- **Drag** to move it anywhere on screen
- **Right-click** for Refresh now, Layout, Sign in / switch account, Start at login, and Quit

## Build an app file

```bash
npm run dist
```

This builds for the OS you run it on:

| OS | Output in `dist/` |
|---|---|
| Windows | Portable `.exe` |
| macOS | `.dmg` (runs as a menu-bar-style app with no Dock icon) |
| Linux | `.AppImage` |

macOS builds must be made on a Mac. Unsigned builds show a security warning the first time you open them.

## How it works

- You sign in to claude.ai once in a small window. The session is stored by Electron in the app's own data folder.
- Every 5 minutes, a hidden window opens `claude.ai/settings/usage` for a few seconds, reads the numbers, and closes again. It asks claude.ai for the usage data first; if that fails, it reads the numbers off the page text.
- Nothing is sent anywhere except claude.ai. There is no server, analytics or telemetry.

The data comes from claude.ai's web app, not a public API, so a claude.ai update can break it. If the widget shows an error, please open an issue.

## Project layout

```
main.js          window, layout menu, settings, fetching usage, sign-in, start at login
preload.js       narrow bridge between the page and the main process
widget.html      all six layouts (plain HTML/CSS/JS, no build step)
docs/gallery.html  preview of every layout with sample data
docs/capture.js    generates docs/screenshots (npm run screenshots)
```

### Adding a layout

1. Add a function to the `layouts` object in `widget.html`. It returns HTML for the current `state` and `open` flag. Mark the clickable part with `data-toggle`, and reuse `list()` for the expanded details.
2. Add `['your-id', 'Your name']` to `LAYOUTS` in `main.js`.

The window resizes itself to fit whatever your layout renders.

## Credits

Inspired by [claude-usage-tool](https://github.com/IgniteStudiosLtd/claude-usage-tool), a macOS menu bar app.

## License

[MIT](LICENSE)
