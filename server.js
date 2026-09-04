
const express=require("express"), http=require("http");
const {Server}=require("socket.io");
const app=express(), server=http.createServer(app), io=new Server(server);
app.use(express.static("public"));
const rooms={};
const clean=s=>String(s||"").replace(/[<>]/g,"").slice(0,14).toUpperCase();
function state(room){io.to(room).emit("state",rooms[room])}
io.on("connection",s=>{
 s.on("join",({room,name})=>{
   room=clean(room)||"BABUY26"; name=clean(name)||"PLAYER";
   s.join(room); s.data.room=room;
   rooms[room]??={phase:"lobby",round:0,time:0,players:{},winner:null};
   if(Object.keys(rooms[room].players).length>=4)return s.emit("full");
   rooms[room].players[s.id]={id:s.id,name,score:0,ready:false,progress:0,x:50+Math.random()*40};
   state(room);
 });
 s.on("ready",()=>{let r=rooms[s.data.room];if(!r?.players[s.id])return;r.players[s.id].ready=true;state(s.data.room)});
 s.on("start",()=>startRound(s.data.room));
 s.on("action",data=>action(s.data.room,s.id,data||{}));
 s.on("disconnect",()=>{let r=rooms[s.data.room];if(r){delete r.players[s.id];state(s.data.room)}})
});
function startRound(room){
 let r=rooms[room]; if(!r||r.phase==="playing")return;
 let ps=Object.values(r.players); if(ps.length<2)return;
 r.phase="playing";r.winner=null;r.time=30;ps.forEach(p=>p.progress=0);state(room);
 let timer=setInterval(()=>{let rr=rooms[room];if(!rr||rr.phase!=="playing"){clearInterval(timer);return}
   rr.time--;state(room);if(rr.time<=0){clearInterval(timer);finish(room)}
 },1000)
}
function action(room,id,d){
 let r=rooms[room],p=r?.players[id];if(!p||r.phase!=="playing")return;
 let gain=0;
 if(r.round===0) gain=2.5; // climb mash
 if(r.round===1) gain=Math.max(0,Math.min(6,Number(d.power)||1)); // beer timing
 if(r.round===2) gain=d.hit?12:0; // catch
 if(r.round===3) gain=d.hit?8:0; // boulder dash
 p.progress=Math.min(100,p.progress+gain);
 if(p.progress>=100) finish(room,id); else state(room);
}
function finish(room,id){
 let r=rooms[room];if(!r||r.phase!=="playing")return;
 let ps=Object.values(r.players), win=id? r.players[id] : ps.sort((a,b)=>b.progress-a.progress)[0];
 if(win){win.score+=100+(r.time*2);r.winner=win.id}
 r.phase="result";state(room);
 setTimeout(()=>{if(!rooms[room])return;r.round=(r.round+1)%4;r.phase="lobby";Object.values(r.players).forEach(p=>{p.ready=false;p.progress=0});state(room)},3500)
}
server.listen(process.env.PORT||8080,()=>console.log("ARDELL 26 multiplayer battle running"));
