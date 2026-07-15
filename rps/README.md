# Rock Paper Scissors Tournament

Live multiplayer via FastAPI + WebSockets.

## Split deploy (recommended)

| Piece | Where |
|-------|--------|
| Deck UI | GitHub Pages (`github/` folder) |
| API + WebSockets | Replit (this repo / `serve.py`) |

### 1. Replit

1. Import this project into a Repl (or push the repo)
2. Secrets (Tools → Secrets):
   - `PUBLIC_BASE_URL` = your Repl HTTPS URL  
     e.g. `https://lnl-USERNAME.replit.app`  
     (auto-detected from Replit env if unset after first run — still set it for Deploy)
   - Optional `FRONTEND_ORIGINS` = your Pages origin  
     e.g. `https://YOURUSER.github.io` (default allows `*`)
3. Click **Run** (or Deploy)
4. Smoke-check: open `https://YOUR-REPL/api/health` → `{"ok":true,...}`

QR codes point at Replit `/join?room=CODE` by default (phones hit the Repl join page).

### 2. Point Pages at Replit

In the Pages repo, edit `rps/config.js`:

```js
window.RPS_BACKEND_URL = "https://YOUR-REPL.replit.app";
```

Redeploy / push Pages. Open the deck → `#slide-18` → RPS should connect.

### Optional: join page on Pages instead of Replit

Secrets on Replit:

- `JOIN_PUBLIC_URL` = `https://YOURUSER.github.io/YOURREPO`
- `JOIN_PATH` = `/join.html`

And set the same `RPS_BACKEND_URL` in Pages `rps/config.js` so `join.html` can reach WebSockets.

## Local full-stack

```powershell
.\start.bat
# or:
$env:PUBLIC_BASE_URL = "http://localhost:8765"; python serve.py
```

Leave `RPS_BACKEND_URL = ""` (same-origin).

## Match flow

1. Players scan QR and enter a nickname  
2. Host presses **S** to lock registration and build bracket  
3. Host presses **N** to start each match (5-second pick window)  
4. Players tap 🪨 📄 ✂️  
5. Host **End** → Q&A slide  

## Host Keyboard

| Key | Action |
|-----|--------|
| `Q` | Toggle QR |
| `S` | Lock + build bracket |
| `N` | Next match / advance |
| `R` | Reset |
| `A` | Admin panel |
| `M` | Sound |
