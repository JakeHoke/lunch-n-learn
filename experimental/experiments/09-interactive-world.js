/** Experiment 9 — Interactive World */

const COUNTRIES = [
  { name: "Italy", lat: 42, lon: 12, photos: "🍝 Amalfi Coast", lesson: "Beauty and business patience — things take time." },
  { name: "Germany", lat: 51, lon: 10, photos: "🍺 Oktoberfest · Electronica", lesson: "Precision engineering mirrors precision thinking." },
  { name: "China", lat: 35, lon: 105, photos: "🔌 Electronics markets", lesson: "Scale changes everything about supply chains." },
  { name: "Iceland", lat: 64, lon: -19, photos: "🌋 Landscapes", lesson: "Small populations, big ideas." },
  { name: "India", lat: 22, lon: 79, photos: "🏙️ Cities & culture", lesson: "Complexity at scale teaches humility." },
  { name: "Taiwan", lat: 24, lon: 121, photos: "💾 Semiconductor hub", lesson: "Hardware is where software meets physics." },
];

function latLonToXY(lat, lon, w, h) {
  const x = ((lon + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return { x, y };
}

export const interactiveWorld = {
  id: 9,
  title: "Interactive World",
  subtitle: "Click countries · each trip teaches something",
  mount(container) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:absolute;inset:0;";
    const canvas = document.createElement("canvas");
    canvas.className = "exp-canvas";
    wrap.appendChild(canvas);

    const panel = document.createElement("div");
    panel.className = "exp-world-panel";
    panel.innerHTML = "<h3></h3><p class='photos'></p><p class='lesson'></p>";
    wrap.appendChild(panel);
    container.appendChild(wrap);

    const ctx = canvas.getContext("2d");
    let w, h, animId, glow = 0, selected = null;

    function resize() {
      w = canvas.width = wrap.clientWidth;
      h = canvas.height = wrap.clientHeight;
    }

    function draw() {
      glow += 0.03;
      ctx.fillStyle = "#06080f";
      ctx.fillRect(0, 0, w, h);

      const grd = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.45);
      grd.addColorStop(0, "rgba(59,130,246,0.12)");
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.5, w * 0.42, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 2;
      ctx.stroke();

      COUNTRIES.forEach((c) => {
        const { x, y } = latLonToXY(c.lat, c.lon, w, h);
        const isSel = selected === c.name;
        const pulse = isSel ? 8 + Math.sin(glow * 3) * 4 : 0;
        ctx.beginPath();
        ctx.arc(x, y, 6 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? "#f0b429" : "#3b82f6";
        ctx.fill();
        if (isSel) {
          ctx.beginPath();
          ctx.arc(x, y, 14 + Math.sin(glow * 2) * 3, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(240,180,41,0.4)";
          ctx.stroke();
        }
        ctx.fillStyle = "#e8ecf4";
        ctx.font = "10px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(c.name, x, y + 18);
      });

      animId = requestAnimationFrame(draw);
    }

    const onClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      let hit = null;
      COUNTRIES.forEach((c) => {
        const { x, y } = latLonToXY(c.lat, c.lon, w, h);
        if (Math.hypot(mx - x, my - y) < 20) hit = c;
      });
      if (hit) {
        selected = hit.name;
        panel.querySelector("h3").textContent = hit.name;
        panel.querySelector(".photos").textContent = hit.photos;
        panel.querySelector(".lesson").textContent = "Lesson: " + hit.lesson;
        panel.classList.add("show");
      }
    };

    resize();
    draw();
    canvas.addEventListener("click", onClick);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("resize", resize);
      wrap.remove();
    };
  },
};
