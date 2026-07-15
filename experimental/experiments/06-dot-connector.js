/** Experiment 6 — The Dot Connector */

const DOTS = [
  { label: "Finance", x: 12, y: 20 },
  { label: "Travel", x: 78, y: 15 },
  { label: "Programming", x: 85, y: 55 },
  { label: "Politics", x: 15, y: 70 },
  { label: "Hackathons", x: 45, y: 12 },
  { label: "Investing", x: 25, y: 45 },
  { label: "Family", x: 55, y: 75 },
  { label: "AI", x: 70, y: 38 },
];

const EDGES = [[0,4],[4,5],[5,1],[1,2],[2,7],[7,5],[5,3],[3,6],[6,1],[0,5],[4,7]];

export const dotConnector = {
  id: 6,
  title: "The Dot Connector",
  subtitle: "Press Space to connect the dots",
  mount(container) {
    const wrap = document.createElement("div");
    wrap.className = "exp-dots-wrap";
    wrap.innerHTML = `<svg class="exp-dots-svg" id="dots-svg"></svg>`;
    DOTS.forEach((d) => {
      const el = document.createElement("div");
      el.className = "exp-dot";
      el.textContent = d.label;
      el.style.left = d.x + "%";
      el.style.top = d.y + "%";
      wrap.appendChild(el);
    });
    const caption = document.createElement("p");
    caption.className = "exp-caption visible";
    caption.textContent = "Press Space — they seem unrelated... until they don't.";
    wrap.appendChild(caption);
    container.appendChild(wrap);

    const svg = wrap.querySelector("#dots-svg");
    const dotEls = wrap.querySelectorAll(".exp-dot");
    let edgeIndex = 0, connecting = false;

    function getCenter(i) {
      const el = dotEls[i];
      const r = wrap.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      return { x: b.left + b.width / 2 - r.left, y: b.top + b.height / 2 - r.top };
    }

    function drawEdge(from, to, progress) {
      const a = getCenter(from), b = getCenter(to);
      const mx = a.x + (b.x - a.x) * progress, my = a.y + (b.y - a.y) * progress;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", a.x); line.setAttribute("y1", a.y);
      line.setAttribute("x2", mx); line.setAttribute("y2", my);
      line.setAttribute("stroke", "rgba(59,130,246,0.6)");
      line.setAttribute("stroke-width", "2");
      svg.appendChild(line);
      return { line, a, b };
    }

    function connectNext() {
      if (edgeIndex >= EDGES.length) return;
      if (connecting) return;
      connecting = true;
      const [f, t] = EDGES[edgeIndex];
      dotEls[f].classList.add("connected");
      dotEls[t].classList.add("connected");
      let p = 0;
      const anim = () => {
        p += 0.04;
        svg.innerHTML = "";
        for (let i = 0; i < edgeIndex; i++) {
          const [ff, tt] = EDGES[i];
          const a = getCenter(ff), b = getCenter(tt);
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", a.x); line.setAttribute("y1", a.y);
          line.setAttribute("x2", b.x); line.setAttribute("y2", b.y);
          line.setAttribute("stroke", "rgba(59,130,246,0.5)");
          line.setAttribute("stroke-width", "2");
          svg.appendChild(line);
        }
        const a = getCenter(f), b = getCenter(t);
        const mx = a.x + (b.x - a.x) * Math.min(1, p), my = a.y + (b.y - a.y) * Math.min(1, p);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", a.x); line.setAttribute("y1", a.y);
        line.setAttribute("x2", mx); line.setAttribute("y2", my);
        line.setAttribute("stroke", "rgba(240,180,41,0.8)");
        line.setAttribute("stroke-width", "2");
        svg.appendChild(line);
        if (p < 1) requestAnimationFrame(anim);
        else {
          edgeIndex++;
          connecting = false;
          if (edgeIndex >= EDGES.length) {
            caption.innerHTML = "<em>The interesting part wasn't the dots.<br>It was learning to connect them.</em>";
          }
        }
      };
      anim();
    }

    const onKey = (e) => {
      if (e.code === "Space") { e.preventDefault(); connectNext(); }
    };
    window.addEventListener("keydown", onKey);

    return () => { window.removeEventListener("keydown", onKey); wrap.remove(); };
  },
};
