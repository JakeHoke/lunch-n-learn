/**
 * You Don't Know What You Know — SPA Presentation Controller
 * Dynamic slide partials · lazy preload · in-memory cache · hash routing
 */

const ENABLE_LOGGING = true;
const LOG_FILE_NOTE = "Open browser DevTools console for runtime logs.";

const PRELOAD_BEHIND = 1;
const PRELOAD_AHEAD = 2;
const HIDDEN_INDEX = 19;

// ── Slide manifest (metadata + partial paths) ──
const SLIDE_MANIFEST = [
  { file: "slides/slide-01.html", notes: "Start blank. Reveal 1: lead-in. Reveal 2: raise-your-hand question. Reveal 3: 'What was it?' — let a few share. Goal: they already know things others don't." },
  { file: "slides/slide-02.html", notes: "Reveal the title, then say: 'That's what today's Lunch & Learn is about.'" },
  { file: "slides/slide-03.html", notes: "Press V for YouTube side panel (1 Subway Surfers, 2 Minecraft parkour). After a few seconds, toggle off: 'If I need this after the first five minutes, I'm doing something wrong.'" },
  // —— Brief intro ——
  { file: "slides/slide-04.html", notes: "Quick who-I-am. Plain and short — don't turn it into a bio speech." },
  { file: "slides/slide-05.html", notes: "Why they should listen. Verbally: I thought I knew a lot — I still stand to learn. Don't put that on screen. Then bridge into thesis." },
  // —— Main presentation ——
  { file: "slides/slide-14.html", notes: "This is the core thesis. Pause here. Let it land." },
  { file: "slides/slide-16.html", notes: "Curiosity is not random wandering. It compounds when you keep following questions." },
  { file: "slides/slide-17.html", notes: "Pick one from the list. Ask: What are five intentional decisions behind how this works? Then: What problem were they trying to solve?" },
  { file: "slides/slide-18.html", notes: "Quick examples — don't read every card. Pick 2-3 that resonate with the room." },
  { file: "slides/slide-hint.html", notes: "Puzzle beat. Press H to show the next hint. No staged reveals on this slide." },
  { file: "slides/slide-19.html", notes: "Being close to emerging behavior is an advantage. Ask for examples from the room." },
  { file: "slides/slide-20.html", notes: "Young people often see technology and culture shifts early because they live inside them." },
  { file: "slides/slide-21.html", notes: "These are concrete examples of how small observations become real value." },
  { file: "slides/slide-22.html", notes: "Practical habits, not a TED talk. Ask them to pick one thing they'd actually do." },
  { file: "slides/slide-23.html", notes: "Land these three. Don't rush the ending." },
  { file: "slides/slide-24.html", notes: "End with silence. Let them think. The opportunity might be hiding inside that." },
  { file: "slides/slide-engagement.html", notes: "Setup for RPS. Keep it light — then advance into the tournament." },
  { file: "slides/slide-rps.html", notes: "RPS TOURNAMENT · Q=QR · S=start/lock bracket · N=next match/round · R=reset · A=admin · M=sound. End button → Q&A." },
  { file: "slides/slide-qa.html", notes: "Optional Q&A. Skip if the room is done." },
  { file: "slides/slide-ref.html", notes: "REFERENCE ONLY — Puzzle winner phone recording script. Do not present this slide normally.", hidden: true },
];

// ── Puzzle hints ──
const PUZZLE_HINTS = [
  "Three clues. One answer.",
  "The format matters.",
  "You may need a phone.",
  "Letters can be numbers too.",
  "85 75 STOCKS.",
];

// ── Global state ──
const state = {
  currentSlide: 0,
  revealStep: 0,
  onRefSlide: false,
  videoPanelOpen: false,
  currentLoop: 1,
  hudVisible: false,
  hintIndex: 0,
  helpVisible: false,
  slideCache: new Map(),
  mountedSlides: new Map(),
  revealSteps: {},
  slideCleanups: new Map(),
  isNavigating: false,
};

