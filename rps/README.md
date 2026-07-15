# Rock Paper Scissors Tournament

Embedded presentation slide (slide 18) with **FastAPI + WebSocket** backend.

## Deploy on Replit

1. Import / push this repo into a Repl
2. Set Secrets (or env):
   - `PUBLIC_BASE_URL` = your public URL  
     e.g. `https://lnl.jakehoke.com` or `https://your-repl.your-user.repl.co`
3. Click **Run** (runs `python serve.py`)
4. Open the Repl URL → `#slide-18`

| URL | Purpose |
|-----|---------|
| `/` | Host presentation |
| `/join?room=CODE` | Audience phones (QR on slide) |

Replit sets `PORT` for you. WebSockets work on the same host.

## Local

```powershell
.\start.bat
# or:
$env:PUBLIC_BASE_URL = "http://localhost:8765"; python serve.py
```

## Match flow

1. Players scan QR and enter a nickname  
2. Host presses **S** to lock registration and build bracket  
3. Host presses **N** to start each match (5-second pick window)  
4. Players tap 🪨 📄 ✂️  
5. Choices reveal; winner advances  
6. Ties / no-picks replay automatically  

## Host Keyboard

| Key | Action |
|-----|--------|
| `Q` | Toggle QR |
| `S` | Lock + build bracket |
| `N` | Start match / advance |
| `R` | Reset |
| `A` | Admin panel |
| `M` | Sound (off by default) |
