/** Experiment 8 — Perspective Shift */

const PAIRS = [
  { young: "How do markets even work?", now: "What assumptions is everyone making?" },
  { young: "Can I build this in 24 hours?", now: "What's the real problem underneath?" },
  { young: "Should I go to college?", now: "What's the opportunity cost of waiting?" },
  { young: "Will they take me seriously?", now: "What perspective am I not hearing?" },
  { young: "What if I fail?", now: "What would I learn if I did?" },
];

export const perspectiveShift = {
  id: 8,
  title: "Perspective Shift",
  subtitle: "17 vs 21 — better questions, not just answers",
  mount(container) {
    const root = document.createElement("div");
    root.className = "exp-split";
    root.innerHTML = `
      <div class="exp-split-side exp-split-side--young">
        <span class="exp-split-age">17</span>
        <div id="thoughts-young"></div>
      </div>
      <div class="exp-split-side exp-split-side--now">
        <span class="exp-split-age">21</span>
        <div id="thoughts-now"></div>
      </div>`;
    container.appendChild(root);

    const youngEl = root.querySelector("#thoughts-young");
    const nowEl = root.querySelector("#thoughts-now");
    let idx = 0, timer;

    function showPair() {
      youngEl.innerHTML = "";
      nowEl.innerHTML = "";
      const p = PAIRS[idx % PAIRS.length];
      const y = document.createElement("div");
      y.className = "exp-thought";
      y.textContent = p.young;
      const n = document.createElement("div");
      n.className = "exp-thought";
      n.textContent = p.now;
      youngEl.appendChild(y);
      nowEl.appendChild(n);
      requestAnimationFrame(() => {
        y.classList.add("show");
        setTimeout(() => n.classList.add("show"), 500);
      });
      idx++;
    }

    showPair();
    timer = setInterval(showPair, 4000);
    root.addEventListener("click", () => { clearInterval(timer); showPair(); timer = setInterval(showPair, 4000); });

    return () => { clearInterval(timer); root.remove(); };
  },
};