// ── DOM refs ──
const els = {
  presentation: document.getElementById("presentation"),
  slideContainer: document.getElementById("slide-container"),
  slideLoading: document.getElementById("slide-loading"),
  progressBar: document.getElementById("progress-bar"),
  slidePagination: document.getElementById("slide-pagination"),
  btnPrev: document.getElementById("btn-prev"),
  btnNext: document.getElementById("btn-next"),
  videoPanel: document.getElementById("video-panel"),
  attentionVideo: document.getElementById("attention-video"),
  loopCaption: document.getElementById("loop-caption"),
  closePanel: document.getElementById("close-panel"),
  hud: document.getElementById("presenter-hud"),
  hudCurrent: document.getElementById("hud-current"),
  hudTotal: document.getElementById("hud-total"),
  hudNotes: document.getElementById("hud-notes"),
  puzzleOverlay: document.getElementById("puzzle-overlay"),
  hintNumber: document.getElementById("hint-number"),
  hintText: document.getElementById("hint-text"),
  helpOverlay: document.getElementById("help-overlay"),
  helpClose: document.getElementById("help-close"),
};

// ── Logging ──
function log(msg, data) {
  if (!ENABLE_LOGGING) return;
  const ts = new Date().toISOString();
  if (data !== undefined) console.log(`[L&L ${ts}] ${msg}`, data);
  else console.log(`[L&L ${ts}] ${msg}`);
}

log("SPA shell initialized.", LOG_FILE_NOTE);

// ── Helpers ──
function visibleCount() {
  return SLIDE_MANIFEST.filter((s) => !s.hidden).length;
}

function getActiveSlideEl() {
  return els.slideContainer.querySelector(".slide.active");
}

function setLoading(show) {
  els.slideLoading.classList.toggle("hidden", !show);
}

// ── URL hash routing ──
let suppressHashNav = false;

function slideHash(num) {
  return `#slide-${num}`;
}

function parseHash() {
  const match = window.location.hash.match(/^#slide-(\d+)$/);
  if (!match) return null;
  const index = parseInt(match[1], 10) - 1;
  if (index >= 0 && index < visibleCount()) return index;
  return null;
}

function updateHash(slideNum1Indexed) {
  const hash = slideHash(slideNum1Indexed);
  if (window.location.hash !== hash) {
    suppressHashNav = true;
    history.replaceState(null, "", hash);
    suppressHashNav = false;
    log(`Hash updated: ${hash}`);
  }
}

// ── Reveal system ──
function getMaxReveals(slideEl) {
  const items = slideEl.querySelectorAll("[data-reveal]");
  if (!items.length) return 0;
  return Math.max(...[...items].map((el) => parseInt(el.dataset.reveal, 10)));
}

function getRevealStepFromElement(slideEl) {
  const revealed = slideEl.querySelectorAll("[data-reveal].revealed");
  if (!revealed.length) return 0;
  return Math.max(...[...revealed].map((el) => parseInt(el.dataset.reveal, 10)));
}

function updateReveals(slideEl, step) {
  slideEl.querySelectorAll("[data-reveal]").forEach((el) => {
    const needed = parseInt(el.dataset.reveal, 10);
    el.classList.toggle("revealed", needed <= step);
  });
}

function saveCurrentRevealState() {
  const active = getActiveSlideEl();
  if (!active) return;
  const idx = parseInt(active.dataset.manifestIndex, 10);
  state.revealSteps[idx] = state.revealStep;
}

// ── Preload window: prev 1 + current + next 2 ──
function getPreloadIndices(centerVisibleIndex) {
  const indices = [];
  for (let offset = -PRELOAD_BEHIND; offset <= PRELOAD_AHEAD; offset++) {
    const idx = centerVisibleIndex + offset;
    if (idx >= 0 && idx < visibleCount()) indices.push(idx);
  }
  return indices;
}

// ── Slide partial loader & cache ──
async function fetchSlideHtml(manifestIndex) {
  if (state.slideCache.has(manifestIndex)) {
    log(`Cache hit: manifest ${manifestIndex}`);
    return state.slideCache.get(manifestIndex);
  }

  const entry = SLIDE_MANIFEST[manifestIndex];
  log(`Fetching partial: ${entry.file}`);
  // Cache-bust so edited partials aren't served from a stale browser cache
  const response = await fetch(`${entry.file}?v=${Date.now()}`);
  if (!response.ok) throw new Error(`Failed to load ${entry.file} (${response.status})`);
  const html = await response.text();
  state.slideCache.set(manifestIndex, html);
  return html;
}

// ── Per-slide interactive init / teardown ──
function initChoiceCards(slideEl) {
  const grid = slideEl.querySelector('[data-interactive="choice-cards"]');
  if (!grid) return () => {};

  const handler = (e) => {
    const card = e.target.closest(".card");
    if (!card || !grid.contains(card)) return;
    grid.querySelectorAll(".card").forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    log("Audience choice card selected");
  };

  const keyHandler = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.target.click();
    }
  };

  grid.addEventListener("click", handler);
  grid.querySelectorAll(".card").forEach((card) => card.addEventListener("keydown", keyHandler));

  return () => {
    grid.removeEventListener("click", handler);
    grid.querySelectorAll(".card").forEach((card) => card.removeEventListener("keydown", keyHandler));
  };
}

