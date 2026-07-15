/**
 * Rock Paper Scissors Tournament — host controller (WebSocket)
 */

const RPS_ENABLE_LOGGING = true;
const PICK_EMOJI = { rock: "🪨", paper: "📄", scissors: "✂️" };
const MATCH_SECONDS = 5;

function rpsLog(msg, data) {
  if (!RPS_ENABLE_LOGGING) return;
  if (data !== undefined) console.log(`[RPS Host] ${msg}`, data);
  else console.log(`[RPS Host] ${msg}`);
}

class RPSTournamentHost {
  constructor(rootEl, adminEl) {
    this.root = rootEl;
    this.adminEl = adminEl;
    this.code = null;
    this.state = null;
    this.ws = null;
    this.active = false;
    this.adminVisible = false;
    this.knownPlayerIds = new Set();
    this.revealTimer = null;
    this.confettiId = null;
    this.audioCtx = null;
    this.config = null;
    this.joinUrl = "";
    this.reconnectTimer = null;
    this.pingId = null;
    this._confettiDone = false;
    this._prevCountdown = null;
    this._prevP1Pick = null;
    this._prevP2Pick = null;
    this._prevMatchStatus = null;
  }

  async loadConfig() {
    const backend = (window.RPS_BACKEND_URL || "").replace(/\/$/, "");
    const configUrl = backend ? `${backend}/api/config` : "/api/config";
    try {
      const res = await fetch(configUrl);
      if (!res.ok) throw new Error(`config ${res.status}`);
      this.config = await res.json();
      if (backend) {
        // Always prefer the configured backend for WS when Pages≠API
        const wsProto = backend.startsWith("https") ? "wss" : "ws";
        const host = backend.replace(/^https?:\/\//, "");
        this.config.wsBaseUrl = `${wsProto}://${host}`;
        this.config.apiBaseUrl = backend;
      }
      rpsLog("Config loaded", this.config);
    } catch (err) {
      rpsLog("Config fetch failed", err);
      if (backend) {
        const wsProto = backend.startsWith("https") ? "wss" : "ws";
        const host = backend.replace(/^https?:\/\//, "");
        this.config = {
          publicBaseUrl: backend,
          apiBaseUrl: backend,
          wsBaseUrl: `${wsProto}://${host}`,
          joinPath: "/join",
        };
      } else {
        const origin = location.origin;
        const wsProto = location.protocol === "https:" ? "wss:" : "ws:";
        this.config = {
          publicBaseUrl: origin,
          wsBaseUrl: `${wsProto}//${location.host}`,
          joinPath: "/join",
        };
      }
      rpsLog("Config fallback", this.config);
    }
    return this.config;
  }

  buildJoinUrl(code) {
    const c = (code || this.code || "").toUpperCase();
    const backend = (window.RPS_BACKEND_URL || "").replace(/\/$/, "");
    if (backend) return `${backend}/join?room=${c}`;
    const path = this.config?.joinPath || "/join";
    return `${this.publicBase()}${path}?room=${c}`;
  }

  qrUrl(text) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(text)}`;
  }

  wsBase() {
    return this.config?.wsBaseUrl || `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
  }

  publicBase() {
    return this.config?.publicBaseUrl || location.origin;
  }

