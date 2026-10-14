# Claude Usage Pebble

A tiny always-on-top desktop widget (a "pebble" that sits on your screen) that shows your Claude plan usage: the current session, this week, and any per-model weekly limits (for example Fable). Click it to pull down the details. Works on **Windows, macOS and Linux**.

Pick from six layouts, from a 30px dot to a little critter hanging off the top of your screen.

> Unofficial community project. Not affiliated with or endorsed by Anthropic. "Claude" is a trademark of Anthropic.

## Download

Grab the latest build from the **[Releases page](https://github.com/mu-ki/claude-usage-pebble/releases/latest)**:

| OS | File to download |
|---|---|
| Windows | `claude-usage-pebble-<version>-win-x64.exe` (portable, no installer) |
| macOS | `claude-usage-pebble-<version>-mac-universal.dmg`, one file that runs natively on both Apple silicon (M1 and later) and Intel Macs |
| Linux | `claude-usage-pebble-<version>-linux-x86_64.AppImage` |

The builds are not code-signed yet (see [Code signing policy](#code-signing-policy)), so your OS will warn you the first time:

- **Windows:** SmartScreen says "Windows protected your PC". Click **More info → Run anyway**.
- **macOS:** open the DMG and drag the app to Applications. The first time you open it, macOS blocks it.
  - macOS 15 (Sequoia) and later: open **System Settings → Privacy & Security**, scroll down, click **Open Anyway** next to "Claude Usage Pebble", and confirm.
  - macOS 14 and earlier: right-click the app → **Open**, then **Open** again.
  - Either version, from Terminal: `xattr -dr com.apple.quarantine "/Applications/Claude Usage Pebble.app"`.
- **Linux:** make the file executable first: `chmod +x claude-usage-pebble-*.AppImage`, then run it.

### Verify your download

Every release file is built by [GitHub Actions](.github/workflows/release.yml) straight from this repository, and GitHub signs a [build provenance attestation](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations) for it. To check that a file really came from this repo's workflow (needs the [GitHub CLI](https://cli.github.com)):

```bash
gh attestation verify claude-usage-pebble-1.0.0-win-x64.exe --repo mu-ki/claude-usage-pebble
```

Each release also has a `SHA256SUMS.txt`. Compare it with `sha256sum <file>` (Linux), `shasum -a 256 <file>` (macOS) or `Get-FileHash <file>` (Windows PowerShell).

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

## Code signing policy

Windows builds are set to be signed through the SignPath Foundation open-source program: free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org). Until that application is approved, releases are unsigned. macOS builds are not signed or notarized.

- Committers and reviewers: [repository collaborators](https://github.com/mu-ki/claude-usage-pebble/graphs/contributors). Pull requests from anyone else are reviewed before merging.
- Approvers: [@mu-ki](https://github.com/mu-ki) (repository owner)
- Every release file is built by GitHub Actions from the tagged source and carries a build provenance attestation (see [Verify your download](#verify-your-download)).

### Privacy

This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it. The only site it talks to is claude.ai, which you sign in to yourself, to read your own usage numbers. There is no analytics, telemetry or server of our own (see [How it works](#how-it-works)).

## Credits

Inspired by [claude-usage-tool](https://github.com/IgniteStudiosLtd/claude-usage-tool), a macOS menu bar app.

## License

[MIT](LICENSE)