function initObservationPills(slideEl) {
  const row = slideEl.querySelector('[data-interactive="observation-pills"]');
  if (!row) return () => {};

  const handler = (e) => {
    const pill = e.target.closest(".pill");
    if (!pill || !row.contains(pill)) return;
    row.querySelectorAll(".pill").forEach((p) => p.classList.remove("selected"));
    pill.classList.add("selected");
    log(`Observation target: ${pill.textContent}`);
  };

  const keyHandler = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.target.click();
    }
  };

  row.addEventListener("click", handler);
  row.querySelectorAll(".pill").forEach((pill) => pill.addEventListener("keydown", keyHandler));

  return () => {
    row.removeEventListener("click", handler);
    row.querySelectorAll(".pill").forEach((pill) => pill.removeEventListener("keydown", keyHandler));
  };
}

function initWorldMap(slideEl) {
  const map = slideEl.querySelector('[data-interactive="world-map"]');
  if (!map) return () => {};

  const caption = map.querySelector(".map-caption");
  const pins = map.querySelectorAll(".map-pin");

  const handler = (e) => {
    const pin = e.target.closest(".map-pin");
    if (!pin) return;
    pins.forEach((p) => p.classList.remove("active"));
    pin.classList.add("active");
    if (caption) caption.textContent = pin.dataset.country || pin.textContent;
    log(`Map pin: ${pin.dataset.country}`);
  };

  map.addEventListener("click", handler);
  return () => map.removeEventListener("click", handler);
}

const SLIDE_INIT_HOOKS = {
  7: initObservationPills,
  17: hookRPSTournament,
};

/** Delegates to rps/rps-host.js (must not share the name initRPSTournament — that collides on window). */
function hookRPSTournament(slideEl) {
  const mount = window.initRPSTournament;
  if (typeof mount !== "function") {
    log("RPS host script not loaded");
    return () => {};
  }
  return mount(slideEl);
}

function initSlideInteractives(manifestIndex, slideEl) {
  const hook = SLIDE_INIT_HOOKS[manifestIndex];
  if (!hook) return;
  const cleanup = hook(slideEl);
  if (typeof cleanup === "function") {
    state.slideCleanups.set(manifestIndex, cleanup);
  }
  log(`Slide interactives initialized: ${manifestIndex + 1}`);
}

