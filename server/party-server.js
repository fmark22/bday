import express from 'express';
import {createServer} from 'node:http';
import {configuredStore} from './room-store.js';
import {Server} from 'socket.io';
import {command,roomCode} from './party-engine.js';

export async function createPartyServer({store,env=process.env}={}){
 store??=await configuredStore(env);
 const origins=(env.CLIENT_ORIGIN||'').split(',').map(value=>value.trim().replace(/\/$/,'')).filter(Boolean);
 if(env.NODE_ENV==='production'&&env.VERCEL!=='1'&&!origins.length){await store.close();throw Error('CLIENT_ORIGIN must contain the deployed frontend origin')}
 const app=express(),http=createServer(app);
 const normalize=req=>{if(req.url?.startsWith('/api/socket-io/socket.io'))req.url=req.url.replace('/api/socket-io','')};
 http.prependListener('request',normalize);http.prependListener('upgrade',normalize);
 const io=new Server(http,{transports:['websocket'],maxHttpBufferSize:16384,
  cors:{origin:origins.length?origins:true},
  allowRequest:(req,done)=>{
   const origin=req.headers.origin;
   if(!origin)return done(null,true);
   let sameOrigin=false;
   try{sameOrigin=new URL(origin).host===(req.headers['x-forwarded-host']||req.headers.host)}catch{}
   done(null,sameOrigin||origins.includes(origin)||(!origins.length&&env.NODE_ENV!=='production'));
  },
 });
 const unsubscribe=store.subscribe(packet=>{
  io.to(packet.roomId).emit('state',packet.state);
  for(const effect of packet.effects||[])io.to(packet.roomId).emit(effect.event,effect.data);
 });
 io.on('connection',socket=>{
  // Each socket is serialized as well as each shared room transaction.
  let queue=Promise.resolve();
  const handle=(event,payload,reply)=>{
   queue=queue.then(async()=>{
    const joining=event==='join',id=joining?roomCode(payload?.roomId):socket.data.roomId;
    if(!id){if(typeof reply==='function')reply({error:'유효하지 않은 방 코드'});return}
    const result=await store.transact(id,room=>command(room,event,payload,{roomId:id,playerId:socket.data.playerId,connectionId:socket.id,alreadyJoined:joining&&!!socket.data.roomId}));
    if(joining&&result.reply.ok){socket.data.roomId=id;socket.data.playerId=result.playerId;await socket.join(id)}
    if(typeof reply==='function')reply({...result.reply,...(joining&&result.snapshot?{state:result.snapshot}: {})});
    if(result.commit&&event!=='disconnect')socket.emit('state',result.snapshot);
   }).catch(()=>{if(typeof reply==='function')reply({error:'파티 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'});console.error('Party command failed:',event)});
  };
  for(const event of ['join','claimHero','giveGift','toggleGift','move','start','sit','crown','clap','chat','reset','heartbeat'])socket.on(event,(payload,reply)=>handle(event,payload,reply));
  socket.on('disconnect',()=>{if(socket.data.roomId)handle('disconnect',{})});
 });
 app.get(['/health','/api/socket-io/health','/api/socket-io'],async(_req,res)=>{try{await store.ping();res.json({ok:true,storage:store.kind})}catch{res.status(503).json({ok:false})}});
 async function close(){unsubscribe();await new Promise(resolve=>io.close(resolve));await store.close()}
 return {http,io,store,close};
}
