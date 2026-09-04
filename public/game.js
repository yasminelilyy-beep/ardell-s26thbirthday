
const socket=io(),c=document.querySelector("#game"),ctx=c.getContext("2d");ctx.imageSmoothingEnabled=false;
let state=null,myId=null,beerNeedle=0,beerDir=1,catchX=500,catchDir=1;
const games=[
 {title:"🧗 CLIMB BATTLE",action:"CLIMB!",desc:"Mash CLIMB! Race to the top."},
 {title:"🍺 BEER CHUG BATTLE",action:"DRINK!",desc:"Tap DRINK when the moving marker is in the center."},
 {title:"🎯 CATCH THE BABUY",action:"CATCH!",desc:"Tap CATCH when Babuy crosses the target."},
 {title:"🪨 BOULDER DASH",action:"JUMP!",desc:"Tap JUMP when the boulder reaches the landing zone."}
];
function rect(x,y,w,h,col){ctx.fillStyle=col;ctx.fillRect(x,y,w,h)}
function txt(s,x,y,n=18,col="#fff"){ctx.font=`bold ${n}px monospace`;ctx.fillStyle="#111";ctx.fillText(s,x+2,y+2);ctx.fillStyle=col;ctx.fillText(s,x,y)}
function person(x,y,col="#eee"){rect(x-11,y-28,22,18,"#2b2019");rect(x-9,y-24,18,16,"#d7a57a");rect(x-12,y-8,24,24,col);rect(x-10,y+16,8,15,"#26394c");rect(x+2,y+16,8,15,"#26394c")}
function render(){
 rect(0,0,1000,560,"#6596aa");rect(0,350,1000,210,"#49663e");
 if(!state){requestAnimationFrame(render);return}
 let r=state.round,g=games[r];
 document.querySelector("#round").textContent=g.title;
 if(r===0){ // climbing wall
   rect(80,45,840,450,"#9b8061");for(let i=0;i<80;i++){let x=(i*83)%810+95,y=(i*47)%410+60;rect(x,y,14,9,["#b64d3d","#e1b62f","#477ca1","#517b45"][i%4])}
   Object.values(state.players).forEach((p,i)=>{let y=480-p.progress*3.8,x=180+i*200;person(x,y,["#eee","#e5a85e","#5c8bb3","#a96784"][i%4]);txt(p.name,x-35,y-38,14,"#ffe17b")})
 } else if(r===1){
   rect(0,360,1000,200,"#8b6c48");rect(80,80,840,220,"#18232c");txt("BEER BAR — HIT THE GOLD ZONE",250,125,24,"#ffd45a");
   rect(180,190,640,40,"#3c4650");rect(450,190,100,40,"#d4a934");rect(180+beerNeedle*6.4,175,8,70,"#fff");beerNeedle+=beerDir*1.4;if(beerNeedle>=100||beerNeedle<=0)beerDir*=-1;
   Object.values(state.players).forEach((p,i)=>{person(170+i*220,420,["#eee","#e5a85e","#5c8bb3","#a96784"][i%4]);txt(`${p.name} ${Math.round(p.progress)}%`,120+i*220,475,14)})
 } else if(r===2){
   rect(0,350,1000,210,"#c5aa68");rect(0,310,1000,40,"#4e8fa7");rect(420,150,160,130,"#4a3729");txt("CATCH ZONE",435,135,17,"#ffe17b");
   rect(catchX-18,300,36,30,"#df9b86");rect(catchX-12,290,24,14,"#2c201d");catchX+=catchDir*5;if(catchX>900||catchX<100)catchDir*=-1;
   Object.values(state.players).forEach((p,i)=>{txt(`${p.name}: ${Math.round(p.progress)}%`,80+i*225,520,14)})
 } else {
   rect(0,0,1000,560,"#344357");rect(0,400,1000,160,"#59614d");rect(760,300,120,100,"#ad925e");txt("LAND HERE",750,285,16,"#ffe17b");
   rect(catchX-25,365,50,35,"#777");catchX+=catchDir*6;if(catchX>920||catchX<80)catchDir*=-1;
   Object.values(state.players).forEach((p,i)=>{person(120+i*130,380,["#eee","#e5a85e","#5c8bb3","#a96784"][i%4]);txt(`${p.name} ${Math.round(p.progress)}%`,70+i*220,500,14)})
 }
 txt(state.phase==="playing"?`TIME ${state.time}`:"GET READY",20,35,20,"#ffe17b");
 requestAnimationFrame(render)
}
socket.on("connect",()=>myId=socket.id);
socket.on("state",s=>{state=s;updateUI();if(s.phase==="result"&&s.winner){let w=s.players[s.winner];show(`${w?.name||"PLAYER"} WINS! 🏆<br>+ points — next battle loading...`)}})
socket.on("full",()=>alert("Room is full (maximum 4 players)."));
function updateUI(){if(!state)return;let p=document.querySelector("#players");p.innerHTML=Object.values(state.players).map(v=>`<div class="player ${v.id===myId?"me":""}">${v.name} ⭐ ${v.score} ${v.ready?"✓":""}</div>`).join("");
 let g=games[state.round];document.querySelector("#action").textContent=g.action;document.querySelector("#action").disabled=state.phase!=="playing";document.querySelector("#ready").disabled=state.phase!=="lobby";document.querySelector("#startBtn").disabled=state.phase!=="lobby"||Object.keys(state.players).length<2}
function show(s){let b=document.querySelector("#banner");b.innerHTML=s;b.style.display="block";setTimeout(()=>b.style.display="none",3000)}
document.querySelector("#joinBtn").onclick=()=>{let name=document.querySelector("#name").value.trim();if(!name)return alert("Enter player name");socket.emit("join",{name,room:document.querySelector("#room").value});document.querySelector("#join").style.display="none"}
document.querySelector("#ready").onclick=()=>socket.emit("ready");
document.querySelector("#startBtn").onclick=()=>socket.emit("start");
document.querySelector("#action").onclick=()=>{
 if(!state||state.phase!=="playing")return;let hit=true,power=1;
 if(state.round===1){let d=Math.abs(beerNeedle-50);power=Math.max(1,6-d/10)}
 if(state.round===2)hit=catchX>420&&catchX<580;
 if(state.round===3)hit=catchX>735&&catchX<900;
 socket.emit("action",{hit,power})
};
render();