function teardownSlideInteractives(manifestIndex) {
  const cleanup = state.slideCleanups.get(manifestIndex);
  if (cleanup) {
    cleanup();
    state.slideCleanups.delete(manifestIndex);
    log(`Slide interactives torn down: ${manifestIndex + 1}`);
  }
}

function wrapSlideForFit(section) {
  const content = section.querySelector(".slide-content");
  if (!content || content.parentElement?.classList.contains("slide-fit")) return;
  // RPS is full-bleed — don't scale-wrap
  if (content.classList.contains("rps-slide-root")) return;

  const fit = document.createElement("div");
  fit.className = "slide-fit";
  content.replaceWith(fit);
  fit.appendChild(content);
}

function fitSlideEl(slideEl) {
  if (!slideEl) return;
  const fit = slideEl.querySelector(".slide-fit");
  const content = slideEl.querySelector(".slide-content");
  if (!fit || !content) return;

  content.style.transform = "none";
  fit.style.width = "auto";
  fit.style.height = "auto";

  const cs = getComputedStyle(slideEl);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const availW = Math.max(0, slideEl.clientWidth - padX);
  const availH = Math.max(0, slideEl.clientHeight - padY);
  const naturalW = content.offsetWidth;
  const naturalH = content.offsetHeight;
  if (!naturalW || !naturalH || !availW || !availH) return;

  const scale = Math.min(1, availW / naturalW, availH / naturalH);
  if (scale < 0.999) {
    content.style.transformOrigin = "top left";
    content.style.transform = `scale(${scale})`;
    fit.style.width = `${Math.floor(naturalW * scale)}px`;
    fit.style.height = `${Math.floor(naturalH * scale)}px`;
    log(`Slide fit scale=${scale.toFixed(3)} (${naturalW}x${naturalH} into ${availW}x${availH})`);
  } else {
    content.style.transform = "";
    fit.style.width = "";
    fit.style.height = "";
  }
}

function scheduleFitActiveSlide() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => fitSlideEl(getActiveSlideEl()));
  });
}

async function ensureSlideMounted(manifestIndex) {
  if (state.mountedSlides.has(manifestIndex)) {
    return state.mountedSlides.get(manifestIndex);
  }

  const html = await fetchSlideHtml(manifestIndex);
  const entry = SLIDE_MANIFEST[manifestIndex];
  const section = document.createElement("section");
  section.className = "slide" + (entry.hidden ? " hidden-slide" : "");
  section.id = entry.hidden ? "slide-ref" : `slide-${manifestIndex + 1}`;
  section.dataset.manifestIndex = String(manifestIndex);
  section.dataset.notes = entry.notes;
  section.innerHTML = html;
  wrapSlideForFit(section);

  els.slideContainer.appendChild(section);
  state.mountedSlides.set(manifestIndex, section);

  initSlideInteractives(manifestIndex, section);

  const revealStep = state.revealSteps[manifestIndex] || 0;
  updateReveals(section, revealStep);

  return section;
}

async function preloadWindow(centerVisibleIndex) {
  const indices = state.onRefSlide ? [HIDDEN_INDEX] : getPreloadIndices(centerVisibleIndex);
  await Promise.all(indices.map((idx) => ensureSlideMounted(idx)));
  pruneMountedSlides(new Set(indices));
}

function pruneMountedSlides(keepSet) {
  state.mountedSlides.forEach((el, manifestIndex) => {
    if (keepSet.has(manifestIndex)) return;
    state.revealSteps[manifestIndex] = getRevealStepFromElement(el);
    teardownSlideInteractives(manifestIndex);
    el.remove();
    state.mountedSlides.delete(manifestIndex);
    log(`Unmounted slide from DOM (cached): ${manifestIndex + 1}`);
  });
}

function activateSlide(manifestIndex) {
  state.mountedSlides.forEach((el, idx) => {
    el.classList.remove("active", "prev");
    if (idx === manifestIndex) el.classList.add("active");
    else if (idx < manifestIndex) el.classList.add("prev");
  });
}

