# SiloForge

Lightweight farm management apps for poultry operations. Each app is a single HTML file — no installation, works in any browser.

## Apps

| App | Description | Live |
|-----|-------------|------|
| **LayerTrack** | Layer farm — eggs, flock, feed, health, finance | [Open](https://farshub.github.io/siloforge/LayerTrack.html) |
| **BroodTrack** | Brood farm — batches, daily logs, weight, POL sales | [Open](https://farshub.github.io/siloforge/BroodTrack.html) |

## How It Works

- Data syncs in real-time via Firebase Firestore
- Each farm logs in with a unique **Farm Code** — data is fully isolated between farms
- Works offline; syncs when connection returns
- New farms are registered via the app using a master PIN

## Stack

- Vanilla HTML/CSS/JS — no build tools, no frameworks
- Firebase Firestore (real-time sync + offline persistence)
- Hosted on GitHub Pages
