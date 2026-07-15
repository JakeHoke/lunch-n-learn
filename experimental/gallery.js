/**
 * Experimental Gallery — orchestrator
 * E to open from main deck · ← → navigate · Esc to return
 */

import * as experiments from "./experiments/index.js";

const EXP_LIST = [
  experiments.memoryMap,
  experiments.lifeTimeline,
  experiments.curiosityEngine,
  experiments.butterflyEffect,
  experiments.livingDesk,
  experiments.dotConnector,
  experiments.opportunityRadar,
  experiments.perspectiveShift,
  experiments.interactiveWorld,
  experiments.everythingMachine,
];

const ENABLE_LOGGING = true;

function log(msg) {
  if (ENABLE_LOGGING) console.log(`[ExpGallery] ${msg}`);
}

class ExperimentGallery {
  constructor() {
    this.isOpen = false;
    this.view = "grid";
    this.index = -1;
    this.cleanup = null;
    this.overlay = null;
    this.stage = null;
    this.titleEl = null;
    this.subtitleEl = null;
    this.counterEl = null;
    this.badgeEl = null;
  }

  buildDOM() {
    if (this.overlay) return;

    this.overlay = document.createElement("div");
    this.overlay.id = "experiment-overlay";
    this.overlay.className = "experiment-overlay hidden";
    this.overlay.setAttribute("aria-hidden", "true");
    this.overlay.innerHTML = `
      <header class="experiment-chrome">
        <div class="experiment-chrome-left">
          <span class="experiment-badge">Experimental Playground</span>
          <span class="experiment-title" id="exp-title">Gallery</span>
          <span class="experiment-subtitle" id="exp-subtitle">Prototype showcase — steal ideas later</span>
        </div>
        <div class="experiment-chrome-right">
          <span class="experiment-counter" id="exp-counter"></span>
          <span class="experiment-hint"><kbd>←</kbd> <kbd>→</kbd> navigate · <kbd>Esc</kbd> exit</span>
        </div>
      </header>
      <div class="experiment-stage" id="exp-stage">
        <div class="experiment-stage-inner" id="exp-stage-inner"></div>
      </div>`;

    document.body.appendChild(this.overlay);
    this.stage = document.getElementById("exp-stage-inner");
    this.titleEl = document.getElementById("exp-title");
    this.subtitleEl = document.getElementById("exp-subtitle");
    this.counterEl = document.getElementById("exp-counter");
    this.badgeEl = this.overlay.querySelector(".experiment-badge");
  }

  unmountExperiment() {
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
    if (this.stage) this.stage.innerHTML = "";
  }

  showGrid() {
    this.view = "grid";
    this.index = -1;
    this.unmountExperiment();
    this.titleEl.textContent = "Gallery";
    this.subtitleEl.textContent = "10 prototypes — click or use ← →";
    this.counterEl.textContent = "";
    this.badgeEl.textContent = "Experimental Playground";

    const grid = document.createElement("div");
    grid.className = "experiment-gallery-grid";
    EXP_LIST.forEach((exp, i) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "gallery-card";
      card.innerHTML = `
        <div class="gallery-card-num">Experiment ${exp.id}</div>
        <div class="gallery-card-title">${exp.title}</div>
        <div class="gallery-card-desc">${exp.subtitle}</div>`;
      card.addEventListener("click", () => this.showExperiment(i));
      grid.appendChild(card);
    });
    this.stage.appendChild(grid);
  }

  showExperiment(index) {
    if (index < 0 || index >= EXP_LIST.length) return;
    this.view = "experiment";
    this.index = index;
    this.unmountExperiment();

    const exp = EXP_LIST[index];
    this.titleEl.textContent = exp.title;
    this.subtitleEl.textContent = exp.subtitle;
    this.counterEl.textContent = `${index + 1} / ${EXP_LIST.length}`;
    this.badgeEl.textContent = `Experiment ${exp.id}`;

    log(`Mounting: ${exp.title}`);
    this.cleanup = exp.mount(this.stage) || null;
  }

  open(startIndex = -1) {
    this.buildDOM();
    this.isOpen = true;
    this.overlay.classList.remove("hidden");
    this.overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    if (startIndex >= 0 && startIndex < EXP_LIST.length) {
      this.showExperiment(startIndex);
    } else {
      this.showGrid();
    }
    log("Gallery opened");
  }

  close() {
    if (!this.isOpen) return;
    this.unmountExperiment();
    this.isOpen = false;
    this.overlay.classList.add("hidden");
    this.overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    log("Gallery closed");
  }

  next() {
    if (!this.isOpen) return;
    if (this.view === "grid") {
      this.showExperiment(0);
      return;
    }
    if (this.index < EXP_LIST.length - 1) {
      this.showExperiment(this.index + 1);
    }
  }

  prev() {
    if (!this.isOpen) return;
    if (this.view === "experiment" && this.index <= 0) {
      this.showGrid();
      return;
    }
    if (this.index > 0) {
      this.showExperiment(this.index - 1);
    }
  }

  handleKey(e) {
    if (!this.isOpen) return false;

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      this.close();
      return true;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      this.next();
      return true;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      this.prev();
      return true;
    }

    return false;
  }
}

const gallery = new ExperimentGallery();

document.addEventListener(
  "keydown",
  (e) => {
    if (gallery.isOpen) {
      gallery.handleKey(e);
      return;
    }
    if ((e.key === "e" || e.key === "E") && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      gallery.open();
    }
  },
  true
);

window.ExperimentGallery = gallery;
log("Gallery module loaded — press E to enter");