// ── Scene chrome ──
function updatePagination(visIdx) {
  const total = visibleCount();
  const num = visIdx >= 0 ? visIdx + 1 : total;
  els.slidePagination.textContent = `Slide ${num} / ${total}`;
}

function updateNavButtons() {
  const slide = state.onRefSlide ? null : state.mountedSlides.get(state.currentSlide);
  const maxReveals = slide ? getMaxReveals(slide) : 0;
  const atLast = state.currentSlide >= visibleCount() - 1;

  els.btnPrev.disabled = !state.onRefSlide && state.currentSlide === 0 && state.revealStep === 0;
  els.btnNext.disabled = state.onRefSlide || (atLast && state.revealStep >= maxReveals);
}

function updateSceneChrome(visIdx) {
  const total = visibleCount();
  const progressNum = visIdx >= 0 ? visIdx + 1 : total;
  els.progressBar.style.width = `${(progressNum / total) * 100}%`;
  updatePagination(visIdx);
  updateNavButtons();
}

// ── Navigation ──
async function goToSlide(visibleIndex, options = {}) {
  if (state.isNavigating) return;
  const { updateUrl = true, includeRef = false } = options;

  state.isNavigating = true;
  saveCurrentRevealState();
  setLoading(true);

  try {
    if (includeRef) {
      state.onRefSlide = true;
      await ensureSlideMounted(HIDDEN_INDEX);
      pruneMountedSlides(new Set([HIDDEN_INDEX]));
      activateSlide(HIDDEN_INDEX);
      state.revealStep = state.revealSteps[HIDDEN_INDEX] || 0;
      const refEl = state.mountedSlides.get(HIDDEN_INDEX);
      updateReveals(refEl, state.revealStep);
      updateSceneChrome(-1);
      updateHUD();
      scheduleFitActiveSlide();
      log("Scene REF (hidden)");
      return;
    }

    state.onRefSlide = false;
    const idx = Math.max(0, Math.min(visibleIndex, visibleCount() - 1));
    state.currentSlide = idx;

    await preloadWindow(idx);
    activateSlide(idx);

    state.revealStep = state.revealSteps[idx] || 0;
    const el = state.mountedSlides.get(idx);
    updateReveals(el, state.revealStep);

    if (updateUrl) updateHash(idx + 1);
    updateSceneChrome(idx);
    updateHUD();
    scheduleFitActiveSlide();
    log(`Scene ${idx + 1}/${visibleCount()}`);
  } catch (err) {
    log("Navigation error", err);
    console.error(err);
  } finally {
    setLoading(false);
    state.isNavigating = false;
  }
}

async function next() {
  if (state.onRefSlide) return;

  const slide = state.mountedSlides.get(state.currentSlide);
  if (!slide) return;

  const maxReveals = getMaxReveals(slide);

  if (state.revealStep < maxReveals) {
    state.revealStep++;
    state.revealSteps[state.currentSlide] = state.revealStep;
    updateReveals(slide, state.revealStep);
    updateNavButtons();
    scheduleFitActiveSlide();
    log(`Reveal step ${state.revealStep}/${maxReveals}`);
    return;
  }

  if (state.currentSlide < visibleCount() - 1) {
    await goToSlide(state.currentSlide + 1);
  }
}

