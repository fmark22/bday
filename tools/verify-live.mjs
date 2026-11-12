import {io} from 'socket.io-client';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const supplied=process.argv[2];
if(!supplied)throw Error('Usage: npm run test:live -- https://your-project.vercel.app');
const url=new URL(supplied);if(url.protocol!=='https:')throw Error('Use the deployed HTTPS address');
const origin=url.origin,roomId='verify-'+randomUUID().slice(0,20),clients=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function connect(){return new Promise((resolve,reject)=>{const socket=io(origin,{path:'/api/socket-io/socket.io',transports:['websocket'],forceNew:true,reconnection:false,timeout:12000,extraHeaders:{Origin:origin}});clients.push(socket);socket.once('connect',()=>resolve(socket));socket.once('connect_error',reject)})}
function send(socket,event,payload={}){return new Promise((resolve,reject)=>socket.timeout(12000).emit(event,payload,(err,res)=>err?reject(err):res?.error?reject(Error(res.error)):resolve(res)))}
function state(socket,predicate){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.off('state',onState);reject(Error('Shared state timed out'))},12000);function onState(value){if(predicate(value)){clearTimeout(timer);socket.off('state',onState);resolve(value)}}socket.on('state',onState)})}
try{
 const health=await fetch(origin+'/api/socket-io/health',{signal:AbortSignal.timeout(15000)});assert.equal(health.status,200,'Health endpoint must be public');assert.equal((await health.json()).storage,'redis');
 const guest=await connect(),hero=await connect();const g=await send(guest,'join',{roomId,gift:'cape'}),h=await send(hero,'join',{roomId,role:'hero'});
 const present=state(hero,s=>s.outfit.back==='cape');await send(guest,'giveGift');await present;
 const message=state(hero,s=>s.messages.some(m=>m.text==='자동 배포 검증 중입니다.'));await send(guest,'chat',{text:'자동 배포 검증 중입니다.'});await message;
 const start=state(guest,s=>s.phase==='walking');await send(hero,'start');await start;
 for(let z=9.3;z> -7;z-=.7){await pause(180);await send(hero,'move',{z})}
 const seated=state(guest,s=>s.phase==='seated');await send(hero,'sit');await seated;
 const crowned=state(guest,s=>s.phase==='celebration');await send(hero,'crown');await crowned;
 hero.disconnect();await pause(250);const renewed=await connect();const restored=await send(renewed,'join',{roomId,sessionToken:h.sessionToken});assert.equal(restored.id,h.id);assert.equal(restored.state.outfit.back,'cape');assert.equal(restored.state.phase,'celebration');
 console.log(`PASS: ${origin} — Redis health, two simultaneous clients, chat, gift, movement, seating, crown and reconnect recovery. Test room: ${roomId}`);
}finally{clients.forEach(socket=>socket.disconnect())}
