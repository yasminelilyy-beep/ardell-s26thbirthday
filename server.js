
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static("public"));

const rooms = {};
const ROUNDS = ["climb","beer","catch"];

const clean = (v, fallback="PLAYER") =>
  String(v || fallback).replace(/[<>]/g, "").trim().slice(0, 12).toUpperCase();

function emitRoom(code) {
  if (rooms[code]) io.to(code).emit("roomState", rooms[code]);
}

function ranking(room) {
  return Object.values(room.players).sort((a,b) => b.total - a.total);
}

function newRoom() {
  return {
    phase: "lobby",
    roundIndex: 0,
    timer: 0,
    players: {},
    winnerId: null,
    resultText: "",
    hostId: null
  };
}

function startRound(code) {
  const room = rooms[code];
  if (!room || room.phase === "playing") return;

  const players = Object.values(room.players);
  if (players.length < 2) return;

  room.phase = "playing";
  room.timer = room.roundIndex === 2 ? 35 : 25;
  room.winnerId = null;
  room.resultText = "";
  players.forEach(p => {
    p.progress = 0;
    p.roundScore = 0;
    p.catchX = 110 + Math.random() * 160;
    p.catchY = 390;
    p.vy = 0;
    p.grounded = true;
    p.catches = 0;
    p.ready = false;
  });
  emitRoom(code);

  const tick = setInterval(() => {
    const r = rooms[code];
    if (!r || r.phase !== "playing") {
      clearInterval(tick);
      return;
    }
    r.timer -= 1;
    if (r.timer <= 0) {
      clearInterval(tick);
      finishRound(code);
    }
    emitRoom(code);
  }, 1000);
}

function finishRound(code, forcedWinnerId=null) {
  const room = rooms[code];
  if (!room || room.phase !== "playing") return;

  const players = Object.values(room.players);
  let winner = forcedWinnerId ? room.players[forcedWinnerId] : null;
  if (!winner) winner = [...players].sort((a,b)=>b.progress-a.progress)[0];

  const sorted = [...players].sort((a,b)=>b.progress-a.progress);
  sorted.forEach((p,i) => {
    const placementBonus = [100,70,50,35][i] || 25;
    p.roundScore = Math.round(p.progress) + placementBonus;
    p.total += p.roundScore;
  });

  room.winnerId = winner?.id || null;
  room.phase = "roundResult";
  emitRoom(code);

  setTimeout(() => {
    const r = rooms[code];
    if (!r) return;
    if (r.roundIndex >= ROUNDS.length - 1) {
      r.phase = "finalScore";
      emitRoom(code);
      setTimeout(() => {
        if (!rooms[code]) return;
        rooms[code].phase = "podium";
        emitRoom(code);
      }, 5000);
      setTimeout(() => {
        if (!rooms[code]) return;
        rooms[code].phase = "birthday";
        emitRoom(code);
      }, 10000);
    } else {
      r.roundIndex += 1;
      r.phase = "intermission";
      r.winnerId = null;
      emitRoom(code);
    }
  }, 3500);
}

io.on("connection", socket => {
  socket.on("joinRoom", ({roomCode, name}) => {
    const code = clean(roomCode, "BABUY26");
    const playerName = clean(name, "PLAYER");
    rooms[code] ??= newRoom();
    const room = rooms[code];

    if (Object.keys(room.players).length >= 4) {
      socket.emit("roomFull");
      return;
    }
    socket.join(code);
    socket.data.roomCode = code;
    room.hostId ??= socket.id;
    room.players[socket.id] = {
      id: socket.id,
      name: playerName,
      total: 0,
      roundScore: 0,
      progress: 0,
      ready: false,
      catches: 0,
      catchX: 140,
      catchY: 390,
      vy: 0,
      grounded: true
    };
    socket.emit("youAre", socket.id);
    emitRoom(code);
  });

  socket.on("ready", () => {
    const code = socket.data.roomCode, room = rooms[code];
    if (!room?.players[socket.id]) return;
    room.players[socket.id].ready = true;
    emitRoom(code);
  });

  socket.on("startGame", () => {
    const code = socket.data.roomCode, room = rooms[code];
    if (!room || room.hostId !== socket.id || Object.keys(room.players).length < 2) return;
    room.roundIndex = 0;
    Object.values(room.players).forEach(p => { p.total = 0; p.roundScore = 0; p.progress = 0; });
    startRound(code);
  });

  socket.on("nextRound", () => {
    const code = socket.data.roomCode, room = rooms[code];
    if (!room || room.hostId !== socket.id || room.phase !== "intermission") return;
    startRound(code);
  });

  socket.on("climbTap", () => {
    const room = rooms[socket.data.roomCode], p = room?.players[socket.id];
    if (!p || room.phase !== "playing" || room.roundIndex !== 0) return;
    const gain = 2.3 + Math.random() * 1.0;
    p.progress = Math.min(100, p.progress + gain);
    if (p.progress >= 100) finishRound(socket.data.roomCode, socket.id);
    else emitRoom(socket.data.roomCode);
  });

  socket.on("beerTap", ({accuracy}) => {
    const room = rooms[socket.data.roomCode], p = room?.players[socket.id];
    if (!p || room.phase !== "playing" || room.roundIndex !== 1) return;
    const acc = Math.max(0, Math.min(1, Number(accuracy) || 0));
    p.progress = Math.min(100, p.progress + 2 + acc * 9);
    if (p.progress >= 100) finishRound(socket.data.roomCode, socket.id);
    else emitRoom(socket.data.roomCode);
  });

  socket.on("catchMove", ({dx}) => {
    const room = rooms[socket.data.roomCode], p = room?.players[socket.id];
    if (!p || room.phase !== "playing" || room.roundIndex !== 2) return;
    p.catchX = Math.max(55, Math.min(945, p.catchX + Math.max(-24, Math.min(24, Number(dx)||0))));
    emitRoom(socket.data.roomCode);
  });

  socket.on("catchJump", () => {
    const room = rooms[socket.data.roomCode], p = room?.players[socket.id];
    if (!p || room.phase !== "playing" || room.roundIndex !== 2) return;
    if (p.grounded) {
      p.vy = -15;
      p.grounded = false;
    }
  });

  socket.on("catchHit", ({hit}) => {
    const room = rooms[socket.data.roomCode], p = room?.players[socket.id];
    if (!p || room.phase !== "playing" || room.roundIndex !== 2) return;
    if (hit) {
      p.catches += 1;
      p.progress = Math.min(100, p.progress + 20);
      if (p.progress >= 100) finishRound(socket.data.roomCode, socket.id);
      else emitRoom(socket.data.roomCode);
    }
  });

  socket.on("playAgain", () => {
    const code = socket.data.roomCode, room = rooms[code];
    if (!room || room.hostId !== socket.id) return;
    room.phase = "lobby";
    room.roundIndex = 0;
    room.winnerId = null;
    Object.values(room.players).forEach(p => {
      p.total = 0; p.roundScore = 0; p.progress = 0; p.ready = false; p.catches = 0;
    });
    emitRoom(code);
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode, room = rooms[code];
    if (!room) return;
    delete room.players[socket.id];
    if (room.hostId === socket.id) room.hostId = Object.keys(room.players)[0] || null;
    if (!Object.keys(room.players).length) delete rooms[code];
    else emitRoom(code);
  });
});

server.listen(process.env.PORT || 8080, () => console.log("ARDELL 26 V5 running"));
