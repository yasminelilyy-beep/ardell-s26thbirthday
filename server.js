const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use(express.static(path.join(__dirname, "public")));
const PORT = process.env.PORT || 3000;

const rooms = new Map();
const stages = ["lobby","firstcrack","climb","bali","trivia","tavern","giftrush","boss","ending","finale"];

function makePlayer(id,name,colorIndex=0){return {id,name:(name||"PLAYER").slice(0,14).toUpperCase(),ready:colorIndex===0,score:0,colorIndex,climb:0,giftScore:0,bossDamage:0};}
function makeRoom(code,hostId,hostName){return {code,hostId,stage:"lobby",createdAt:Date.now(),players:{[hostId]:makePlayer(hostId,hostName,0)},climbEndsAt:null,giftEndsAt:null,bossHp:1000,caretaker:new Set(),triviaAnswers:{}};}
function cleanRoom(r){return {...r,caretaker:[...r.caretaker]};}
function emitRoom(code){const r=rooms.get(code);if(r)io.to(code).emit("room:update",cleanRoom(r));}
function plist(r){return Object.values(r.players);}

io.on("connection",socket=>{
  socket.on("room:create",({name},cb)=>{let code;do{code="BABUY"+Math.floor(10+Math.random()*90)}while(rooms.has(code));const r=makeRoom(code,socket.id,name||"ARDELL");rooms.set(code,r);socket.join(code);socket.data.roomCode=code;cb?.({ok:true,code,room:cleanRoom(r)});emitRoom(code);});
  socket.on("room:join",({code,name},cb)=>{code=String(code||"").trim().toUpperCase();const r=rooms.get(code);if(!r)return cb?.({ok:false,message:"Room tidak ditemukan."});if(r.stage!=="lobby")return cb?.({ok:false,message:"Game sudah dimulai."});if(plist(r).length>=4)return cb?.({ok:false,message:"Room sudah penuh."});r.players[socket.id]=makePlayer(socket.id,name,plist(r).length);socket.join(code);socket.data.roomCode=code;cb?.({ok:true,code,room:cleanRoom(r)});emitRoom(code);});
  socket.on("player:ready",ready=>{const r=rooms.get(socket.data.roomCode);if(!r?.players[socket.id])return;r.players[socket.id].ready=!!ready;emitRoom(r.code);});
  socket.on("game:start",()=>{const r=rooms.get(socket.data.roomCode);if(!r||r.hostId!==socket.id)return;r.stage="firstcrack";emitRoom(r.code);});
  socket.on("stage:advance",({stage})=>{const r=rooms.get(socket.data.roomCode);if(!r||r.hostId!==socket.id)return;if(stage&&stages.includes(stage))r.stage=stage;else r.stage=stages[Math.min(stages.length-1,stages.indexOf(r.stage)+1)];if(r.stage==="climb"){r.climbEndsAt=Date.now()+25000;plist(r).forEach(p=>p.climb=0)}if(r.stage==="giftrush"){r.giftEndsAt=Date.now()+18000;plist(r).forEach(p=>p.giftScore=0)}if(r.stage==="boss"){r.bossHp=1000;plist(r).forEach(p=>p.bossDamage=0)}emitRoom(r.code);});
  socket.on("climb:tap",()=>{const r=rooms.get(socket.data.roomCode),p=r?.players[socket.id];if(!p||r.stage!=="climb")return;const d=Math.random()<.13?-7:2+Math.random()*4;p.climb=Math.max(0,Math.min(100,p.climb+d));emitRoom(r.code);});
  socket.on("caretaker:take",item=>{const r=rooms.get(socket.data.roomCode);if(!r||r.stage!=="bali")return;if(["tea","medicine","blanket"].includes(item)){const before=r.caretaker.size;r.caretaker.add(item);if(before<3&&r.caretaker.size===3)plist(r).forEach(p=>p.score+=100);emitRoom(r.code);}});
  socket.on("trivia:answer",({question,answer,correct})=>{const r=rooms.get(socket.data.roomCode),p=r?.players[socket.id];if(!p||r.stage!=="trivia")return;const k=`${question}:${socket.id}`;if(r.triviaAnswers[k]!==undefined)return;r.triviaAnswers[k]=answer;if(correct)p.score+=120;emitRoom(r.code);});
  socket.on("gift:collect",giftId=>{const r=rooms.get(socket.data.roomCode),p=r?.players[socket.id];if(!p||r.stage!=="giftrush")return;p.giftScore++;p.score+=35;io.to(r.code).emit("gift:taken",{giftId,playerId:socket.id});emitRoom(r.code);});
  socket.on("boss:hit",({special})=>{const r=rooms.get(socket.data.roomCode),p=r?.players[socket.id];if(!p||r.stage!=="boss"||r.bossHp<=0)return;const dmg=special?28:16+Math.floor(Math.random()*10);r.bossHp=Math.max(0,r.bossHp-dmg);p.bossDamage+=dmg;p.score+=Math.floor(dmg/2);if(r.bossHp<=0){plist(r).forEach(x=>x.score+=250);setTimeout(()=>{const rr=rooms.get(r.code);if(rr?.stage==="boss"){rr.stage="ending";emitRoom(rr.code)}},1000)}emitRoom(r.code);});
  socket.on("disconnect",()=>{const code=socket.data.roomCode,r=rooms.get(code);if(!r)return;delete r.players[socket.id];if(plist(r).length===0){rooms.delete(code);return}if(r.hostId===socket.id)r.hostId=plist(r)[0].id;emitRoom(code);});
});

setInterval(()=>{const now=Date.now();for(const [code,r] of rooms){if(now-r.createdAt>10800000){rooms.delete(code);continue}if(r.stage==="climb"&&r.climbEndsAt&&now>=r.climbEndsAt){const sorted=plist(r).sort((a,b)=>b.climb-a.climb);sorted.forEach((p,i)=>p.score+=Math.max(50,200-i*40));r.stage="bali";emitRoom(code)}if(r.stage==="giftrush"&&r.giftEndsAt&&now>=r.giftEndsAt){r.stage="boss";emitRoom(code)}}},500);
server.listen(PORT,()=>console.log(`ARDELL 26 running on ${PORT}`));
