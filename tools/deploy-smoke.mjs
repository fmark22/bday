import {createPartyServer} from '../server/party-server.js';
import {MemoryRoomStore,RedisRoomStore} from '../server/room-store.js';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {io} from 'socket.io-client';

const namespace='bday:integration:'+randomUUID(),origin='https://birthday-frontend.example.com',clients=[],servers=[];
const redis=process.env.TEST_REDIS_URL;
const shared=new MemoryRoomStore();
function connect(url,from=origin,path='/socket.io'){return new Promise((resolve,reject)=>{const socket=io(url,{path,transports:['websocket'],forceNew:true,reconnection:false,timeout:2500,extraHeaders:{Origin:from}});clients.push(socket);socket.once('connect',()=>resolve(socket));socket.once('connect_error',reject)})}
function send(socket,event,payload={}){return new Promise((resolve,reject)=>socket.timeout(5000).emit(event,payload,(err,res)=>err?reject(err):resolve(res)))}
function waitState(socket,predicate){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.off('state',onState);reject(Error('State synchronization timed out'))},5000);function onState(state){if(predicate(state)){clearTimeout(timer);socket.off('state',onState);resolve(state)}}socket.on('state',onState)})}
try{
 for(let i=0;i<2;i++){
  const store=redis?await new RedisRoomStore(redis,{namespace}).ready():shared;
  const party=await createPartyServer({store,env:{NODE_ENV:'production',CLIENT_ORIGIN:origin}});servers.push(party);await new Promise(resolve=>party.http.listen(0,'127.0.0.1',resolve));
 }
 const urls=servers.map(p=>`http://127.0.0.1:${p.http.address().port}`);
 assert.equal((await (await fetch(urls[0]+'/health')).json()).ok,true);
 const guest=await connect(urls[0]),hero=await connect(urls[1],origin,'/api/socket-io/socket.io');
 const g=await send(guest,'join',{roomId:'smoke',gift:'cape'});assert.equal(g.ok,true);const h=await send(hero,'join',{roomId:'smoke',role:'hero'});assert.equal(h.ok,true);
 const delivery=waitState(hero,s=>s.outfit.back==='cape');assert.equal((await send(guest,'giveGift')).ok,true);assert.equal((await delivery).players.length,2);
 const chat=waitState(hero,s=>s.messages.some(m=>m.text==='cross-instance hello'));assert.equal((await send(guest,'chat',{text:'cross-instance hello'})).ok,true);await chat;
 const started=waitState(guest,s=>s.phase==='walking');assert.equal((await send(hero,'start')).ok,true);await started;
 const moved=waitState(guest,s=>s.players.find(p=>p.id===h.id)?.z===9.3);await send(hero,'move',{z:9.3});await moved;
 await new Promise(resolve=>{hero.once('disconnect',resolve);hero.disconnect()});await new Promise(resolve=>setTimeout(resolve,100));
 const reconnected=await connect(urls[0]);const resumed=await send(reconnected,'join',{roomId:'smoke',sessionToken:h.sessionToken});assert.equal(resumed.id,h.id);assert.equal(resumed.state.phase,'walking');assert.equal(resumed.state.outfit.back,'cape');
 await assert.rejects(()=>connect(urls[0],'https://not-allowed.example.com'));
 const r1=await connect(urls[0]),r2=await connect(urls[1]);const race=await Promise.all([send(r1,'join',{roomId:'race',role:'hero'}),send(r2,'join',{roomId:'race',role:'hero'})]);assert.equal(race.filter(r=>r.ok).length,1);
 console.log(`PASS: ${redis?'two independent Redis-backed instances':'two HTTP servers sharing a memory store'}: health, WebSocket routing, cross-instance gifts/chat/movement, reconnect identity, origin restrictions, atomic hero race.`);
}finally{
 clients.forEach(s=>s.disconnect());await new Promise(resolve=>setTimeout(resolve,150));
 if(redis){const keys=await servers[0]?.store.client.keys(namespace+':*');if(keys?.length)await servers[0].store.client.del(...keys)}
 for(const party of servers)await party.close();
}
