/** Experiment 5 — Living Desk */

const OBJECTS = [
  { emoji: "📓", label: "Notebook", x: "12%", y: "25%", story: "Handwritten notes from my first alternative investment review — the ones that accidentally started my career." },
  { emoji: "💻", label: "Laptop", x: "38%", y: "20%", story: "Thousands of hours of Python, automation scripts, and side projects that never made it to production." },
  { emoji: "🛂", label: "Passport", x: "68%", y: "28%", story: "Six countries. Every stamp changed how I think about business and culture." },
  { emoji: "☕", label: "Coffee", x: "22%", y: "55%", story: "Fuel for 3 AM hackathons and early market opens." },
  { emoji: "🍓", label: "Raspberry Pi", x: "52%", y: "50%", story: "Hardware experiments that started with 'I wonder if this is possible.'" },
  { emoji: "📈", label: "Stock chart", x: "78%", y: "52%", story: "Markets taught me humility before they taught me anything else." },
];

export const livingDesk = {
  id: 5,
  title: "Living Desk",
  subtitle: "Click objects · escape room energy",
  mount(container) {
    const scene = document.createElement("div");
    scene.className = "exp-desk-scene";
    scene.innerHTML = `
      <div class="exp-desk">
        ${OBJECTS.map((o) => `<div class="exp-desk-item" style="left:${o.x};top:${o.y}" data-story="${o.story}" title="${o.label}">${o.emoji}</div>`).join("")}
        <div class="exp-desk-story"></div>
      </div>`;
    container.appendChild(scene);

    const story = scene.querySelector(".exp-desk-story");
    const onClick = (e) => {
      const item = e.target.closest(".exp-desk-item");
      if (!item) return;
      story.textContent = item.dataset.story;
      story.classList.add("show");
    };
    scene.addEventListener("click", onClick);

    return () => { scene.removeEventListener("click", onClick); scene.remove(); };
  },
};
