/** Experiment 4 — Butterfly Effect */

const CASCADE = [
  { label: "Watching CNBC", x: 0, y: 0, delay: 0 },
  { label: "Trading", x: -80, y: -60, delay: 400 },
  { label: "Dave", x: 90, y: -40, delay: 800 },
  { label: "Summit", x: -50, y: 70, delay: 1200 },
  { label: "Programming", x: 100, y: 50, delay: 1600 },
  { label: "Travel", x: -120, y: 20, delay: 2000 },
  { label: "AI", x: 60, y: -90, delay: 2400 },
  { label: "InferASIC", x: -30, y: -110, delay: 2800 },
  { label: "Automation", x: 130, y: -10, delay: 3200 },
  { label: "Research", x: -100, y: 90, delay: 3600 },
  { label: "Networking", x: 40, y: 100, delay: 4000 },
  { label: "This talk", x: 0, y: -70, delay: 4400 },
];

export const butterflyEffect = {
  id: 4,
  title: "Butterfly Effect",
  subtitle: "One tiny decision → entire career",
  mount(container) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:absolute;inset:0;cursor:pointer;";
    const canvas = document.createElement("canvas");
    canvas.className = "exp-canvas";
    wrap.appendChild(canvas);

    const caption = document.createElement("p");
    caption.className = "exp-caption";
    caption.textContent = "Click anywhere to plant the first event";
    wrap.appendChild(caption);
    container.appendChild(wrap);

    const ctx = canvas.getContext("2d");
    let w, h, cx, cy, animId, zoom = 1, targetZoom = 1;
    const nodes = [];
    let started = false, startTime = 0;

    function resize() {
      w = canvas.width = wrap.clientWidth;
      h = canvas.height = wrap.clientHeight;
      cx = w / 2; cy = h / 2;
    }

    function spawn() {
      if (started) return;
      started = true;
      startTime = performance.now();
      caption.textContent = "One tiny event...";
      caption.classList.add("visible");
      CASCADE.forEach((c) => {
        setTimeout(() => {
          nodes.push({ ...c, t: 0, born: performance.now() });
          targetZoom = Math.max(0.35, 1 - nodes.length * 0.05);
          if (nodes.length === CASCADE.length) {
            setTimeout(() => {
              caption.textContent = "One decision cascaded into an entire career.";
            }, 800);
          }
        }, c.delay);
      });
    }

    function draw() {
      zoom += (targetZoom - zoom) * 0.02;
      ctx.fillStyle = "#06080f";
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);

      if (nodes.length > 1) {
        ctx.strokeStyle = "rgba(59,130,246,0.2)";
        ctx.lineWidth = 1;
        for (let i = 1; i < nodes.length; i++) {
          const a = nodes[0], b = nodes[i];
          ctx.beginPath();
          ctx.moveTo(cx + a.x, cy + a.y);
          ctx.lineTo(cx + b.x, cy + b.y);
          ctx.stroke();
        }
      }

      nodes.forEach((n, i) => {
        n.t = Math.min(1, (performance.now() - n.born) / 500);
        const r = 8 + i * 1.5;
        const alpha = n.t;
        ctx.beginPath();
        ctx.arc(cx + n.x, cy + n.y, r * n.t, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? `rgba(240,180,41,${alpha})` : `rgba(59,130,246,${alpha})`;
        ctx.fill();
        if (n.t > 0.5) {
          ctx.fillStyle = `rgba(232,236,244,${alpha})`;
          ctx.font = "11px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(n.label, cx + n.x, cy + n.y + r + 14);
        }
      });

      ctx.restore();
      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    wrap.addEventListener("click", spawn);
    window.addEventListener("resize", resize);
    caption.classList.add("visible");

    return () => {
      cancelAnimationFrame(animId);
      wrap.removeEventListener("click", spawn);
      window.removeEventListener("resize", resize);
      wrap.remove();
    };
  },
};