async function prev() {
  if (state.onRefSlide) {
    const lastIdx = visibleCount() - 1;
    await goToSlide(lastIdx);
    const prevSlide = state.mountedSlides.get(lastIdx);
    const maxReveals = getMaxReveals(prevSlide);
    state.revealStep = maxReveals;
    state.revealSteps[lastIdx] = maxReveals;
    updateReveals(prevSlide, maxReveals);
    updateNavButtons();
    scheduleFitActiveSlide();
    return;
  }

  const slide = state.mountedSlides.get(state.currentSlide);
  if (!slide) return;

  if (state.revealStep > 0) {
    state.revealStep--;
    state.revealSteps[state.currentSlide] = state.revealStep;
    updateReveals(slide, state.revealStep);
    updateNavButtons();
    scheduleFitActiveSlide();
    log(`Reveal step ${state.revealStep}`);
    return;
  }

  if (state.currentSlide > 0) {
    const prevIndex = state.currentSlide - 1;
    await goToSlide(prevIndex);
    const prevSlide = state.mountedSlides.get(prevIndex);
    const maxReveals = getMaxReveals(prevSlide);
    state.revealStep = maxReveals;
    state.revealSteps[prevIndex] = maxReveals;
    updateReveals(prevSlide, maxReveals);
    updateNavButtons();
    scheduleFitActiveSlide();
  }
}

// ── Presenter HUD ──
function updateHUD() {
  const slide = getActiveSlideEl();
  els.hudCurrent.textContent = state.onRefSlide ? "REF" : state.currentSlide + 1;
  els.hudTotal.textContent = visibleCount();
  els.hudNotes.textContent = slide?.dataset.notes || "(No speaker notes)";
}

function toggleHUD() {
  state.hudVisible = !state.hudVisible;
  els.hud.classList.toggle("hidden", !state.hudVisible);
  els.hud.setAttribute("aria-hidden", String(!state.hudVisible));
  log(`HUD ${state.hudVisible ? "shown" : "hidden"}`);
}

// ── Attention Span Assist (YouTube) ──
// Add/change video IDs here.
const ATTENTION_VIDEOS = {
  1: { id: "Q5KtBKk4hC0", label: "Subway Surfers" },
  2: { id: "tCBOhczn6Ok", label: "Minecraft parkour" },
};

function youtubeEmbedUrl(videoId) {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    modestbranding: "1",
    rel: "0",
    playsinline: "1",
    loop: "1",
    playlist: videoId,
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function stopAttentionVideo() {
  if (!els.attentionVideo) return;
  els.attentionVideo.src = "";
  log("Attention video stopped");
}

function playAttentionVideo(slot) {
  const entry = ATTENTION_VIDEOS[slot];
  if (!els.attentionVideo) return;

  if (!entry?.id) {
    stopAttentionVideo();
    els.loopCaption.textContent = entry?.label || `Video ${slot} not set`;
    log(`Attention video ${slot}: no ID configured`);
    return;
  }

  const url = youtubeEmbedUrl(entry.id);
  els.attentionVideo.src = url;
  els.loopCaption.textContent = `${entry.label} · press 1 / 2 to switch`;
  log(`Attention video ${slot}: ${entry.label} (${entry.id})`);
}

function toggleVideoPanel() {
  state.videoPanelOpen = !state.videoPanelOpen;
  els.videoPanel.classList.toggle("hidden", !state.videoPanelOpen);
  document.body.classList.toggle("panel-open", state.videoPanelOpen);

  if (state.videoPanelOpen) playAttentionVideo(state.currentLoop);
  else stopAttentionVideo();

  scheduleFitActiveSlide();
  log(`Video panel ${state.videoPanelOpen ? "open" : "closed"}`);
}

function setLoop(num) {
  state.currentLoop = num;
  if (state.videoPanelOpen) playAttentionVideo(num);
  else {
    const entry = ATTENTION_VIDEOS[num];
    els.loopCaption.textContent = entry?.label || `Video ${num}`;
  }
  log(`Attention slot set to ${num}`);
}

// ── Puzzle hints ──
function showHint() {
  if (state.hintIndex >= PUZZLE_HINTS.length) {
    log("All hints already shown");
    return;
  }
  state.hintIndex++;
  els.hintNumber.textContent = state.hintIndex;
  els.hintText.textContent = PUZZLE_HINTS[state.hintIndex - 1];
  els.puzzleOverlay.classList.remove("hidden");
  log(`Puzzle hint ${state.hintIndex}: ${PUZZLE_HINTS[state.hintIndex - 1]}`);
}

function resetHints() {
  state.hintIndex = 0;
  els.hintNumber.textContent = "0";
  els.hintText.textContent = "";
  els.puzzleOverlay.classList.add("hidden");
  log("Puzzle hints reset");
}

function toggleHelp(force) {
  state.helpVisible = typeof force === "boolean" ? force : !state.helpVisible;
  els.helpOverlay.classList.toggle("hidden", !state.helpVisible);
  els.helpOverlay.setAttribute("aria-hidden", String(!state.helpVisible));
  log(`Help overlay ${state.helpVisible ? "shown" : "hidden"}`);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((e) => log("Fullscreen failed", e));
  } else {
    document.exitFullscreen();
  }
}

