/** Experiment 7 — Opportunity Radar */

const BLIPS = [
  { label: "Hackathon", angle: 0.3, dist: 0.9 },
  { label: "Random conversation", angle: 1.2, dist: 0.85 },
  { label: "Trip abroad", angle: 2.1, dist: 0.95 },
  { label: "Book", angle: 3.5, dist: 0.8 },
  { label: "Question", angle: 4.8, dist: 0.88 },
  { label: "Side project", angle: 5.5, dist: 0.75 },
];

export const opportunityRadar = {
  id: 7,
  title: "Opportunity Radar",
  subtitle: "Curiosity blips become opportunities",
  mount(container) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:absolute;inset:0;";
    const canvas = document.createElement("canvas");
    canvas.className = "exp-canvas";
    wrap.appendChild(canvas);
    container.appendChild(wrap);

    const ctx = canvas.getContext("2d");
    let w, h, cx, cy, r, animId, sweep = 0;
    const blips = BLIPS.map((b) => ({ ...b, current: b.dist, phase: Math.random() * 6 }));

    function resize() {
      w = canvas.width = wrap.clientWidth;
      h = canvas.height = wrap.clientHeight;
      cx = w / 2; cy = h / 2;
      r = Math.min(w, h) * 0.38;
    }

    function draw() {
      sweep += 0.02;
      ctx.fillStyle = "#06080f";
      ctx.fillRect(0, 0, w, h);

      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, r * (i / 4), 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(59,130,246,0.12)";
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sweep);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      grad.addColorStop(0, "rgba(59,130,246,0.15)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, -0.4, 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      blips.forEach((b) => {
        b.current += (0.35 - b.current) * 0.003;
        b.phase += 0.01;
        const dist = b.current * r;
        const bx = cx + Math.cos(b.angle + b.phase * 0.1) * dist;
        const by = cy + Math.sin(b.angle + b.phase * 0.1) * dist;
        const near = b.current < 0.5;
        ctx.beginPath();
        ctx.arc(bx, by, near ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = near ? "#f0b429" : "#3b82f6";
        ctx.fill();
        if (near) {
          ctx.fillStyle = "#e8ecf4";
          ctx.font = "11px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(b.label, bx, by - 12);
        }
      });

      ctx.fillStyle = "#6b7a94";
      ctx.font = "12px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("CURIOSITY → OPPORTUNITY", cx, cy + r + 30);

      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      wrap.remove();
    };
  },
};
