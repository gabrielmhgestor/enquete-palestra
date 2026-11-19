const path = require("path");
const os = require("os");
const express = require("express");
const QRCode = require("qrcode");
const { Server } = require("socket.io");
const questions = require("./questions");

const PORT = process.env.PORT || 3000;
const HOST_KEY = process.env.HOST_KEY || ""; // opcional: defina para proteger o /host

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "localhost";
}

// No Render, RENDER_EXTERNAL_URL traz o endereço público (https://xxx.onrender.com).
// Localmente, cai no IP da rede.
const FIXED_URL = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "";
const PUBLIC_URL = FIXED_URL || `http://${getLocalIp()}:${PORT}`;

function publicUrlFor(req) {
  if (FIXED_URL) return FIXED_URL;
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http").split(",")[0];
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return host ? `${proto}://${host}` : PUBLIC_URL;
}

const app = express();
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "player.html"));
});

app.get("/host", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "host.html"));
});

app.get("/api/join-info", async (req, res) => {
  const url = publicUrlFor(req);
  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 360 });
  res.json({ url, qr: qrDataUrl });
});

const server = app.listen(PORT, () => {
  console.log("");
  console.log("  Enquete ao vivo rodando!");
  console.log(`  Participantes acessam: ${PUBLIC_URL}`);
  console.log(`  Apresentador abre:     ${PUBLIC_URL}/host`);
  console.log("");
});

const io = new Server(server);

// ---- estado em memória (uma sessão por vez) ----
let state = {
  phase: "lobby", // lobby | question | reveal | end
  questionIndex: -1
};
const votesByQuestion = new Map(); // questionIndex -> Map(socketId -> optionIndex)
const hostSockets = new Set();
let participantCount = 0;

function currentVotesMap() {
  if (!votesByQuestion.has(state.questionIndex)) {
    votesByQuestion.set(state.questionIndex, new Map());
  }
  return votesByQuestion.get(state.questionIndex);
}

function countsForCurrentQuestion() {
  const q = questions[state.questionIndex];
  if (!q) return [];
  const counts = new Array(q.options.length).fill(0);
  for (const optionIndex of currentVotesMap().values()) {
    if (optionIndex >= 0 && optionIndex < counts.length) counts[optionIndex]++;
  }
  return counts;
}

function buildStatePayload() {
  const q = questions[state.questionIndex];
  const payload = {
    phase: state.phase,
    questionIndex: state.questionIndex,
    total: questions.length,
    participantCount
  };
  if (q && (state.phase === "question" || state.phase === "reveal")) {
    payload.question = { text: q.text, options: q.options };
    payload.counts = countsForCurrentQuestion();
    payload.votedCount = currentVotesMap().size;
  }
  if (q && state.phase === "reveal") {
    payload.correctIndex = typeof q.correctIndex === "number" ? q.correctIndex : null;
  }
  return payload;
}

function broadcastState() {
  io.emit("state:update", buildStatePayload());
}

io.on("connection", (socket) => {
  socket.data.isHost = false;
  socket.data.votedOption = null;

  socket.emit("state:update", buildStatePayload());

  socket.on("host:auth", (key, cb) => {
    const ok = !HOST_KEY || key === HOST_KEY;
    if (ok) {
      socket.data.isHost = true;
      hostSockets.add(socket.id);
    }
    if (typeof cb === "function") cb({ ok });
  });

  socket.on("player:join", () => {
    if (!socket.data.counted) {
      socket.data.counted = true;
      participantCount++;
      broadcastState();
    }
  });

  socket.on("host:start", () => {
    if (!socket.data.isHost) return;
    state = { phase: "question", questionIndex: 0 };
    votesByQuestion.delete(0);
    broadcastState();
  });

  socket.on("host:next", () => {
    if (!socket.data.isHost) return;
    const nextIndex = state.questionIndex + 1;
    if (nextIndex >= questions.length) {
      state = { phase: "end", questionIndex: questions.length };
    } else {
      state = { phase: "question", questionIndex: nextIndex };
      votesByQuestion.delete(nextIndex);
    }
    broadcastState();
  });

  socket.on("host:reveal", () => {
    if (!socket.data.isHost) return;
    if (state.phase !== "question") return;
    state = { ...state, phase: "reveal" };
    broadcastState();
  });

  socket.on("host:restart", () => {
    if (!socket.data.isHost) return;
    state = { phase: "lobby", questionIndex: -1 };
    votesByQuestion.clear();
    for (const s of io.sockets.sockets.values()) s.data.votedOption = null;
    broadcastState();
  });

  socket.on("player:vote", (optionIndex) => {
    if (state.phase !== "question") return;
    const q = questions[state.questionIndex];
    if (!q || typeof optionIndex !== "number" || optionIndex < 0 || optionIndex >= q.options.length) return;
    const votes = currentVotesMap();
    if (votes.has(socket.id)) return; // já votou nessa pergunta
    votes.set(socket.id, optionIndex);
    socket.data.votedOption = optionIndex;
    socket.emit("you:voted", { optionIndex });
    broadcastState();
  });

  socket.on("disconnect", () => {
    hostSockets.delete(socket.id);
    if (socket.data.counted) {
      participantCount = Math.max(0, participantCount - 1);
      broadcastState();
    }
  });
});
