const express=require('express'),http=require('http');
const {Server}=require('socket.io');
const app=express(),server=http.createServer(app),io=new Server(server);
app.use(express.static('public'));
const rooms={};
const clean=(v,d='PLAYER')=>String(v||d).replace(/[<>]/g,'').trim().slice(0,12).toUpperCase();
const emit=c=>rooms[c]&&io.to(c).emit('state',rooms[c]);
const mk=()=>({phase:'lobby',round:0,time:0,count:3,host:null,winner:null,players:{},chalk:[],chalkSeq:0});
function stopChalk(r){if(r?.chalkTimer){clearInterval(r.chalkTimer);r.chalkTimer=null}}
function timer(c){const t=setInterval(()=>{const r=rooms[c];if(!r||r.phase!=='playing')return clearInterval(t);r.time--;emit(c);if(r.time<=0){clearInterval(t);finish(c)}},1000)}
function chalkLoop(c){const r=rooms[c];stopChalk(r);r.chalk=[];let tick=0;r.chalkTimer=setInterval(()=>{const rr=rooms[c];if(!rr||rr.phase!=='playing'||rr.round!==2){stopChalk(rr);return}tick++;if(tick%6===0&&rr.chalk.length<14){rr.chalk.push({id:++rr.chalkSeq,x:7+Math.random()*86,y:-8-Math.random()*9,s:1.0+Math.random()*.45})}
 rr.chalk.forEach(ch=>ch.y+=ch.s*1.05);
 for(const p of Object.values(rr.players)){
   const py=88;
   for(const ch of rr.chalk){if(ch.hit)continue;if(ch.y>82&&ch.y<96&&Math.abs(ch.x-p.x)<8){ch.hit=true;p.catches=(p.catches||0)+1;p.progress=Math.min(100,p.catches*7);}}
 }
 rr.chalk=rr.chalk.filter(ch=>!ch.hit&&ch.y<110);
 if(Object.values(rr.players).some(p=>p.progress>=100)){const w=Object.values(rr.players).sort((a,b)=>b.progress-a.progress)[0];stopChalk(rr);return finish(c,w?.id)}
 if(tick%2===0)emit(c);
},50)}
function start(c){const r=rooms[c];if(!r||Object.keys(r.players).length<2)return;r.phase='countdown';r.count=3;r.winner=null;r.chalk=[];Object.values(r.players).forEach((p,i)=>{p.progress=0;p.roundScore=0;p.catches=0;p.x=15+i*(70/Math.max(1,Object.keys(r.players).length-1))});emit(c);let n=3;const cd=setInterval(()=>{if(!rooms[c])return clearInterval(cd);r.count=n--;emit(c);if(n<0){clearInterval(cd);r.phase='playing';r.time=r.round===0?25:r.round===1?22:30;emit(c);timer(c);if(r.round===2)chalkLoop(c)}},700)}
function finish(c,id){const r=rooms[c];if(!r||r.phase!=='playing')return;stopChalk(r);const a=Object.values(r.players).sort((x,y)=>y.progress-x.progress);a.forEach((p,i)=>{p.roundScore=Math.round(p.progress)+[120,80,55,40][i];p.total+=p.roundScore});r.winner=id||a[0]?.id;r.phase='result';emit(c);setTimeout(()=>{if(!rooms[c])return;if(r.round<2){r.round++;r.phase='intermission';r.winner=null;r.chalk=[]}else r.phase='score';emit(c)},2800)}
io.on('connection',s=>{
 s.on('join',({code,name})=>{code=clean(code,'BABUY26');rooms[code]??=mk();const r=rooms[code];if(Object.keys(r.players).length>=4)return s.emit('full');s.join(code);s.data.code=code;r.host??=s.id;const used=new Set(Object.values(r.players).map(p=>p.avatar));const avatar=[0,1,2,3].find(i=>!used.has(i))??0;r.players[s.id]={id:s.id,name:clean(name),avatar,total:0,roundScore:0,progress:0,x:50,catches:0};s.emit('me',s.id);emit(code)});
 s.on('start',()=>{const r=rooms[s.data.code];if(r?.host!==s.id)return;r.round=0;Object.values(r.players).forEach(p=>{p.total=0;p.progress=0;p.catches=0});start(s.data.code)});
 s.on('next',()=>{const r=rooms[s.data.code];if(r?.host===s.id&&r.phase==='intermission')start(s.data.code)});
 s.on('tap',({accuracy=1}={})=>{const r=rooms[s.data.code],p=r?.players[s.id];if(!p||r.phase!=='playing'||r.round===2)return;if(r.round===0)p.progress=Math.min(100,p.progress+2.1+Math.random()*1.2);if(r.round===1)p.progress=Math.min(100,p.progress+2+Math.max(0,Math.min(1,accuracy))*9);if(p.progress>=100)finish(s.data.code,s.id);else emit(s.data.code)});
 s.on('moveTo',x=>{const r=rooms[s.data.code],p=r?.players[s.id];if(!p||r.phase!=='playing'||r.round!==2)return;x=Number(x);if(!Number.isFinite(x))return;p.x=Math.max(5,Math.min(95,x));});
 s.on('advance',()=>{const r=rooms[s.data.code];if(!r||r.host!==s.id)return;if(r.phase==='score')r.phase='podium';else if(r.phase==='podium')r.phase='birthday';emit(s.data.code)});
 s.on('again',()=>{const r=rooms[s.data.code];if(!r||r.host!==s.id)return;stopChalk(r);r.phase='lobby';r.round=0;r.winner=null;r.chalk=[];Object.values(r.players).forEach(p=>{p.total=0;p.progress=0;p.catches=0});emit(s.data.code)});
 s.on('disconnect',()=>{const r=rooms[s.data.code];if(!r)return;delete r.players[s.id];if(r.host===s.id)r.host=Object.keys(r.players)[0]||null;if(!Object.keys(r.players).length){stopChalk(r);delete rooms[s.data.code]}else emit(s.data.code)})
});
server.listen(process.env.PORT||8080,()=>console.log('ARDELL 26 V10 cartoon + catch the chalk'));