// ── Keyboard handler ──
function handleKeydown(e) {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  if (window.RPSTournament?.isActive() && window.RPSTournament.handleKey(e)) return;

  if (e.key === "Escape" && state.helpVisible) {
    toggleHelp(false);
    return;
  }

  if (state.helpVisible && e.key !== "?") return;

  switch (e.key) {
    case "ArrowRight":
    case " ":
    case "PageDown":
      e.preventDefault();
      next();
      break;
    case "ArrowLeft":
    case "PageUp":
      e.preventDefault();
      prev();
      break;
    case "?":
      e.preventDefault();
      toggleHelp();
      break;
    case "v":
    case "V":
      toggleVideoPanel();
      break;
    case "1":
      setLoop(1);
      break;
    case "2":
      setLoop(2);
      break;
    case "h":
    case "H":
      showHint();
      break;
    case "r":
    case "R":
      resetHints();
      break;
    case "p":
    case "P":
      toggleHUD();
      break;
    case "f":
    case "F":
      toggleFullscreen();
      break;
    case "Home":
      e.preventDefault();
      goToSlide(0);
      break;
    case "End":
      e.preventDefault();
      goToSlide(0, { includeRef: true });
      break;
    default:
      break;
  }
}

// ── Init ──
async function init() {
  els.hudTotal.textContent = visibleCount();

  const fromHash = parseHash();
  if (fromHash !== null) {
    await goToSlide(fromHash, { updateUrl: false });
    log(`Loaded from hash: ${window.location.hash}`);
  } else {
    await goToSlide(0);
  }

  document.addEventListener("keydown", handleKeydown);
  els.closePanel.addEventListener("click", toggleVideoPanel);
  els.btnPrev.addEventListener("click", prev);
  els.btnNext.addEventListener("click", next);
  els.helpClose.addEventListener("click", () => toggleHelp(false));

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(scheduleFitActiveSlide, 100);
  });
  document.addEventListener("fullscreenchange", scheduleFitActiveSlide);

  window.addEventListener("hashchange", () => {
    if (suppressHashNav) return;
    const idx = parseHash();
    if (idx !== null && idx !== state.currentSlide && !state.onRefSlide) {
      goToSlide(idx, { updateUrl: false });
    }
  });

  scheduleFitActiveSlide();
  log("Ready. Slides load dynamically from /slides partials.");
  console.log("%c You Don't Know What You Know ", "background:#3b82f6;color:#fff;font-size:14px;padding:4px 8px;border-radius:4px;");
  console.log("SPA mode · →/Space next · ← prev · ? help · V video · H hints · P HUD · F fullscreen");
}

/** RPS End button → Q&A slide (visible index). */
window.endRPSAndGoToQA = function endRPSAndGoToQA() {
  const qaManifestIdx = SLIDE_MANIFEST.findIndex((s) => s.file.includes("slide-qa"));
  if (qaManifestIdx < 0) {
    log("Q&A slide not found in manifest");
    return;
  }
  const visibleIndex = SLIDE_MANIFEST.slice(0, qaManifestIdx).filter((s) => !s.hidden).length;
  log(`End RPS → Q&A (visible ${visibleIndex + 1})`);
  goToSlide(visibleIndex);
};

init();
