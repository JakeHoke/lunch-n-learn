/** Experiment 10 — The Everything Machine */

const GEARS = [
  { label: "Finance", x: 120, y: 180, r: 40, speed: 1, teeth: 12 },
  { label: "Technology", x: 280, y: 140, r: 50, speed: -0.8, teeth: 14 },
  { label: "Travel", x: 440, y: 200, r: 35, speed: 1.2, teeth: 10 },
  { label: "Programming", x: 200, y: 300, r: 45, speed: -1, teeth: 13 },
  { label: "Markets", x: 360, y: 320, r: 38, speed: 0.9, teeth: 11 },
  { label: "Networking", x: 500, y: 120, r: 32, speed: -1.1, teeth: 9 },
  { label: "Reading", x: 80, y: 320, r: 30, speed: 1.3, teeth: 8 },
  { label: "Questions", x: 300, y: 240, r: 55, speed: 0.7, teeth: 16 },
];

export const everythingMachine = {
  id: 10,
  title: "The Everything Machine",
  subtitle: "Intentionally over-engineered",
  mount(container) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:absolute;inset:0;cursor:pointer;";
    const canvas = document.createElement("canvas");
    canvas.className = "exp-canvas";
    wrap.appendChild(canvas);

    const caption = document.createElement("p");
    caption.className = "exp-caption";
    caption.textContent = "Click to start the machine";
    wrap.appendChild(caption);
    container.appendChild(wrap);

    const ctx = canvas.getContext("2d");
    let w, h, animId, angle = 0, running = false, power = 0;

    function resize() {
      w = canvas.width = wrap.clientWidth;
      h = canvas.height = wrap.clientHeight;
    }

    function drawGear(x, y, r, teeth, rot, label, alpha) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        const a2 = ((i + 0.5) / teeth) * Math.PI * 2;
        const rOut = r + (i % 2 === 0 ? 6 : 0);
        if (i === 0) ctx.moveTo(Math.cos(a) * rOut, Math.sin(a) * rOut);
        else ctx.lineTo(Math.cos(a) * rOut, Math.sin(a) * rOut);
        ctx.lineTo(Math.cos(a2) * (r - 4), Math.sin(a2) * (r - 4));
      }
      ctx.closePath();
      ctx.fillStyle = "#1c2640";
      ctx.fill();
      ctx.strokeStyle = "rgba(59,130,246,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = "#0f1520";
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#9aa8be";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(label, x, y + r + 14);
    }

    function draw() {
      if (running) {
        angle += 0.02 * (0.3 + power * 2);
        power = Math.min(1, power + 0.005);
      }
      ctx.fillStyle = "#06080f";
      ctx.fillRect(0, 0, w, h);

      const scale = Math.min(w / 600, h / 450);
      const ox = w / 2 - 300 * scale, oy = h / 2 - 225 * scale;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);

      GEARS.forEach((g) => {
        const rot = angle * g.speed * (0.5 + power);
        drawGear(g.x, g.y, g.r, g.teeth, rot, g.label, 0.5 + power * 0.5);
      });

      const mainR = 70 + power * 10;
      const mainX = 300, mainY = 400;
      drawGear(mainX, mainY, mainR, 20, -angle * 0.5, "", 0.3 + power * 0.7);
      ctx.fillStyle = "#f0b429";
      ctx.font = `bold ${14 + power * 4}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText("CURIOSITY", mainX, mainY + 5);

      ctx.restore();

      if (power > 0.9 && running) {
        caption.textContent = "None of these experiences happened in isolation.";
        caption.classList.add("visible");
      }

      animId = requestAnimationFrame(draw);
    }

    const start = () => {
      if (!running) { running = true; caption.textContent = "Gears spinning..."; caption.classList.add("visible"); }
    };
    resize();
    draw();
    wrap.addEventListener("click", start);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      wrap.removeEventListener("click", start);
      window.removeEventListener("resize", resize);
      wrap.remove();
    };
  },
};
