/**
 * RPS Tournament — mobile-first player client (WebSocket)
 */

const ENABLE_LOGGING = true;
const PICK_EMOJI = { rock: "🪨", paper: "📄", scissors: "✂️" };
const PICK_LABEL = { rock: "Rock", paper: "Paper", scissors: "Scissors" };

function log(msg) {
  if (ENABLE_LOGGING) console.log(`[RPS Join] ${msg}`);
}

const params = new URLSearchParams(location.search);
const room = (params.get("room") || "").toUpperCase();
const app = document.getElementById("join-app");
const reconnectEl = document.getElementById("join-reconnect");

let playerId = localStorage.getItem(`rps-${room}-id`);
let playerName = localStorage.getItem(`rps-${room}-name`);
let state = null;
let ws = null;
let picked = false;
let config = null;
let reconnectAttempt = 0;
let revealShownFor = null;

async function loadConfig() {
  const backend = (window.RPS_BACKEND_URL || "").replace(/\/$/, "");
  const configUrl = backend ? `${backend}/api/config` : "/api/config";
  try {
    const res = await fetch(configUrl);
    if (!res.ok) throw new Error(`config ${res.status}`);
    config = await res.json();
    if (backend) {
      const wsProto = backend.startsWith("https") ? "wss" : "ws";
      const host = backend.replace(/^https?:\/\//, "");
      config.wsBaseUrl = `${wsProto}://${host}`;
    }
    log(`Config: ${config.wsBaseUrl}`);
  } catch (err) {
    log(`Config failed: ${err}`);
    if (backend) {
      const wsProto = backend.startsWith("https") ? "wss" : "ws";
      const host = backend.replace(/^https?:\/\//, "");
      config = { wsBaseUrl: `${wsProto}://${host}` };
    } else {
      config = {
        wsBaseUrl: `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`,
      };
    }
  }
}

function wsUrl() {
  const base = config?.wsBaseUrl || `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
  const q = new URLSearchParams({ role: "player" });
  if (playerId) q.set("playerId", playerId);
  return `${base}/ws/rps/${room}?${q}`;
}

function showReconnect(show) {
  reconnectEl?.classList.toggle("hidden", !show);
}

function connect() {
  if (!room) return;
  showReconnect(reconnectAttempt > 0);
  ws = new WebSocket(wsUrl());

  ws.onopen = () => {
    log("Connected");
    reconnectAttempt = 0;
    showReconnect(false);
    if (playerId && playerName) {
      ws.send(JSON.stringify({ type: "reconnect", playerId }));
    }
  };

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === "error") {
      if (msg.message === "Player not found") {
        playerId = playerName = null;
        localStorage.removeItem(`rps-${room}-id`);
        localStorage.removeItem(`rps-${room}-name`);
        renderJoinForm();
      } else {
        alert(msg.message);
      }
      return;
    }
    if (msg.type === "state") {
      if (msg.playerId) {
        playerId = msg.playerId;
        localStorage.setItem(`rps-${room}-id`, playerId);
        if (playerName) localStorage.setItem(`rps-${room}-name`, playerName);
      }
      onState(msg.data);
    }
  };

  ws.onclose = () => {
    log("Disconnected");
    if (playerId) {
      reconnectAttempt++;
      setTimeout(connect, Math.min(10000, 1000 * reconnectAttempt));
    }
  };
}

function send(msg) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function myMatch() {
  if (!state?.matches || !playerId) return null;
  return state.matches.find(
    (m) => state.activeMatchIds?.includes(m.id) && (m.p1Id === playerId || m.p2Id === playerId) && m.status !== "done"
  );
}

function amEliminated() {
  if (!state?.matches || !playerId) return false;
  if (state.champion) return state.champion !== playerName;
  const lost = state.matches.some(
    (m) => (m.p1Id === playerId || m.p2Id === playerId) && m.status === "done" && m.winnerId !== playerId
  );
  const stillIn = state.matches.some(
    (m) => (m.p1Id === playerId || m.p2Id === playerId) && m.status !== "done"
  );
  return lost && !stillIn && state.phase !== "champion";
}

function tournamentStatus() {
  if (!state) return "";
  if (state.champion) return `Champion: ${state.champion}`;
  if (state.phase === "registration" || state.phase === "idle") return state.statusMessage || "Waiting to start";
  if (state.phase === "building") return "Building bracket…";
  return state.statusMessage || "Tournament in progress";
}

function resultMessage(match, opponent) {
  const iAmP1 = match.p1Id === playerId;
  const won = match.winnerId === playerId;
  const outcome = match.outcome;

  if (outcome === "tie" || outcome === "timeout_both") return "Tie — run it back.";
  if (outcome === "timeout_p1") return iAmP1 ? "You did not choose." : "Opponent did not choose.";
  if (outcome === "timeout_p2") return iAmP1 ? "Opponent did not choose." : "You did not choose.";
  if (won) return "You win this round.";
  if (match.winner === opponent) return "You lost this round.";
  return state.funFact || "";
}

function countdownRing(seconds, total = 5) {
  const pct = Math.max(0, (seconds / total) * 100);
  return `
    <div class="join-timer" aria-live="polite">
      <svg class="join-timer-ring" viewBox="0 0 120 120">
        <circle class="join-timer-track" cx="60" cy="60" r="52"/>
        <circle class="join-timer-fill" cx="60" cy="60" r="52"
          style="stroke-dashoffset: ${326.7 * (1 - pct / 100)}"/>
      </svg>
      <span class="join-timer-num">${seconds}</span>
    </div>`;
}

function onState(data) {
  const prevMatch = myMatch();
  state = data;

  if (!state.players?.some((p) => p.id === playerId) && !state.registrationLocked && playerId) {
    playerId = playerName = null;
    localStorage.removeItem(`rps-${room}-id`);
    localStorage.removeItem(`rps-${room}-name`);
    picked = false;
    revealShownFor = null;
    renderJoinForm();
    return;
  }

  const match = myMatch();
  if (match?.status === "selecting" && prevMatch?.status !== "selecting") {
    picked = false;
    revealShownFor = null;
  }
  if (match?.status === "replay") {
    picked = false;
  }
  if (!match || match.status === "done") {
    picked = false;
    revealShownFor = null;
  }

  render();
}

function renderJoinForm() {
  app.innerHTML = `
    <header class="join-header">
      <h1 class="join-title">Rock Paper Scissors</h1>
      <p class="join-room">ROOM ${room}</p>
    </header>
    <form class="join-form" id="join-form">
      <label for="name">Nickname</label>
      <input id="name" name="name" maxlength="24" placeholder="Your name" required autocomplete="nickname"
        value="${playerName || ""}">
      <button type="submit" class="join-btn-primary">Join Tournament</button>
    </form>
    <p class="join-hint">Scan QR · enter name · you're in.</p>`;

  document.getElementById("join-form").onsubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    if (!name) return;
    playerName = name;
    localStorage.setItem(`rps-${room}-name`, name);
    send({ type: "join", name });
  };
}

function renderReveal(match, opponent) {
  const iAmP1 = match.p1Id === playerId;
  const myName = iAmP1 ? match.p1 : match.p2;
  const myPick = iAmP1 ? match.p1Pick : match.p2Pick;
  const oppPick = iAmP1 ? match.p2Pick : match.p1Pick;
  const won = match.winnerId === playerId;
  const tie = match.outcome === "tie" || match.outcome === "timeout_both";
  const myWin = won && !tie;
  const oppWin = !won && match.winner === opponent && !tie;

  return `
    <div class="join-reveal">
      <div class="join-versus">
        <div class="join-versus-side ${myWin ? "winner" : tie ? "tie-bounce" : oppWin ? "loser" : ""}">
          <span class="join-versus-emoji">${PICK_EMOJI[myPick] || "❓"}</span>
          <span class="join-versus-name">${myName}</span>
        </div>
        <span class="join-versus-vs">VS</span>
        <div class="join-versus-side ${oppWin ? "winner" : tie ? "tie-bounce" : myWin ? "loser" : ""}">
          <span class="join-versus-emoji">${PICK_EMOJI[oppPick] || "❓"}</span>
          <span class="join-versus-name">${opponent}</span>
        </div>
      </div>
      <p class="join-result-msg ${tie ? "tie" : won ? "win" : "lose"}">${resultMessage(match, opponent)}</p>
    </div>`;
}

function renderMatch(match) {
  const opponent = match.p1Id === playerId ? match.p2 : match.p1;
  const myPick = match.p1Id === playerId ? match.p1Pick : match.p2Pick;
  const roundLabel = state.phase === "final" ? "FINAL" : `ROUND ${match.round}`;
  const selecting = match.status === "selecting";
  const revealing = match.status === "reveal";
  const replaying = match.status === "replay";

  if (revealing) {
    return `
      <div class="join-match">
        <p class="join-tournament-status">${tournamentStatus()}</p>
        <p class="join-round">${roundLabel}</p>
        ${renderReveal(match, opponent)}
      </div>`;
  }

  if (replaying) {
    return `
      <div class="join-match">
        <p class="join-tournament-status">${tournamentStatus()}</p>
        <p class="join-round">${roundLabel}</p>
        <p class="join-opponent-label">vs</p>
        <p class="join-opponent">${opponent}</p>
        <p class="join-replay-msg">${state.statusMessage || "Tie — replaying"}</p>
      </div>`;
  }

  const locked = picked || !!myPick;
  const cd = selecting && state.countdown != null ? state.countdown : null;

  return `
    <div class="join-match">
      <p class="join-tournament-status">${tournamentStatus()}</p>
      <p class="join-round">${roundLabel}</p>
      <p class="join-opponent-label">Your opponent</p>
      <p class="join-opponent">${opponent}</p>
      ${cd != null ? countdownRing(cd) : ""}
      <div class="join-pick-grid ${locked ? "locked" : ""}">
        ${["rock", "paper", "scissors"].map((p) => `
          <button type="button" class="join-pick-btn ${myPick === p ? "selected" : ""}"
            data-pick="${p}" ${locked || !selecting ? "disabled" : ""}>
            <span class="join-pick-emoji">${PICK_EMOJI[p]}</span>
            <span class="join-pick-label">${PICK_LABEL[p]}</span>
          </button>`).join("")}
      </div>
      <p class="join-hint">${locked ? "Locked in — waiting…" : selecting ? "Pick fast — 5 seconds!" : "Waiting for match…"}</p>
    </div>`;
}

function render() {
  if (!state) return;

  if (state.champion) {
    app.innerHTML = `
      <div class="join-screen join-screen--center">
        <p class="join-tournament-status">${tournamentStatus()}</p>
        <h2 class="join-big-title">${state.champion === playerName ? "🏆 You won!" : "Tournament Over"}</h2>
        <p class="join-result-msg">${state.champion === playerName ? "Champion!" : `Champion: ${state.champion}`}</p>
      </div>`;
    return;
  }

  if (state.registrationLocked && !state.matches?.length) {
    app.innerHTML = `
      <div class="join-screen join-screen--center">
        <p class="join-tournament-status">Registration closed</p>
        <p class="join-hint">Bracket building…</p>
      </div>`;
    return;
  }

  const match = myMatch();

  if (!match && state.matches?.length) {
    if (amEliminated()) {
      app.innerHTML = `
        <div class="join-screen join-screen--center">
          <h2 class="join-big-title">Eliminated</h2>
          <p class="join-hint">Thanks for playing!</p>
        </div>`;
      return;
    }
    app.innerHTML = `
      <div class="join-screen join-screen--center">
        <p class="join-tournament-status">${tournamentStatus()}</p>
        <h2 class="join-big-title">✓ ${playerName}</h2>
        <p class="join-hint">Waiting for your match…</p>
      </div>`;
    return;
  }

  if (match) {
    app.innerHTML = renderMatch(match);
    if (match.status === "selecting" && !picked) {
      app.querySelectorAll(".join-pick-btn").forEach((btn) => {
        btn.onclick = () => {
          if (picked || btn.disabled) return;
          picked = true;
          btn.classList.add("selected");
          send({ type: "pick", playerId, choice: btn.dataset.pick });
          log(`Picked ${btn.dataset.pick}`);
        };
      });
    }
    return;
  }

  if (playerName) {
    app.innerHTML = `
      <div class="join-screen join-screen--center">
        <p class="join-tournament-status">${tournamentStatus()}</p>
        <h2 class="join-big-title">✓ ${playerName}</h2>
        <p class="join-hint">${state.players?.length || 0} players registered</p>
      </div>`;
    return;
  }

  renderJoinForm();
}

async function init() {
  if (!room) {
    app.innerHTML = "<p class='join-hint'>Invalid room link.</p>";
    return;
  }
  await loadConfig();
  connect();
  if (!playerId) renderJoinForm();
}

init();
