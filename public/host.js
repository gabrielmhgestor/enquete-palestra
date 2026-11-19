const socket = io();
const app = document.getElementById("app");
const controls = document.getElementById("controls");
const countBadge = document.getElementById("count-badge");

let joinInfo = null;
let lastState = null;
let authed = false;

fetch("/api/join-info").then(r => r.json()).then(info => {
  joinInfo = info;
  if (lastState) render(lastState);
});

socket.on("connect", () => {
  tryAuth("");
});

function tryAuth(key) {
  socket.emit("host:auth", key, ({ ok }) => {
    authed = ok;
    if (!ok) renderAuthPrompt();
    else if (lastState) render(lastState);
  });
}

function renderAuthPrompt() {
  app.innerHTML = `
    <div class="eyebrow">Acesso protegido</div>
    <h1>Digite a chave do apresentador</h1>
    <input id="key-input" type="password" placeholder="Chave" style="margin-top:12px;padding:12px 16px;border-radius:10px;border:1px solid var(--border);background:var(--bg-elevated);color:var(--text);font-size:15px;width:260px;" />
  `;
  controls.innerHTML = `<button class="btn btn-primary" id="key-submit">Entrar</button>`;
  document.getElementById("key-submit").onclick = () => {
    tryAuth(document.getElementById("key-input").value);
  };
}

socket.on("state:update", (s) => {
  lastState = s;
  countBadge.textContent = `${s.participantCount} conectado${s.participantCount === 1 ? "" : "s"}`;
  if (authed) render(s);
});

const letters = ["A", "B", "C", "D", "E", "F"];

function render(s) {
  if (s.phase === "lobby") {
    app.innerHTML = `
      <div class="eyebrow">Pronto para começar</div>
      <h1>Peça para o público escanear o QR Code</h1>
      ${
        joinInfo
          ? `<div class="qr-box"><img src="${joinInfo.qr}" alt="QR Code" /></div>
             <div class="join-link">ou acesse: <strong>${joinInfo.url}</strong></div>`
          : `<p class="sub">Gerando QR Code...</p>`
      }
    `;
    controls.innerHTML = `<button class="btn btn-primary" id="btn-start">Iniciar enquete</button>`;
    document.getElementById("btn-start").onclick = () => socket.emit("host:start");
    return;
  }

  if (s.phase === "question") {
    const q = s.question;
    const total = s.participantCount || 1;
    app.innerHTML = `
      <div class="badge">Pergunta ${s.questionIndex + 1} de ${s.total} · ${s.votedCount}/${s.participantCount} responderam</div>
      <div class="question-text">${escapeHtml(q.text)}</div>
      <div id="bars"></div>
    `;
    const barsEl = document.getElementById("bars");
    q.options.forEach((opt, i) => {
      const count = s.counts[i] || 0;
      const pct = Math.round((count / total) * 100);
      const row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = `
        <div class="label"><span>${letters[i]}. ${escapeHtml(opt)}</span><span>${count}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.min(pct, 100)}%"></div></div>
      `;
      barsEl.appendChild(row);
    });
    controls.innerHTML = `<button class="btn btn-primary" id="btn-reveal">Revelar resultado</button>`;
    document.getElementById("btn-reveal").onclick = () => socket.emit("host:reveal");
    return;
  }

  if (s.phase === "reveal") {
    const q = s.question;
    const totalVotes = s.counts.reduce((a, b) => a + b, 0) || 1;
    app.innerHTML = `
      <div class="badge">Pergunta ${s.questionIndex + 1} de ${s.total} · Resultado</div>
      <div class="question-text">${escapeHtml(q.text)}</div>
      <div id="bars"></div>
    `;
    const barsEl = document.getElementById("bars");
    q.options.forEach((opt, i) => {
      const count = s.counts[i] || 0;
      const pct = Math.round((count / totalVotes) * 100);
      const isCorrect = s.correctIndex === i;
      const row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = `
        <div class="label"><span>${letters[i]}. ${escapeHtml(opt)}${isCorrect ? " ✓" : ""}</span><span>${pct}% (${count})</span></div>
        <div class="bar-track"><div class="bar-fill ${isCorrect ? "correct" : ""}" style="width:${pct}%"></div></div>
      `;
      barsEl.appendChild(row);
    });
    const isLast = s.questionIndex >= s.total - 1;
    controls.innerHTML = `
      <button class="btn btn-secondary" id="btn-restart">Reiniciar tudo</button>
      <button class="btn btn-primary" id="btn-next">${isLast ? "Encerrar" : "Próxima pergunta"}</button>
    `;
    document.getElementById("btn-next").onclick = () => socket.emit("host:next");
    document.getElementById("btn-restart").onclick = () => {
      if (confirm("Isso reinicia a enquete do zero para todo mundo. Confirmar?")) socket.emit("host:restart");
    };
    return;
  }

  if (s.phase === "end") {
    app.innerHTML = `
      <div class="eyebrow">Concluído</div>
      <h1>Enquete encerrada 🎉</h1>
      <p class="sub">${s.participantCount} pessoas participaram.</p>
    `;
    controls.innerHTML = `<button class="btn btn-secondary" id="btn-restart">Reiniciar do zero</button>`;
    document.getElementById("btn-restart").onclick = () => {
      if (confirm("Isso reinicia a enquete do zero para todo mundo. Confirmar?")) socket.emit("host:restart");
    };
    return;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
