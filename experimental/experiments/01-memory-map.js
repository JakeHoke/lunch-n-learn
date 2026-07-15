/** Experiment 1 — Interactive Memory Map */

const NODES = [
  { id: "cnbc", label: "CNBC", desc: "Age 10 — markets on TV sparked everything.", x: -180, y: -80, z: 0, links: ["trading"] },
  { id: "hackathons", label: "Hackathons", desc: "Three HS wins, Princeton & Rowan awards.", x: -120, y: 60, z: -40, links: ["programming"] },
  { id: "trading", label: "Trading", desc: "COVID pivot — managing investments with family.", x: -40, y: -30, z: 20, links: ["summit", "programming"] },
  { id: "columbia", label: "Columbia", desc: "Collegiate competitions while still in high school.", x: 60, y: 80, z: -20, links: ["hackathons"] },
  { id: "summit", label: "Summit", desc: "The interview that wasn't an interview.", x: 100, y: -60, z: 30, links: ["ai", "travel"] },
  { id: "travel", label: "Travel", desc: "Iceland to Taiwan — perspective shifts.", x: 160, y: 40, z: -10, links: ["ai"] },
  { id: "ai", label: "AI", desc: "Side quests from simple questions.", x: 200, y: -20, z: 50, links: ["inferasic"] },
  { id: "inferasic", label: "InferASIC", desc: "Why GPUs? A question that became hardware.", x: 240, y: 60, z: 20, links: [] },
  { id: "programming", label: "Programming", desc: "Automation, Python, systems thinking.", x: 20, y: 100, z: -30, links: ["ai"] },
];

export const memoryMap = {
  id: 1,
  title: "Interactive Memory Map",
  subtitle: "Obsidian graph × Apple keynote",
  mount(container) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:absolute;inset:0;";
    const canvas = document.createElement("canvas");
    canvas.className = "exp-canvas";
    wrap.appendChild(canvas);

    const tooltip = document.createElement("div");
    tooltip.className = "exp-node-tooltip";
    document.body.appendChild(tooltip);

    const hint = document.createElement("p");
    hint.className = "exp-hint-floating";
    hint.textContent = "Hover nodes · Click to zoom · Drag to orbit";
    wrap.appendChild(hint);
    container.appendChild(wrap);

    const ctx = canvas.getContext("2d");
    let w, h, cx, cy, animId;
    let camZ = 600, targetCamZ = 600, rotY = 0, targetRotY = 0;
    let hoverId = null, focusId = null, pulse = 0;
    let drag = false, lastX = 0;

    function resize() {
      w = canvas.width = wrap.clientWidth;
      h = canvas.height = wrap.clientHeight;
      cx = w / 2; cy = h / 2;
    }

    function project(n) {
      const cos = Math.cos(rotY), sin = Math.sin(rotY);
      const rx = n.x * cos - n.z * sin;
      const rz = n.x * sin + n.z * cos;
      const scale = camZ / (camZ - rz);
      return { x: cx + rx * scale, y: cy + n.y * scale, scale, rz };
    }

    function draw() {
      pulse += 0.02;
      camZ += (targetCamZ - camZ) * 0.06;
      rotY += (targetRotY - rotY) * 0.06;

      ctx.fillStyle = "#06080f";
      ctx.fillRect(0, 0, w, h);

      const projected = NODES.map((n) => ({ ...n, ...project(n) }));
      projected.sort((a, b) => a.rz - b.rz);

      ctx.lineWidth = 1;
      NODES.forEach((n) => {
        n.links.forEach((lid) => {
          const b = NODES.find((x) => x.id === lid);
          if (!b) return;
          const pa = project(n), pb = project(b);
          const grad = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
          grad.addColorStop(0, "rgba(59,130,246,0.15)");
          grad.addColorStop(1, "rgba(240,180,41,0.15)");
          ctx.strokeStyle = grad;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        });
      });

      projected.forEach((n) => {
        const r = (focusId === n.id ? 28 : hoverId === n.id ? 22 : 16) * n.scale;
        const glow = focusId === n.id ? 20 : hoverId === n.id ? 12 : 0;
        if (glow) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + glow, 0, Math.PI * 2);
          ctx.fillStyle = focusId === n.id ? "rgba(240,180,41,0.25)" : "rgba(59,130,246,0.2)";
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = focusId === n.id ? "#f0b429" : hoverId === n.id ? "#3b82f6" : "#1c2640";
        ctx.fill();
        ctx.strokeStyle = focusId === n.id ? "#f0b429" : "rgba(255,255,255,0.2)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#e8ecf4";
        ctx.font = `600 ${Math.max(10, 12 * n.scale)}px system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y + r + 14 * n.scale);
      });

      animId = requestAnimationFrame(draw);
    }

    function hitTest(mx, my) {
      let best = null, bestD = 30;
      NODES.forEach((n) => {
        const p = project(n);
        const d = Math.hypot(mx - p.x, my - p.y);
        if (d < bestD) { bestD = d; best = n.id; }
      });
      return best;
    }

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      if (drag) {
        targetRotY += (e.clientX - lastX) * 0.008;
        lastX = e.clientX;
        return;
      }
      const id = hitTest(mx, my);
      hoverId = id;
      if (id) {
        const n = NODES.find((x) => x.id === id);
        tooltip.textContent = n.desc;
        tooltip.style.left = e.clientX + 12 + "px";
        tooltip.style.top = e.clientY + 12 + "px";
        tooltip.classList.add("show");
        canvas.style.cursor = "pointer";
      } else {
        tooltip.classList.remove("show");
        canvas.style.cursor = "grab";
      }
    };

    const onDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const id = hitTest(e.clientX - rect.left, e.clientY - rect.top);
      if (id) {
        focusId = id;
        const n = NODES.find((x) => x.id === id);
        targetCamZ = 350;
        targetRotY = -Math.atan2(n.x, n.z + 200);
      } else {
        drag = true;
        lastX = e.clientX;
      }
    };

    const onUp = () => { drag = false; };
    const onDbl = () => { focusId = null; targetCamZ = 600; };

    resize();
    draw();
    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("dblclick", onDbl);
    canvas.addEventListener("mouseleave", () => { hoverId = null; tooltip.classList.remove("show"); drag = false; });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("dblclick", onDbl);
      tooltip.remove();
      wrap.remove();
    };
  },
};
