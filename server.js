
const express=require("express"),http=require("http");
const {Server}=require("socket.io");
const app=express(),server=http.createServer(app),io=new Server(server);
app.use(express.static("public"));
const rooms={}; const clean=(s,d="PLAYER")=>String(s||d).replace(/[<>]/g,"").slice(0,12).toUpperCase();
const emit=c=>rooms[c]&&io.to(c).emit("state",rooms[c]);
function room(){return{phase:"lobby",round:0,time:0,host:null,players:{},winner:null}}
function start(c){
 const r=rooms[c]; if(!r||r.phase==="playing"||Object.keys(r.players).length<2)return;
 r.phase="countdown";r.winner=null;Object.values(r.players).forEach(p=>{p.progress=0;p.roundScore=0;p.catches=0;p.x=120+Math.random()*760});
 emit(c); let n=3;
 const cd=setInterval(()=>{if(!rooms[c])return clearInterval(cd);rooms[c].count=n--;emit(c);
 if(n<0){clearInterval(cd);r.phase="playing";r.time=r.round===2?35:25;emit(c);timer(c)}},700)
}
function timer(c){const t=setInterval(()=>{const r=rooms[c];if(!r||r.phase!=="playing")return clearInterval(t);r.time--;emit(c);if(r.time<=0){clearInterval(t);finish(c)}} ,1000)}
function finish(c,id){
 const r=rooms[c];if(!r||r.phase!=="playing")return;
 const arr=Object.values(r.players).sort((a,b)=>b.progress-a.progress);
 arr.forEach((p,i)=>{p.roundScore=Math.round(p.progress)+[120,80,55,40][i];p.total+=p.roundScore});
 r.winner=id||arr[0]?.id;r.phase="result";emit(c);
 setTimeout(()=>{if(!rooms[c])return;if(r.round<2){r.round++;r.phase="intermission";r.winner=null}else{r.phase="score"}emit(c)},3200)
}
io.on("connection",s=>{
 s.on("join",({code,name})=>{code=clean(code,"BABUY26");rooms[code]??=room();let r=rooms[code];
  if(Object.keys(r.players).length>=4)return s.emit("full");s.join(code);s.data.code=code;r.host??=s.id;
  r.players[s.id]={id:s.id,name:clean(name),total:0,roundScore:0,progress:0,catches:0,x:150};s.emit("me",s.id);emit(code)});
 s.on("start",()=>{let r=rooms[s.data.code];if(r?.host===s.id){r.round=0;Object.values(r.players).forEach(p=>p.total=0);start(s.data.code)}});
 s.on("next",()=>{let r=rooms[s.data.code];if(r?.host===s.id&&r.phase==="intermission")start(s.data.code)});
 s.on("tap",({accuracy=1}={})=>{let r=rooms[s.data.code],p=r?.players[s.id];if(!p||r.phase!=="playing")return;
  if(r.round===0)p.progress=Math.min(100,p.progress+2.2+Math.random()*1.1);
  if(r.round===1)p.progress=Math.min(100,p.progress+2+Math.max(0,Math.min(1,accuracy))*9);
  if(p.progress>=100)finish(s.data.code,s.id);else emit(s.data.code)});
 s.on("move",({dx})=>{let r=rooms[s.data.code],p=r?.players[s.id];if(!p||r.phase!=="playing"||r.round!==2)return;p.x=Math.max(55,Math.min(945,p.x+(Number(dx)||0)));emit(s.data.code)});
 s.on("catch",({hit})=>{let r=rooms[s.data.code],p=r?.players[s.id];if(!p||r.phase!=="playing"||r.round!==2||!hit)return;p.catches++;p.progress=Math.min(100,p.progress+20);if(p.progress>=100)finish(s.data.code,s.id);else emit(s.data.code)});
 s.on("advance",()=>{let r=rooms[s.data.code];if(!r||r.host!==s.id)return;if(r.phase==="score")r.phase="podium";else if(r.phase==="podium")r.phase="birthday";emit(s.data.code)});
 s.on("again",()=>{let r=rooms[s.data.code];if(!r||r.host!==s.id)return;r.phase="lobby";r.round=0;r.winner=null;Object.values(r.players).forEach(p=>{p.total=0;p.progress=0;p.catches=0});emit(s.data.code)});
 s.on("disconnect",()=>{let r=rooms[s.data.code];if(!r)return;delete r.players[s.id];if(r.host===s.id)r.host=Object.keys(r.players)[0]||null;if(!Object.keys(r.players).length)delete rooms[s.data.code];else emit(s.data.code)})
});
server.listen(process.env.PORT||8080,()=>console.log("ARDELL 26 V6 polished running"));
