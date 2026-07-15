/** Experiment 3 — Curiosity Engine */

const CHAIN = [
  { text: "I wonder <span class='highlight'>how markets work</span>.", outcome: "Trading" },
  { text: "I wonder if I can <span class='highlight'>automate this</span>.", outcome: "Programming" },
  { text: "I wonder <span class='highlight'>why GPUs</span> cost what they do...", outcome: "InferASIC" },
  { text: "I wonder what <span class='highlight'>people my age</span> notice first...", outcome: "This talk" },
];

export const curiosityEngine = {
  id: 3,
  title: "Curiosity Engine",
  subtitle: "Every career starts with a question",
  mount(container) {
    let step = -1;
    const root = document.createElement("div");
    root.className = "exp-curiosity";
    root.innerHTML = `
      <p class="exp-curiosity-prompt">I wonder...</p>
      <div class="exp-curiosity-sentence"></div>
      <div class="exp-curiosity-outcome"></div>
      <p class="exp-curiosity-click">Click to continue</p>`;
    container.appendChild(root);

    const sentence = root.querySelector(".exp-curiosity-sentence");
    const outcome = root.querySelector(".exp-curiosity-outcome");
    const clickHint = root.querySelector(".exp-curiosity-click");

    function advance() {
      step++;
      if (step >= CHAIN.length) {
        sentence.innerHTML = "Everything in my career<br>originated from a <span class='highlight'>question</span>.";
        outcome.textContent = "";
        outcome.classList.remove("show");
        clickHint.textContent = "";
        return;
      }
      outcome.classList.remove("show");
      sentence.style.opacity = "0";
      setTimeout(() => {
        sentence.innerHTML = CHAIN[step].text;
        sentence.style.opacity = "1";
        setTimeout(() => {
          outcome.textContent = "↓ " + CHAIN[step].outcome;
          outcome.classList.add("show");
        }, 600);
      }, 300);
    }

    const onClick = () => advance();
    root.addEventListener("click", onClick);
    advance();

    return () => { root.removeEventListener("click", onClick); root.remove(); };
  },
};
