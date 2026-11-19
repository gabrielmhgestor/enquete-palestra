const socket = io();
const app = document.getElementById("app");

let votedOptionIndex = null; // opção que ESTE celular escolheu na pergunta atual
let votedQuestionIndex = null;

socket.on("connect", () => {
  socket.emit("player:join");
});

socket.on("you:voted", ({ optionIndex }) => {
  votedOptionIndex = optionIndex;
});

socket.on("state:update", (s) => {
  if (s.questionIndex !== votedQuestionIndex) {
    votedQuestionIndex = s.questionIndex;
    if (s.phase !== "reveal") votedOptionIndex = null;
  }
  render(s);
});

const letters = ["A", "B", "C", "D", "E", "F"];

function render(s) {
  if (s.phase === "lobby") {
    app.innerHTML = `
      <div class="pulse-dot"></div>
      <div class="eyebrow">Enquete ao vivo</div>
      <h1>Você está dentro!</h1>
      <p class="sub">Aguarde o apresentador iniciar a primeira pergunta.</p>
    `;
    return;
  }

  if (s.phase === "end") {
    app.innerHTML = `
      <div class="eyebrow">Fim da enquete</div>
      <h1>Obrigado por participar! 🎉</h1>
      <p class="sub">Essa foi a última pergunta.</p>
    `;
    return;
  }

  if (s.phase === "question") {
    if (votedOptionIndex !== null) {
      app.innerHTML = `
        <div class="pulse-dot"></div>
        <div class="eyebrow">Pergunta ${s.questionIndex + 1} de ${s.total}</div>
        <h1>Resposta enviada ✓</h1>
        <p class="sub">Aguarde o apresentador revelar o resultado.</p>
      `;
      return;
    }
    const q = s.question;
    app.innerHTML = `
      <div class="badge">Pergunta ${s.questionIndex + 1} de ${s.total}</div>
      <div class="question-text">${escapeHtml(q.text)}</div>
      <div id="options"></div>
    `;
    const optionsEl = document.getElementById("options");
    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.innerHTML = `<span class="option-letter">${letters[i]}</span><span>${escapeHtml(opt)}</span>`;
      btn.onclick = () => {
        if (votedOptionIndex !== null) return;
        votedOptionIndex = i;
        socket.emit("player:vote", i);
        render({ ...s }); // feedback imediato, servidor confirma via "you:voted"
      };
      optionsEl.appendChild(btn);
    });
    return;
  }

  if (s.phase === "reveal") {
    const q = s.question;
    const totalVotes = s.counts.reduce((a, b) => a + b, 0) || 1;
    app.innerHTML = `
      <div class="badge">Pergunta ${s.questionIndex + 1} de ${s.total} · Resultado</div>
      <div class="question-text">${escapeHtml(q.text)}</div>
      <div id="bars"></div>
      ${
        votedOptionIndex !== null && s.correctIndex !== null
          ? votedOptionIndex === s.correctIndex
            ? `<p class="sub" style="color:var(--green); font-weight:700;">Você acertou! ✓</p>`
            : `<p class="sub" style="color:var(--red); font-weight:700;">Você errou dessa vez.</p>`
          : ""
      }
    `;
    const barsEl = document.getElementById("bars");
    q.options.forEach((opt, i) => {
      const count = s.counts[i] || 0;
      const pct = Math.round((count / totalVotes) * 100);
      const isCorrect = s.correctIndex === i;
      const row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = `
        <div class="label">
          <span>${letters[i]}. ${escapeHtml(opt)}${isCorrect ? " ✓" : ""}</span>
          <span>${pct}%</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill ${isCorrect ? "correct" : ""}" style="width:${pct}%"></div>
        </div>
      `;
      barsEl.appendChild(row);
    });
    return;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
