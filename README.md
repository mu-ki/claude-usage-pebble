# Claude Usage Pebble

A tiny always-on-top desktop widget (a "pebble" that sits on your screen) that shows your Claude plan usage: the current session, this week, and any per-model weekly limits (for example Fable). Click it to pull down the details. Works on **Windows, macOS and Linux**.

Pick from six layouts, from a 30px dot to a little critter hanging off the top of your screen.

> Unofficial community project. Not affiliated with or endorsed by Anthropic. "Claude" is a trademark of Anthropic.

## Download

Grab the latest build from the **[Releases page](https://github.com/mu-ki/claude-usage-pebble/releases/latest)**:

| OS | File to download |
|---|---|
| Windows | `claude-usage-pebble-<version>-win-x64.exe` (portable, no installer) |
| macOS | `claude-usage-pebble-<version>-mac-universal.dmg` (Intel and Apple silicon) |
| Linux | `claude-usage-pebble-<version>-linux-x86_64.AppImage` |

The builds are not code-signed, so your OS will warn you the first time:

- **Windows:** SmartScreen says "Windows protected your PC". Click **More info → Run anyway**.
- **macOS:** right-click the app → **Open**, then **Open** again. Or run `xattr -dr com.apple.quarantine "/Applications/Claude Usage Pebble.app"`.
- **Linux:** make the file executable first: `chmod +x claude-usage-pebble-*.AppImage`, then run it.

Prefer to build it yourself? See [Install and run](#install-and-run) below.

## Layouts

Right-click the widget → **Layout** to switch. Your choice and position are remembered.

| Layout | Collapsed | Click to expand |
|---|---|---|
| **Classic bar** | Slim tab: `Session 34% · Week 61%` | Pull-down drawer with every limit |
| **Tiny dot** | 30px ring that fills with session usage | Card with every limit |
| **Hanging critter** | A creature dangling on a thread. It drops lower as the week fills up, and its face goes from happy to worried | A sign hangs below it with the details |
| **Rings** | One ring gauge per limit, always visible | Adds reset times |
| **Battery** | How much of the session is *left*, like a phone battery | Every limit |
| **Terminal** | Monospace status line: `❯ claude 5h ██░░ 34% │ 7d ███░ 61%` | ASCII bars with reset times |

Bars turn amber at 75% and red at 90%.

To preview every layout with sample data, serve the folder (for example `npx serve .`) and open `docs/gallery.html`. Or open `widget.html?layout=critter&open` directly.

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
```

### Adding a layout

1. Add a function to the `layouts` object in `widget.html`. It returns HTML for the current `state` and `open` flag. Mark the clickable part with `data-toggle`, and reuse `list()` for the expanded details.
2. Add `['your-id', 'Your name']` to `LAYOUTS` in `main.js`.

The window resizes itself to fit whatever your layout renders.

## Credits

Inspired by [claude-usage-tool](https://github.com/IgniteStudiosLtd/claude-usage-tool), a macOS menu bar app.

## License

[MIT](LICENSE)
