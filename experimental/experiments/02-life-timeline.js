/** Experiment 2 — Life Timeline */

const MILESTONES = [
  { year: "~2010", title: "CNBC Kid", body: "Watching markets before I understood them.", icon: "📺" },
  { year: "2018", title: "First Hackathon", body: "24 hours. No sleep. Pure problem-solving.", icon: "💻" },
  { year: "2019", title: "Princeton Win", body: "IBM Watson project — tone, summary, notes.", icon: "🏆" },
  { year: "2020", title: "COVID Pivot", body: "Hackathons gone. Trading with family begins.", icon: "📈" },
  { year: "2021", title: "Summit", body: "The conversation that became a career.", icon: "🏢" },
  { year: "2023", title: "First Trip Abroad", body: "Culture changes how you see business.", icon: "✈️" },
  { year: "Today", title: "Still Asking", body: "Every chapter started with a question.", icon: "✨" },
];

export const lifeTimeline = {
  id: 2,
  title: "Life Timeline",
  subtitle: "Vertical documentary scroll",
  mount(container) {
    const scroll = document.createElement("div");
    scroll.className = "exp-timeline-scroll";
    scroll.innerHTML = `<div class="exp-timeline-path"><div class="exp-timeline-line"></div>${MILESTONES.map((m) => `
      <div class="exp-milestone">
        <div class="exp-milestone-card">
          <span class="exp-milestone-year">${m.year}</span>
          <h3 class="exp-milestone-title">${m.title}</h3>
          <p class="exp-milestone-body">${m.body}</p>
          <div class="exp-milestone-photo">${m.icon}</div>
        </div>
      </div>`).join("")}</div>`;
    container.appendChild(scroll);

    const cards = scroll.querySelectorAll(".exp-milestone-card");
    const onClick = (e) => {
      const card = e.target.closest(".exp-milestone-card");
      if (!card) return;
      cards.forEach((c) => c.classList.remove("expanded"));
      card.classList.add("expanded");
    };
    scroll.addEventListener("click", onClick);

    let parallaxId;
    const onScroll = () => {
      const y = scroll.scrollTop;
      scroll.querySelector(".exp-timeline-line").style.transform = `translateX(-50%) translateY(${y * 0.05}px)`;
    };
    scroll.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      scroll.removeEventListener("click", onClick);
      scroll.removeEventListener("scroll", onScroll);
      scroll.remove();
    };
  },
};
