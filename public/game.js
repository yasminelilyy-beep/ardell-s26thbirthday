
const socket = io();
const c = document.querySelector("#game");
const g = c.getContext("2d");
g.imageSmoothingEnabled = false;

let me = null, room = null;
let beerNeedle = 0, beerDir = 1;
let babuy = {x:500,y:210,vx:4.4,phase:0};
let chalk = Array.from({length:70},()=>({x:Math.random()*1000,y:Math.random()*600,s:2+Math.random()*5,v:1+Math.random()*2}));
let confetti = Array.from({length:90},()=>({x:Math.random()*1000,y:Math.random()*600,v:1+Math.random()*4,r:Math.random()*6}));
let lastCatchSend = 0;

const names = ["ARDELL","YASMINE","DRAGO","SNOBUY"];
const palettes = [
  {shirt:"#d84d62", hair:"#301f1c", skin:"#e8b18d"},
  {shirt:"#5b98cf", hair:"#33251e", skin:"#edbb95"},
  {shirt:"#4f8e61", hair:"#191a1c", skin:"#b77d5d"},
  {shirt:"#dfb84b", hair:"#d6c3a5", skin:"#e8b18d"}
];

const el = id => document.getElementById(id);
function rect(x,y,w,h,col){g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function ptext(t,x,y,size=18,col="#fff",align="left"){
  g.textAlign=align; g.font=`900 ${size}px "Courier New", monospace`;
  g.fillStyle="#0a1118"; g.fillText(t,x+2,y+2); g.fillStyle=col; g.fillText(t,x,y);
}
function pxline(x1,y1,x2,y2,col,w=4){g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()}

function sprite(x,y,idx,scale=1,pose=0){
  const p=palettes[idx%palettes.length], S=scale;
  rect(x-10*S,y-31*S,20*S,9*S,p.hair);
  rect(x-12*S,y-25*S,24*S,18*S,p.skin);
  rect(x-8*S,y-21*S,4*S,4*S,"#151515"); rect(x+4*S,y-21*S,4*S,4*S,"#151515");
  rect(x-13*S,y-6*S,26*S,24*S,p.shirt);
  if(pose===1){rect(x-21*S,y-7*S,9*S,7*S,p.skin);rect(x+12*S,y-14*S,9*S,7*S,p.skin)}
  else {rect(x-19*S,y,7*S,17*S,p.skin);rect(x+12*S,y,7*S,7*S,17*S,p.skin)}
  rect(x-11*S,y+18*S,9*S,18*S,"#263c52");rect(x+2*S,y+18*S,9*S,18*S,"#263c52");
  rect(x-12*S,y+34*S,10*S,5*S,"#17191d");rect(x+2*S,y+34*S,10*S,5*S,"#17191d");
}
function babuySprite(x,y,s=1){
  rect(x-22*s,y-14*s,44*s,29*s,"#f3c8c7");
  rect(x-17*s,y-23*s,12*s,12*s,"#f3c8c7");rect(x+5*s,y-23*s,12*s,12*s,"#f3c8c7");
  rect(x-13*s,y-2*s,7*s,7*s,"#211a1a");rect(x+6*s,y-2*s,7*s,7*s,"#211a1a");
  rect(x-7*s,y+5*s,14*s,7*s,"#e39194");rect(x-18*s,y+14*s,8*s,6*s,"#e9aaa9");rect(x+10*s,y+14*s,8*s,6*s,"#e9aaa9");
}
function mountainBg(){
  rect(0,0,1000,600,"#78b8d1"); 
  [[-80,360,330,"#516e7a"],[170,330,380,"#3d6777"],[470,370,390,"#527887"],[760,330,350,"#456c7d"]].forEach(m=>{
    g.fillStyle=m[3];g.beginPath();g.moveTo(m[0],m[1]);g.lineTo(m[0]+m[2]/2,70+(m[0]%90));g.lineTo(m[0]+m[2],m[1]);g.fill();
  });
  rect(0,380,1000,220,"#2f603c");
  for(let i=0;i<30;i++){let x=(i*77)%1000,y=330+(i%4)*20;rect(x,y,24,55,"#274b31");rect(x-10,y-18,44,35,"#3f7c45")}
}
function tavernBg(){
  rect(0,0,1000,600,"#34231e");rect(0,360,1000,240,"#7a5237");
  for(let i=0;i<13;i++){rect(i*82,70,55,110,"#513222");rect(i*82+6,82,43,16,"#c37c37");rect(i*82+12,112,31,48,"#6e4430")}
  rect(0,315,1000,30,"#2a1b17");rect(0,345,1000,55,"#6a432d");
  for(let i=0;i<8;i++){rect(65+i*125,40,8,35,"#29201c");rect(50+i*125,70,38,7,"#eda94d")}
}
function snowBg(){
  rect(0,0,1000,600,"#6db2d7");
  g.fillStyle="#cfdeea";g.beginPath();g.moveTo(0,380);g.lineTo(250,80);g.lineTo(510,380);g.fill();
  g.fillStyle="#e6edf4";g.beginPath();g.moveTo(360,380);g.lineTo(700,100);g.lineTo(1000,380);g.fill();
  rect(0,390,1000,210,"#dbe9ec");
  [80,280,520,760].forEach((x,i)=>{rect(x,360-(i%2)*45,170,30,"#eff7f8");rect(x+20,390-(i%2)*45,130,25,"#b9d5dc")});
}

function drawLobby(){
  mountainBg();
  ptext("ARDELL 26",500,125,64,"#ffe05f","center");
  ptext("THE BABUY QUEST",500,165,25,"#fff","center");
  ptext("CLIMB • DRINK • CATCH",500,200,17,"#eaf3f7","center");
  Object.values(room?.players||{}).forEach((p,i)=>{sprite(300+i*140,430,i,1.25);ptext(p.name,300+i*140,492,14,"#fff0a8","center")});
  ptext("2–4 FRIENDS. 3 BATTLES. 1 WINNER.",500,545,18,"#ffe05f","center");
}

function drawClimb(){
  mountainBg();
  rect(70,45,860,500,"#8a775e");
  const ps=Object.values(room.players);
  const laneW=820/Math.max(ps.length,2);
  ps.forEach((p,i)=>{
    let x=90+i*laneW, laneX=x+10;
    rect(laneX,58,laneW-20,470,["#9c6c65","#6686a2","#718d66","#b29459"][i%4]);
    for(let h=0;h<22;h++){
      let hx=laneX+22+((h*47+i*17)%(Math.max(45,laneW-58)));
      let hy=85+((h*73+i*31)%405);
      rect(hx,hy,13+(h%3)*3,9+(h%2)*3,["#d95a55","#e9bc3b","#4a8f9e","#6fa355","#b8629a"][h%5]);
    }
    let sy=495-p.progress*3.9;
    sprite(laneX+(laneW-20)/2,sy,i,1.0,1);
    ptext(p.name,laneX+(laneW-20)/2,525,14,"#fff7bd","center");
    rect(laneX+12,65,9,390,"#1b2630");rect(laneX+12,455-p.progress*3.8,9,p.progress*3.8,"#5ee19a");
    rect(laneX+5,74,25,10,"#e54c4c");
  });
  ptext("CLIMB BATTLE",500,32,29,"#fff1a8","center");
}

function drawBeer(){
  tavernBg();
  ptext("BEER BATTLE",500,42,31,"#ffe08b","center");
  ptext("DRINK FAST — HIT THE GOLD ZONE!",500,69,15,"#fff","center");
  const ps=Object.values(room.players), lane=900/Math.max(ps.length,2);
  ps.forEach((p,i)=>{
    const x=50+i*lane+lane/2;
    sprite(x,400,i,1.15,1);
    // beer mug with animated fill based on progress
    rect(x-32,425,64,90,"#dde9ed");rect(x-25,432,50,72,"#53331f");
    const beerH=66*(p.progress/100);
    rect(x-25,498-beerH,50,beerH,"#e7a72d");
    rect(x-23,434,46,10,"#fff0c4");
    rect(x+31,449,13,38,"#dde9ed");rect(x+34,454,7,27,"#34231e");
    ptext(p.name,x,542,14,"#fff1a8","center");
    rect(x-30,95,60,180,"#17202a");rect(x-22,105,44,160,"#494c50");
    rect(x-22,265-p.progress*1.6,44,p.progress*1.6,"#e8b02f");
    rect(x-31,84,62,12,"#fff");
  });
  // timing rail
  rect(160,285,680,18,"#17202a");rect(438,282,124,24,"#e8bd43");
  rect(160+beerNeedle*6.8,275,8,39,"#fff");
  beerNeedle += beerDir*1.2;
  if(beerNeedle>=100 || beerNeedle<=0) beerDir *= -1;
  ptext("TIMING BAR",500,330,14,"#f7e8b9","center");
}

function drawCatch(){
  snowBg();
  ptext("CATCH THE BABUY",500,40,31,"#fff3b0","center");
  ptext("MOVE • JUMP • CATCH!",500,67,15,"#fff","center");
  chalk.forEach(f=>{rect(f.x,f.y,f.s,f.s,"#f8fbfc");f.y+=f.v;if(f.y>600){f.y=-10;f.x=Math.random()*1000}});
  babuy.x += babuy.vx; babuy.phase += .08; babuy.y=205+Math.sin(babuy.phase)*65;
  if(babuy.x>910||babuy.x<90) babuy.vx*=-1;
  babuySprite(babuy.x,babuy.y,1.35);
  ptext("BABUY!",babuy.x,babuy.y-40,13,"#ffdfef","center");

  const ps=Object.values(room.players);
  ps.forEach((p,i)=>{
    let x = p.catchX || (160+i*210);
    let y = 455;
    if(p.id===me){
      const localY = window._catchY ?? 455, localVy = window._catchVy ?? 0;
      window._catchY=localY+(window._catchVy||0);
      window._catchVy=(window._catchVy||0)+0.85;
      if(window._catchY>=455){window._catchY=455;window._catchVy=0}
      y=window._catchY;
    }
    sprite(x,y,i,1.0,y<430?1:0);
    ptext(`${p.name} ${p.catches||0}/5`,x,510,13,"#16202a","center");
  });
}

function drawFinal(){
  mountainBg();rect(90,70,820,450,"#0b1e31cc");
  ptext("FINAL SCORE",500,120,42,"#ffe064","center");
  const sorted=Object.values(room.players).sort((a,b)=>b.total-a.total);
  sorted.forEach((p,i)=>{
    const y=175+i*70;rect(155,y-31,690,54,["#bd5668","#5e95bf","#5c9069","#c5a34e"][i%4]);
    ptext(`${i+1}`,180,y+3,28,"#fff","center");ptext(p.name,225,y,20,"#fff");
    ptext(`${p.total} PTS`,805,y,20,"#fff3a2","right");
  });
}

function drawPodium(){
  tavernBg();
  for(const q of confetti){rect(q.x,q.y,q.r,9,["#f25b62","#ffd75b","#67c4dc","#8bd36f"][Math.floor(q.x)%4]);q.y+=q.v;if(q.y>600)q.y=-10}
  ptext("WINNER!",500,75,48,"#ffe064","center");
  const sorted=Object.values(room.players).sort((a,b)=>b.total-a.total);
  const spots=[{x:500,y:390,h:170,n:1},{x:330,y:435,h:125,n:2},{x:670,y:455,h:105,n:3},{x:815,y:475,h:85,n:4}];
  sorted.forEach((p,i)=>{
    const s=spots[i];rect(s.x-65,s.y,130,s.h,"#9ba7b2");ptext(String(s.n),s.x,s.y+55,38,"#27313b","center");sprite(s.x,s.y-25,i,1.3,1);ptext(p.name,s.x,s.y+s.h-12,13,"#fff1a8","center");
  });
}

function drawBirthday(){
  mountainBg();rect(0,0,1000,600,"#081629aa");
  rect(0,465,1000,135,"#12291e");
  // campfire
  rect(470,490,60,10,"#6d452b");rect(485,455,30,38,"#f5a42e");rect(493,465,15,24,"#ffe168");
  const ps=Object.values(room.players);
  ps.forEach((p,i)=>sprite(360+i*95,500,i,1.05));
  babuySprite(760,505,1);
  ptext("HAPPY 26TH BIRTHDAY",500,105,28,"#ffe2a1","center");
  ptext("ARDELL ♥",500,150,48,"#ff9fb0","center");
  ptext("Keep climbing higher, chasing bigger things,",500,205,17,"#fff","center");
  ptext("and keep being you.",500,233,17,"#fff","center");
  ptext("I'll always be cheering for you.",500,272,18,"#ffe4a8","center");
  ptext("I LOVE YOU. ♥",500,310,21,"#ffadbd","center");
}

function draw(){
  if(!room){rect(0,0,1000,600,"#0b1a27");requestAnimationFrame(draw);return}
  if(room.phase==="lobby"||room.phase==="intermission") drawLobby();
  else if(room.phase==="playing"||room.phase==="roundResult"){
    if(room.roundIndex===0)drawClimb();
    if(room.roundIndex===1)drawBeer();
    if(room.roundIndex===2)drawCatch();
  } else if(room.phase==="finalScore") drawFinal();
  else if(room.phase==="podium") drawPodium();
  else if(room.phase==="birthday") drawBirthday();
  requestAnimationFrame(draw);
}

function show(msg,ms=2600){
  const box=el("overlayMessage");box.innerHTML=msg;box.style.display="block";
  clearTimeout(show.t);show.t=setTimeout(()=>box.style.display="none",ms);
}

function updateUI(){
  if(!room)return;
  const roundNames=["CLIMB BATTLE","BEER BATTLE","CATCH THE BABUY"];
  el("roundTitle").textContent =
    room.phase==="finalScore"?"FINAL SCORE":
    room.phase==="podium"?"PODIUM":
    room.phase==="birthday"?"BIRTHDAY ENDING 🎂":
    roundNames[room.roundIndex] || "THE BABUY QUEST";
  el("timerHud").textContent=room.phase==="playing"?`TIME ${room.timer}s`:`${Object.keys(room.players).length}/4 PLAYERS`;
  el("statusHud").textContent=room.phase.toUpperCase();
  el("roomHud").textContent=`ROOM ${el("roomInput").value.toUpperCase() || "BABUY26"}`;

  const cards=el("playerCards");
  cards.innerHTML=Object.values(room.players).map(p=>`
    <div class="pcard ${p.id===me?"me":""}">
      <div class="name">${p.name}${p.id===room.hostId?" 👑":""}</div>
      <div class="score">⭐ ${p.total}</div>
      <div class="bar"><div class="fill" style="width:${Math.min(100,p.progress)}%"></div></div>
    </div>`).join("");

  const host=me===room.hostId;
  ["readyBtn","startBtn","mainAction","catchControls","nextBtn","againBtn"].forEach(id=>el(id).style.display="none");
  if(room.phase==="lobby"){
    el("readyBtn").style.display="";
    if(host){el("startBtn").style.display="";el("startBtn").disabled=Object.keys(room.players).length<2}
  } else if(room.phase==="playing"){
    if(room.roundIndex<2){el("mainAction").style.display="";el("mainAction").textContent=room.roundIndex===0?"CLIMB!":"DRINK!"}
    else el("catchControls").style.display="flex";
  } else if(room.phase==="intermission" && host) el("nextBtn").style.display="";
  else if(room.phase==="birthday" && host) el("againBtn").style.display="";
}

socket.on("connect",()=>{});
socket.on("youAre",id=>me=id);
socket.on("roomState",s=>{
  const oldPhase=room?.phase, oldWinner=room?.winnerId;
  room=s; updateUI();
  if(s.phase==="roundResult" && s.winnerId && (oldPhase!=="roundResult" || oldWinner!==s.winnerId)){
    const w=s.players[s.winnerId];show(`🏆 ${w?.name||"PLAYER"} WINS THIS BATTLE!`,3200);
  }
  if(s.phase==="intermission" && oldPhase!=="intermission") show("BATTLE CLEAR! Ready for the next one.",2600);
  if(s.phase==="finalScore" && oldPhase!=="finalScore") show("ALL 3 BATTLES COMPLETE!",3000);
});
socket.on("roomFull",()=>{alert("Room penuh. Maksimal 4 pemain.");location.reload()});

el("joinBtn").addEventListener("click",()=>{
  const name=el("nameInput").value.trim();
  if(!name){alert("Isi nama pemain dulu.");return}
  socket.emit("joinRoom",{roomCode:el("roomInput").value,name});
  el("joinScreen").style.display="none";
});
el("readyBtn").addEventListener("click",()=>socket.emit("ready"));
el("startBtn").addEventListener("click",()=>socket.emit("startGame"));
el("nextBtn").addEventListener("click",()=>socket.emit("nextRound"));
el("againBtn").addEventListener("click",()=>socket.emit("playAgain"));

el("mainAction").addEventListener("click",()=>{
  if(!room||room.phase!=="playing")return;
  if(room.roundIndex===0) socket.emit("climbTap");
  if(room.roundIndex===1){
    const accuracy=Math.max(0,1-Math.abs(beerNeedle-50)/50);
    socket.emit("beerTap",{accuracy});
  }
});

function move(dx){
  if(!room||room.phase!=="playing"||room.roundIndex!==2)return;
  socket.emit("catchMove",{dx});
}
el("leftBtn").addEventListener("pointerdown",()=>move(-22));
el("rightBtn").addEventListener("pointerdown",()=>move(22));
el("jumpBtn").addEventListener("click",()=>{
  if((window._catchY??455)>=454)window._catchVy=-15;
  socket.emit("catchJump");
});
el("catchBtn").addEventListener("click",()=>{
  if(!room||room.roundIndex!==2||room.phase!=="playing")return;
  const p=room.players[me]; if(!p)return;
  const py=window._catchY??455;
  const dx=Math.abs((p.catchX||140)-babuy.x), dy=Math.abs((py-25)-babuy.y);
  const hit=dx<85&&dy<145;
  socket.emit("catchHit",{hit});
  show(hit?"✨ CAUGHT BABUY! +1":"Almost! Jump closer to Babuy.",900);
});

document.addEventListener("keydown",e=>{
  if(["INPUT","TEXTAREA"].includes(document.activeElement?.tagName))return;
  if(e.key==="ArrowLeft")move(-22);
  if(e.key==="ArrowRight")move(22);
  if(e.key==="ArrowUp"||e.key===" "){
    if(room?.roundIndex===2){if((window._catchY??455)>=454)window._catchVy=-15;socket.emit("catchJump")}
    else el("mainAction").click();
  }
  if(e.key==="Enter")el("mainAction").click();
});

draw();
