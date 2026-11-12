import assert from 'node:assert/strict';
import {command,publicState,LEASE_MS} from './party-engine.js';
import {MemoryRoomStore} from './room-store.js';
import {findAvatar,GUEST_AVATARS,drawGuestAvatar} from '../shared/avatars.js';
const store=new MemoryRoomStore();let now=100000;
const contexts=new Map();
async function send(connectionId,event,payload={},roomId='party'){
 const context=contexts.get(connectionId)||{connectionId,roomId};context.now=now;now+=20;
 const result=await store.transact(roomId,room=>command(room,event,payload,context));
 if(event==='join'&&result.reply.ok){context.playerId=result.playerId;context.alreadyJoined=true;contexts.set(connectionId,context)}
 return result;
}
assert.ok((await send('guest','join',{gift:'invalid'})).reply.error);
const guest=await send('guest','join',{gift:'flowers',avatar:'king',name:'Custom'});assert.equal(guest.reply.ok,true);
assert.equal(guest.snapshot.players[0].name,findAvatar(guest.snapshot.players[0].avatar).name);
assert.ok((await send('guest','giveGift')).reply.error);
const hero=await send('hero','join',{role:'hero'});assert.equal(hero.reply.ok,true);
assert.ok((await send('second-hero','join',{role:'hero'})).reply.error);
assert.ok((await send('guest','claimHero')).reply.error);
assert.ok((await send('hero','giveGift')).reply.error);
assert.equal((await send('guest','giveGift')).reply.ok,true);
assert.ok((await send('guest','giveGift')).reply.error);
assert.ok((await send('guest','toggleGift',{item:'flowers'})).reply.error);
assert.ok((await send('hero','toggleGift',{item:'cape'})).reply.error);
assert.equal((await send('hero','toggleGift',{item:'flowers'})).snapshot.outfit.hand,undefined);
assert.equal((await send('hero','toggleGift',{item:'flowers'})).snapshot.outfit.hand,'flowers');
assert.equal((await send('hero','start')).snapshot.phase,'walking');
assert.ok((await send('hero','move',{z:-7})).reply.error,'Teleport rejected');
for(let z=9.3;z>=-7;z-=.7){now+=250;await send('hero','move',{z})}
assert.equal((await send('hero','sit')).snapshot.phase,'seated');
assert.equal((await send('hero','crown')).snapshot.phase,'celebration');
assert.equal((await send('hero','reset')).snapshot.outfit.hand,'flowers');
await send('guest','disconnect');
const resumed=await send('new-connection','join',{sessionToken:guest.reply.sessionToken});
assert.equal(resumed.reply.id,guest.reply.id);assert.equal(resumed.snapshot.players.find(p=>p.id===guest.reply.id).giftGiven,true);
assert.ok((await send('guest','chat',{text:'stale connection'})).reply.error);
const json=JSON.stringify(resumed.snapshot);assert.ok(!json.includes(guest.reply.sessionToken),'Session token is private');assert.ok(!json.includes('connectionId'));
assert.ok((await send('new-connection','join',{gift:'ribbon'})).reply.error);
const other=await send('other','join',{gift:'cape'},'elsewhere');assert.equal(Object.keys(other.snapshot.outfit).length,0);
assert.equal((await send('other','claimHero',{},'elsewhere')).snapshot.players[0].name,'오늘의 왕');
const others=await Promise.all(Array.from({length:4},(_,i)=>send('avatar-'+i,'join',{gift:'ribbon'},'avatars')));
assert.equal(new Set(others.map(r=>r.snapshot.players.find(p=>p.id===r.reply.id).avatar)).size,4);
const race=await Promise.all(Array.from({length:8},(_,i)=>send('race-'+i,'join',{role:'hero'},'race')));
assert.equal(race.filter(r=>r.reply.ok).length,1,'Only one hero wins a concurrent join');
let previous;const bag={};for(let i=0;i<50;i++){const drawn=Array.from({length:4},()=>drawGuestAvatar(bag));assert.equal(new Set(drawn).size,4);assert.notEqual(drawn[0],previous);previous=drawn.at(-1)}
now+=LEASE_MS+1;const fresh=await send('fresh','join',{gift:'flowers'});assert.equal(fresh.snapshot.players.length,1);assert.equal(fresh.snapshot.gifts.length,0);
await store.close();console.log('PASS: room commands, concurrent hero allocation, gifts, avatar names, private sessions, reconnect, stale connections, movement checks, room isolation and lease expiry.');
