/**
 * RPS backend pointer — used when the deck is on GitHub Pages
 * and the Python API lives on Replit (or another host).
 *
 * Leave "" for same-origin (local serve.py / full-stack Replit).
 * After Replit is live, set to your Repl URL, e.g.:
 *   "https://lnl-xxxxxx.replit.app"
 *
 * Toggle logging with RPS_CONFIG_LOGGING.
 */
const RPS_CONFIG_LOGGING = true;
window.RPS_BACKEND_URL = "https://rps.jakehoke.com"; // ← Pages → Replit API/WS

if (RPS_CONFIG_LOGGING) {
  console.log(
    "[RPS Config] RPS_BACKEND_URL=",
    window.RPS_BACKEND_URL || "(same-origin)",
  );
}
