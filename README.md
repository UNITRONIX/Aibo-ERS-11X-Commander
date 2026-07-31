# Aibo ERS-11X Commander

A web **Sound Commander** remote simulator for the Sony AIBO ERS-110 / ERS-111.

**Live demo (GitHub Pages):** [https://unitronix.github.io/Aibo-ERS-11X-Commander/](https://unitronix.github.io/Aibo-ERS-11X-Commander/)

The app synthesizes tone commands in the browser (Web Audio) and plays them through your phone or PC speaker toward AIBO’s microphone — the same idea as the original Sound Commander.

This repository does **not** include AiboWare, OPEN-R, Aperios, or any Memory Stick cartridge firmware from Sony.

## Run locally

```bash
npm install          # optional; required for Capacitor
python -m http.server 8080
```

Open: http://localhost:8080

On a phone (same network): `http://<your-pc-ip>:8080`. Use the fullscreen toggle next to SEND. Hold the speaker near AIBO’s mic.

## Modes

| Type | Meaning |
|------|---------|
| **A** | Numeric commands, C5 octave |
| **B** | Numeric commands, C6 octave |
| **L** | Single-sound notes, C5 |
| **H** | Single-sound notes, C6 |

- **Numeric:** enter a code (e.g. `12`) → **SEND** (e.g. SIT = C-G-D#)
- **Single:** each key plays a note (∗=C … 3=B)
- **GAME:** switches to the game command palette; press GAME again to return to autonomous

While audio is playing, all buttons are locked.

## Example numeric codes

| Code | Command |
|------|---------|
| 00 | Autonomous |
| 01 | Game mode |
| 02 | Performance |
| 11 | Stand up |
| 12 | Sit |
| 13 | Lie down |
| 52 | Forward |
| 55 | Stop |

## Reference tones

The [`sounds/`](sounds/) folder contains **synthesized** command WAVs (type A = C5, type B = C6), generated locally from publicly documented Sound Commander frequencies and melody mappings. The live web UI primarily uses Web Audio; the WAVs are reference / archive files.

## PWA / Android

```bash
npm install
npm run cap:add:android   # once
npm run cap:sync
npm run cap:open
```

## Layout

- `index.html`, `css/`, `js/` — remote UI
- `data/commands.json` — note / code / GAME mappings
- `sounds/` — synthesized command WAVs
- `www/` — static copy for Capacitor

## License

Project code: GPL-3.0 (see [LICENSE](LICENSE)).

Sony, AIBO, and Sound Commander are trademarks of Sony Group Corporation. This project is not affiliated with Sony.
