# Lunch & Learn — GitHub Pages frontend

Static presentation site. Contents of this folder = repo root for Pages.

## Deploy

1. Create a GitHub repo
2. Copy **everything inside** `github/` to the repo root (not the `github` folder itself)
3. Settings → Pages → Deploy from branch → `main` / root
4. Optional: custom domain `lnl.jakehoke.com`

Open `index.html` or your Pages URL. Press **F** for fullscreen.

| Link | Slide |
|------|--------|
| `#slide-18` | RPS tournament |
| `#slide-19` | Q&A |

Audience join: `join.html?room=CODE` (needs the live Python/Replit backend for WebSockets).

## Included

| Path | Purpose |
|------|---------|
| `index.html` | Presentation shell |
| `slides/` | Slide partials (19 visible + 1 hidden ref) |
| `styles.css` / `script.js` | Deck UI |
| `experimental/` | Experiment gallery (`E`) |
| `join.html` | Audience RPS join page (Pages entry) |
| `rps/` | Tournament host + join clients |
| `poster.html` | Puzzle poster |
| `.nojekyll` | Forces GitHub Pages to skip Jekyll |

## Attention Span Assist

Press `V` for the side panel. `1` / `2` switch muted autoplay YouTube embeds (IDs in `ATTENTION_VIDEOS` inside `script.js`).

## Not included (backend)

Python / Replit server stays outside this folder. Live RPS needs that API — slides and join UI still load standalone; the host **End** button advances to Q&A either way.
