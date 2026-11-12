import {drawGuestAvatar,findAvatar} from '../shared/avatars.js';
import {findGift} from '../shared/gifts.js';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
const origins=(process.env.CLIENT_ORIGIN||'').split(',').map(value=>value.trim().replace(/\/$/,'')).filter(Boolean);
if(process.env.NODE_ENV==='production'&&!origins.length)throw Error('CLIENT_ORIGIN must contain the deployed frontend origin');
const app=express(); const http=createServer(app); const io=new Server(http,{
 cors:{origin:origins.length?origins:true},
 allowRequest:(req,done)=>done(null,!origins.length||!req.headers.origin||origins.includes(req.headers.origin)),
});
const rooms=new Map();
const MAX_GUESTS=29;
const clean=(s,max=30)=>String(s??'').trim().slice(0,max);
function broadcast(room){io.to(room.id).emit('state',{phase:room.phase,players:[...room.players.values()].map(p=>({id:p.id,name:p.name,role:p.role,avatar:p.avatar,slot:p.slot,z:p.z,claps:p.claps,gift:p.gift,giftGiven:p.giftGiven})),outfit:room.outfit, gifts:room.gifts,hostId:room.hostId});}
io.on('connection',socket=>{
 socket.on('join',({roomId,role,gift}={},reply)=>{
  if(typeof reply!=='function')return;
  roomId=clean(roomId,32).replace(/[^a-zA-Z0-9_-]/g,'');
  if(!roomId)return reply?.({error:'유효하지 않은 방 코드'});
  if(socket.data.roomId)return reply({error:'이미 입장했어요. 새로고침 후 다시 시도해 주세요.'});
  if(role!=='hero'&&!findGift(gift))return reply({error:'가져갈 선물을 골라 주세요.'});
  let room=rooms.get(roomId);
  if(!room){room={id:roomId,phase:'waiting',players:new Map(),hostId:null,messages:[],outfit:{},gifts:[],createdAt:Date.now()};rooms.set(roomId,room);}
  const hero=[...room.players.values()].some(p=>p.role==='hero');
  if(role==='hero'&&hero)return reply({error:'이미 주인공이 입장했습니다.'});
  if(room.players.size>=MAX_GUESTS+1||(role!=='hero'&&[...room.players.values()].filter(p=>p.role==='guest').length>=MAX_GUESTS))return reply?.({error:'최대 30명까지 참여할 수 있습니다.'});
  const slot=[...Array(MAX_GUESTS).keys()].find(n=>![...room.players.values()].some(p=>p.slot===n));
  const avatar=role==='hero'?'king':drawGuestAvatar(room);
  const name=role==='hero'?'오늘의 왕':findAvatar(avatar).name;
  const player={id:socket.id,name,role:role==='hero'?'hero':'guest',avatar,slot:role==='hero'?-1:slot,z:10,claps:0,gift:role==='hero'?null:gift,giftGiven:false};
  room.players.set(socket.id,player);if(!room.hostId)room.hostId=socket.id;
  socket.join(roomId);socket.data.roomId=roomId;reply({ok:true,id:socket.id,role:player.role,messages:room.messages});broadcast(room);
 });
 socket.on('claimHero',(_payload,reply)=>{
  const r=rooms.get(socket.data.roomId),p=r?.players.get(socket.id);if(!p||typeof reply!=='function')return;
  if([...r.players.values()].some(player=>player.role==='hero'))return reply({error:'이미 오늘의 주인공이 있어요.'});
  if(r.phase!=='waiting')return reply({error:'대관식이 진행 중이에요.'});
  p.role='hero';p.avatar='king';p.name='오늘의 왕';p.slot=-1;p.z=10;p.gift=null;p.giftGiven=false;reply({ok:true});broadcast(r);
 });
 socket.on('giveGift',(_payload,reply)=>{
  const r=rooms.get(socket.data.roomId),p=r?.players.get(socket.id);if(typeof reply!=='function')return;
  if(!p||p.role!=='guest')return reply({error:'하객만 선물을 건넬 수 있어요.'});
  if(p.giftGiven)return reply({error:'이미 선물을 건넸어요.'});
  const item=findGift(p.gift);if(!item)return reply({error:'선물을 먼저 골라 주세요.'});
  if(![...r.players.values()].some(player=>player.role==='hero'))return reply({error:'주인공이 오면 건넬 수 있어요.'});
  p.giftGiven=true;r.outfit[item.slot]=item.id;
  r.gifts.push({id:socket.id,item:item.id,from:p.name});r.gifts=r.gifts.slice(-60);
  const msg={id:'gift-'+socket.id+'-'+Date.now(),name:'선물 도착',text:p.name+' 님이 '+item.name+'을 건넸어요.',system:true,at:Date.now()};
  r.messages.push(msg);r.messages=r.messages.slice(-50);io.to(r.id).emit('chat',msg);reply({ok:true});broadcast(r);
 });
 socket.on('toggleGift',({item}={},reply)=>{
  const r=rooms.get(socket.data.roomId),p=r?.players.get(socket.id),gift=findGift(item);if(typeof reply!=='function')return;
  if(p?.role!=='hero'||!gift||!r.gifts.some(g=>g.item===item))return reply({error:'받은 선물만 착용할 수 있어요.'});
  if(r.outfit[gift.slot]===item)delete r.outfit[gift.slot];else r.outfit[gift.slot]=item;
  reply({ok:true});broadcast(r);
 });
 socket.on('move',({z}={})=>{const r=rooms.get(socket.data.roomId),p=r?.players.get(socket.id);if(!p||p.role!=='hero'||r.phase!=='walking'||!Number.isFinite(z))return;p.z=Math.max(-7,Math.min(10,z));broadcast(r);});
 socket.on('start',()=>{const r=rooms.get(socket.data.roomId);if(r&&r.players.get(socket.id)?.role==='hero'&&r.phase==='waiting'){r.phase='walking';broadcast(r);}});
 socket.on('sit',()=>{const r=rooms.get(socket.data.roomId),p=r?.players.get(socket.id);if(p?.role==='hero'&&r.phase==='walking'&&p.z<=-6.2){r.phase='seated';broadcast(r);}});
 socket.on('crown',()=>{const r=rooms.get(socket.data.roomId),p=r?.players.get(socket.id);if(p?.role==='hero'&&r.phase==='seated'){r.phase='celebration';r.celebratedAt=Date.now();broadcast(r);io.to(r.id).emit('celebrate',{at:r.celebratedAt});const msg={id:`system-${Date.now()}`,name:'왕실 안내',text:'👑 대관식이 완료되었습니다! 생일 축하합니다! 🎉',system:true,at:Date.now()};r.messages.push(msg);r.messages=r.messages.slice(-50);io.to(r.id).emit('chat',msg);}});
 socket.on('clap',()=>{const r=rooms.get(socket.data.roomId),p=r?.players.get(socket.id);if(p?.role!=='guest'||r.phase==='waiting')return;const now=Date.now();if(now-(p.lastClap||0)<250)return;p.lastClap=now;p.claps++;io.to(r.id).emit('clap',{id:p.id});broadcast(r);});
 socket.on('chat',({text:raw}={})=>{const r=rooms.get(socket.data.roomId),p=r?.players.get(socket.id);if(!p)return;const now=Date.now();if(now-(p.lastMessage||0)<650)return;const message=clean(raw,200).replace(/[\u0000-\u001f\u007f]/g,' ');if(!message)return;p.lastMessage=now;const msg={id:`${socket.id}-${now}`,name:p.name,text:message,system:false,at:now};r.messages.push(msg);r.messages=r.messages.slice(-50);io.to(r.id).emit('chat',msg);});
 socket.on('reset',()=>{const r=rooms.get(socket.data.roomId);if(r?.players.get(socket.id)?.role!=='hero')return;r.phase='waiting';r.celebratedAt=null;for(const p of r.players.values()){p.z=10;p.claps=0;}io.to(r.id).emit('reset');broadcast(r);});
 socket.on('disconnect',()=>{const r=rooms.get(socket.data.roomId);if(!r)return;r.players.delete(socket.id);if(r.hostId===socket.id)r.hostId=r.players.keys().next().value||null;if(!r.players.size)rooms.delete(r.id);else broadcast(r);});
});
app.get('/health',(_req,res)=>res.json({ok:true}));http.listen(process.env.PORT||3001,'0.0.0.0',()=>console.log('Birthday Highness server ready'));
const shutdown=()=>io.close(()=>http.close(()=>process.exit(0)));process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