  playSound(type) {
    if (!this.state?.soundEnabled) return;
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      const freqs = { join: 520, lock: 380, reveal: 640, win: 880, tick: 440, submit: 500 };
      osc.frequency.value = freqs[type] || 500;
      const dur = type === "tick" ? 0.08 : 0.15;
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + dur);
      osc.start();
      osc.stop(this.audioCtx.currentTime + dur);
    } catch (_) { /* ignore */ }
  }

  connectWs() {
    const url = `${this.wsBase()}/ws/rps/host`;
    rpsLog("WS connect", url);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      rpsLog("WS open");
      this.pingId = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 25000);
    };

    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "state") this.onState(msg.data);
      if (msg.type === "error") rpsLog("WS error", msg.message);
    };

    this.ws.onclose = () => {
      rpsLog("WS closed — reconnecting");
      clearInterval(this.pingId);
      if (this.active && this.code) {
        this.reconnectTimer = setTimeout(() => this.reconnectHost(), 2000);
      }
    };
  }

  reconnectHost() {
    if (!this.active || !this.code) return;
    const url = `${this.wsBase()}/ws/rps/${this.code}?role=host`;
    rpsLog("Host reconnect", url);
    this.ws = new WebSocket(url);
    this.ws.onopen = () => rpsLog("Host reconnected");
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "state") this.onState(msg.data);
    };
    this.ws.onclose = () => {
      if (this.active) this.reconnectTimer = setTimeout(() => this.reconnectHost(), 3000);
    };
  }

  sendHost(command, extra = {}) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "host", command, ...extra }));
  }

  activeMatch() {
    const ids = this.state?.activeMatchIds || [];
    return this.state?.matches?.find((m) => ids.includes(m.id) && m.status !== "done");
  }

  onState(data) {
    const prevCount = this.state?.players?.length || 0;
    const match = data.matches?.find((m) => data.activeMatchIds?.includes(m.id) && m.status !== "done");

    if ((data.players?.length || 0) > prevCount) this.playSound("join");

    if (data.countdown != null && data.countdown !== this._prevCountdown && data.countdown > 0) {
      this.playSound("tick");
    }
    this._prevCountdown = data.countdown;

    if (match) {
      if (match.p1Pick && !this._prevP1Pick) this.playSound("submit");
      if (match.p2Pick && !this._prevP2Pick) this.playSound("submit");
      this._prevP1Pick = match.p1Pick;
      this._prevP2Pick = match.p2Pick;

      if (match.status === "reveal" && this._prevMatchStatus !== "reveal") {
        this.playSound("reveal");
        if (!this.revealTimer) {
          this.revealTimer = setTimeout(() => {
            this.revealTimer = null;
            this.sendHost("advance");
            this.playSound("win");
          }, 2800);
        }
      }
      if (match.status === "selecting" && this._prevMatchStatus !== "selecting") {
        this._prevP1Pick = null;
        this._prevP2Pick = null;
      }
      this._prevMatchStatus = match.status;
    } else {
      this._prevP1Pick = this._prevP2Pick = null;
      this._prevMatchStatus = null;
    }

    this.state = data;
    if (!this.code && data.code) {
      this.code = data.code;
      this.joinUrl = this.buildJoinUrl(this.code);
      rpsLog("Room ready", { code: this.code, joinUrl: this.joinUrl });
    }
    // Prefer Pages-configured backend URL for QR (avoid stale Replit preview hosts)
    if (this.code) {
      this.joinUrl = this.buildJoinUrl(this.code);
      data.joinUrl = this.joinUrl;
    }

    if (data.phase === "champion" && !this._confettiDone) {
      this._confettiDone = true;
      this.launchConfetti();
      this.playSound("win");
    }

    this.render();
    this.renderAdmin();
  }

  async mount() {
    this.active = true;
    await this.loadConfig();
    this.connectWs();
    this.renderAdmin();
    this.render();
    rpsLog("Mounted");
  }

  unmount() {
    this.active = false;
    clearTimeout(this.revealTimer);
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pingId);
    if (this.ws) this.ws.close();
    cancelAnimationFrame(this.confettiId);
    this.root.innerHTML = "";
    if (this.adminEl) this.adminEl.classList.add("hidden");
    rpsLog("Unmounted");
  }

  handleKey(e) {
    if (!this.active) return false;
    const k = e.key.toLowerCase();
    if (!"qsrnam".includes(k)) return false;
    e.preventDefault();
    e.stopPropagation();

    switch (k) {
      case "q": this.sendHost("toggle_qr"); break;
      case "s": this.lockAndBuild(); break;
      case "r": this.resetTournament(); break;
      case "n": this.sendHost("advance"); break;
      case "a":
        this.adminVisible = !this.adminVisible;
        this.adminEl?.classList.toggle("hidden", !this.adminVisible);
        break;
      case "m": this.sendHost("toggle_sound"); break;
    }
    return true;
  }

  async lockAndBuild() {
    if (!this.state?.players?.length) return;
    this.playSound("lock");
    this.sendHost("lock");
    await new Promise((r) => setTimeout(r, 1200));
    this.sendHost("build_bracket");
    this._confettiDone = false;
  }

  resetTournament() {
    clearTimeout(this.revealTimer);
    this.revealTimer = null;
    this._confettiDone = false;
    this._prevCountdown = null;
    this._prevP1Pick = this._prevP2Pick = null;
    this.knownPlayerIds.clear();
    this.sendHost("reset");
    this.playSound("tick");
  }

  renderAdmin() {
    if (!this.adminEl) return;
    const active = this.state?.activeMatchIds?.[0];
    this.adminEl.innerHTML = `
      <strong>Host Controls</strong> <span style="color:#6b7a94">(hidden)</span><br>
      <kbd>Q</kbd> QR · <kbd>S</kbd> Start · <kbd>N</kbd> Next match<br>
      <kbd>R</kbd> Reset · <kbd>M</kbd> Sound · <kbd>A</kbd> Hide<br>
      <div class="rps-admin-actions">
        <button type="button" class="rps-admin-btn" data-cmd="force_reveal">Force Reveal</button>
        <button type="button" class="rps-admin-btn" data-cmd="advance">Advance Round</button>
        ${active ? `<button type="button" class="rps-admin-btn" data-cmd="force_advance_match" data-mid="${active}">Force Win P1</button>` : ""}
      </div>
      <span class="rps-sound-status">Sound: ${this.state?.soundEnabled ? "on" : "off"}</span>`;

    this.adminEl.querySelectorAll(".rps-admin-btn").forEach((btn) => {
      btn.onclick = () => {
        const cmd = btn.dataset.cmd;
        const extra = btn.dataset.mid ? { matchId: parseInt(btn.dataset.mid, 10) } : {};
        this.sendHost(cmd, extra);
      };
    });
  }

  countdownRing(seconds) {
    const pct = Math.max(0, (seconds / MATCH_SECONDS) * 100);
    return `
      <div class="rps-timer">
        <svg class="rps-timer-ring" viewBox="0 0 100 100">
          <circle class="rps-timer-track" cx="50" cy="50" r="42"/>
          <circle class="rps-timer-fill" cx="50" cy="50" r="42"
            style="stroke-dashoffset: ${264 * (1 - pct / 100)}"/>
        </svg>
        <span class="rps-timer-num">${seconds}</span>
      </div>`;
  }

  renderBracket() {
    if (!this.state?.matches?.length) return "";
    const rounds = {};
    this.state.matches.forEach((m) => {
      if (!rounds[m.round]) rounds[m.round] = [];
      rounds[m.round].push(m);
    });
    const active = new Set(this.state.activeMatchIds || []);
    const isFinal = this.state.phase === "final";

    return `<div class="rps-bracket">${Object.keys(rounds).sort((a, b) => a - b).map((rnd) => `
      <div class="rps-bracket-round">
        ${rounds[rnd].map((m) => {
          const cls = ["rps-match"];
          if (active.has(m.id)) cls.push("active");
          if (m.status === "reveal") cls.push("reveal");
          if (m.status === "done" && m.winner) cls.push("done");
          if (isFinal && active.has(m.id)) cls.push("final");
          const showPick = m.status === "reveal" || m.status === "done";
          return `<div class="${cls.join(" ")}">
            <div class="rps-match-player ${m.winner === m.p1 ? "winner" : ""} ${m.p1Pick && !showPick ? "submitted" : ""}">
              <span>${m.p1}</span>
              <span class="pick">${showPick ? (PICK_EMOJI[m.p1Pick] || "—") : m.p1Pick ? "✓" : ""}</span>
            </div>
            <div class="rps-match-player ${m.winner === m.p2 ? "winner" : ""} ${m.p2Pick && !showPick ? "submitted" : ""}">
              <span>${m.p2}</span>
              <span class="pick">${showPick ? (PICK_EMOJI[m.p2Pick] || "—") : m.p2Pick ? "✓" : ""}</span>
            </div>
          </div>`;
        }).join("")}
      </div>`).join("")}</div>`;
  }

  renderArena() {
    const m = this.activeMatch();
    if (!m) return "";
    const selecting = m.status === "selecting";
    const revealing = m.status === "reveal";
    const replaying = m.status === "replay";
    const cd = this.state.countdown;

    let msg = this.state.statusMessage || "Waiting for choices…";
    if (replaying) msg = this.state.statusMessage || "Tie — replaying";
    else if (revealing) msg = "Reveal!";
    else if (selecting) msg = "Waiting for choices…";

    const showPicks = revealing;
    const p1Cls = ["rps-arena-side"];
    const p2Cls = ["rps-arena-side"];
    if (revealing) {
      if (m.winner === m.p1) p1Cls.push("winner");
      else if (m.winner === m.p2) p2Cls.push("winner");
      else { p1Cls.push("tie-bounce"); p2Cls.push("tie-bounce"); }
      if (m.winner === m.p2) p1Cls.push("loser");
      if (m.winner === m.p1) p2Cls.push("loser");
    } else if (selecting) {
      if (m.p1Pick) p1Cls.push("submitted");
      if (m.p2Pick) p2Cls.push("submitted");
    }

    return `<div class="rps-arena ${revealing ? "rps-arena--reveal" : ""}">
      ${selecting && cd != null ? this.countdownRing(cd) : ""}
      <div class="rps-arena-players">
        <div class="${p1Cls.join(" ")}">
          <div class="rps-arena-name">${m.p1}</div>
          <div class="rps-arena-picks ${showPicks ? "revealed" : ""}">
            ${showPicks ? (PICK_EMOJI[m.p1Pick] || "—") : m.p1Pick ? '<span class="rps-locked">✓</span>' : '<span class="rps-hidden">?</span>'}
          </div>
        </div>
        <div class="rps-arena-vs">VS</div>
        <div class="${p2Cls.join(" ")}">
          <div class="rps-arena-name">${m.p2}</div>
          <div class="rps-arena-picks ${showPicks ? "revealed" : ""}">
            ${showPicks ? (PICK_EMOJI[m.p2Pick] || "—") : m.p2Pick ? '<span class="rps-locked">✓</span>' : '<span class="rps-hidden">?</span>'}
          </div>
        </div>
      </div>
      <p class="rps-arena-msg">${msg}</p>
      ${this.state.funFact && revealing ? `<p class="rps-fun-fact">${this.state.funFact}</p>` : ""}
    </div>`;
  }

  render() {
    const s = this.state;
    if (!s) {
      this.root.innerHTML = `<h2 class="rps-title">Rock Paper Scissors Tournament</h2>
        <p class="rps-subtitle">Think you can beat everyone in the room?</p>
        <p class="rps-status rps-status--pulse">Connecting to server...</p>
        <button type="button" class="rps-end-btn" id="rps-end-btn">End</button>`;
      const endBtn = this.root.querySelector("#rps-end-btn");
      if (endBtn) {
        endBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.endTournament();
        };
      }
      return;
    }

    const m = this.activeMatch();
    const showArena = m && ["selecting", "reveal", "replay"].includes(m.status);
    const showBracket = ["bracket", "match", "final", "champion"].includes(s.phase) && s.bracketVisible && !showArena;
    const building = s.phase === "building";

    let center = "";
    if (s.phase === "champion" && s.champion) {
      center = `<div class="rps-champion"><div class="rps-champion-trophy">🏆</div>
        <div class="rps-champion-label">Champion</div><div class="rps-champion-name">${s.champion}</div></div>`;
    } else if (building) {
      center = `<div class="rps-building">${s.statusMessage}${s.buildingStep === 2 ? "..." : ""}</div>`;
    } else if (showArena) {
      center = this.renderArena();
    } else if (showBracket) {
      center = `<div class="rps-bracket-wrap visible">${this.renderBracket()}</div>`;
    } else if (s.matches?.length && !m) {
      center = `<div class="rps-ready"><p>${s.statusMessage || "Press N to start match"}</p></div>`;
    }

    const players = (s.players || []).map((p) => {
      if (!this.knownPlayerIds.has(p.id)) this.knownPlayerIds.add(p.id);
      return `<div class="rps-player-chip"><span class="rps-avatar">${p.initials}</span><span>✓ ${p.name}</span></div>`;
    }).join("");

    const url = this.buildJoinUrl(s.code) || s.joinUrl || this.joinUrl;
    const statusCls = s.phase === "idle" ? "rps-status rps-status--pulse" : "rps-status";
    const soundIcon = s.soundEnabled ? "🔊" : "🔇";

    this.root.innerHTML = `
      <h2 class="rps-title">Rock Paper Scissors Tournament</h2>
      <p class="rps-subtitle">Think you can beat everyone in the room?</p>
      <p class="${statusCls}">${s.statusMessage || "Waiting for registration..."}</p>
      <div class="rps-main">
        <aside class="rps-qr-panel ${s.qrVisible ? "visible" : ""}">
          <img src="${this.qrUrl(url)}" alt="Join QR code" width="200" height="200">
          <div class="rps-room-code">${s.code}</div>
          <div class="rps-join-url">${url}</div>
          <div class="rps-player-count">${s.players?.length || 0} connected</div>
        </aside>
        <div class="rps-center">
          ${players && s.phase !== "champion" ? `<div class="rps-players">${players}</div>` : ""}
          ${center}
        </div>
      </div>
      <div class="rps-sound-hint" title="Press M to toggle">${soundIcon}</div>
      <button type="button" class="rps-end-btn" id="rps-end-btn">End</button>
      <canvas class="rps-confetti-canvas" id="rps-confetti"></canvas>`;

    const endBtn = this.root.querySelector("#rps-end-btn");
    if (endBtn) {
      endBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.endTournament();
      };
    }
  }

  endTournament() {
    rpsLog("End → Q&A");
    if (typeof window.endRPSAndGoToQA === "function") {
      window.endRPSAndGoToQA();
    } else {
      rpsLog("endRPSAndGoToQA missing");
    }
  }

  launchConfetti() {
    const canvas = this.root.querySelector("#rps-confetti");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = this.root.clientWidth;
    canvas.height = this.root.clientHeight;
    const pieces = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width, y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, rot: Math.random() * 6,
      color: Math.random() > 0.5 ? "#f0b429" : "#3b82f6",
      w: 6 + Math.random() * 6, h: 4 + Math.random() * 4,
    }));
    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.rot += 0.05;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, 1 - frame / 200);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      frame++;
      if (frame < 200) this.confettiId = requestAnimationFrame(draw);
    };
    draw();
  }

  isActive() { return this.active; }
}

let rpsInstance = null;

function initRPSTournament(slideEl) {
  const root = slideEl.querySelector("#rps-tournament");
  const admin = document.getElementById("rps-admin");
  if (!root) return () => {};
  rpsInstance = new RPSTournamentHost(root, admin);
  rpsInstance.mount();
  return () => { rpsInstance?.unmount(); rpsInstance = null; };
}

window.RPSTournament = {
  isActive: () => rpsInstance?.isActive() ?? false,
  handleKey: (e) => rpsInstance?.handleKey(e) ?? false,
};
window.initRPSTournament = initRPSTournament;
