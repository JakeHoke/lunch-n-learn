# Lunch & Learn — GitHub Pages frontend

Static presentation site. Contents of this folder = repo root for Pages.

## Deploy Pages

1. Copy **everything inside** this folder to a GitHub repo root
2. Settings → Pages → Deploy from branch → `main` / root

## Connect live RPS (Replit backend)

1. Deploy the **full project** (not just this folder) on Replit — Run `python serve.py`
2. Set Replit Secret `PUBLIC_BASE_URL` to your Repl HTTPS URL
3. Edit `rps/config.js` in **this** Pages repo:

```js
window.RPS_BACKEND_URL = "https://YOUR-REPL.replit.app";
```

4. Push / redeploy Pages  
5. Open deck → `#slide-18` — should connect. QR opens Replit `/join?room=CODE`

| Link | Slide |
|------|--------|
| `#slide-18` | RPS tournament |
| `#slide-19` | Q&A |

Smoke-check API: `https://YOUR-REPL/api/health`

## Included

| Path | Purpose |
|------|---------|
| `index.html` | Presentation shell |
| `slides/` | Slide partials |
| `styles.css` / `script.js` | Deck UI |
| `experimental/` | Experiment gallery (`E`) |
| `join.html` | Audience join (Pages path; optional) |
| `rps/` | Tournament host + join + `config.js` |
| `poster.html` | Puzzle poster |
| `.nojekyll` | Skip Jekyll |

## Not included

Python server — lives in the parent project, run on Replit.
