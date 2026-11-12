import {drawGuestAvatar,GUEST_AVATARS,findAvatar} from '../shared/avatars.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {findGift} from '../shared/gifts.js';
let onConnection;const snapshots=[],events=[],rooms=new Map();
const io={on(event,handler){onConnection=handler},to(room){return {emit(event,payload){events.push({room,event,payload});if(event==='state')snapshots.push({room,payload})}}}};
let source=readFileSync(new URL('./index.js',import.meta.url),'utf8');source=source.slice(source.indexOf('const MAX_GUESTS'),source.indexOf("app.get('/health'"));
vm.runInNewContext(source,{io,rooms,findGift,drawGuestAvatar,findAvatar,Date,console});
function client(id){const handlers={};const socket={id,data:{},on(event,handler){handlers[event]=handler},join(){}};onConnection(socket);return {send(event,payload={}){let reply;handlers[event](payload,res=>reply=res);return reply}}}
const guest=client('guest'),hero=client('hero'),other=client('other');
assert.ok(guest.send('join',{roomId:'party',name:'Guest',role:'guest',gift:'invalid'}).error);
assert.equal(guest.send('join',{roomId:'party',name:'Guest',role:'guest',gift:'flowers'}).ok,true);
assert.ok(guest.send('giveGift').error,'Cannot gift before hero arrives');
assert.equal(hero.send('join',{roomId:'party',name:'Hero',role:'hero'}).ok,true);
assert.ok(guest.send('claimHero').error,'Cannot steal existing hero role');
assert.ok(hero.send('giveGift').error,'Hero cannot give gifts');
assert.equal(guest.send('giveGift').ok,true);assert.equal(rooms.get('party').outfit.hand,'flowers');
assert.equal(rooms.get('party').gifts.length,1);assert.ok(guest.send('giveGift').error,'One delivery per guest');
assert.ok(guest.send('toggleGift',{item:'flowers'}).error,'Guests cannot change wardrobe');
assert.ok(hero.send('toggleGift',{item:'cape'}).error,'Unreceived items cannot be equipped');
assert.equal(hero.send('toggleGift',{item:'flowers'}).ok,true);assert.equal(rooms.get('party').outfit.hand,undefined);
assert.equal(hero.send('toggleGift',{item:'flowers'}).ok,true);assert.equal(rooms.get('party').outfit.hand,'flowers');
assert.equal(other.send('join',{roomId:'elsewhere',name:'Other',role:'guest',gift:'cape'}).ok,true);
assert.equal(Object.keys(rooms.get('elsewhere').outfit).length,0,'Wardrobe is room scoped');
assert.equal(other.send('claimHero').ok,true,'Guest can claim vacant hero role');
assert.equal(rooms.get('elsewhere').players.get('other').role,'hero');
assert.equal(rooms.get('party').players.get('hero').name,'오늘의 왕');
assert.equal(rooms.get('elsewhere').players.get('other').name,'오늘의 왕','Hero conversion updates name');
hero.send('reset');assert.equal(rooms.get('party').outfit.hand,'flowers','Replay keeps received gifts');
const newcomer=client('new');assert.equal(newcomer.send('join',{roomId:'party',name:'New',gift:'ribbon'}).ok,true);
assert.equal(snapshots.at(-1).payload.outfit.hand,'flowers','Late join receives wardrobe');
assert.ok(newcomer.send('join',{roomId:'elsewhere',gift:'ribbon'}).error,'A socket cannot join twice');
console.log('PASS: selection validation, guest-first, delivery, duplicate prevention, wardrobe permissions, room isolation, hero claim, replay and late-join state.');

const avatarRoom={};let previous;
for(let batch=0;batch<50;batch++){
 const drawn=Array.from({length:4},()=>drawGuestAvatar(avatarRoom));
 assert.equal(new Set(drawn).size,4,'Every shuffled group has four unique characters');
 assert.notEqual(drawn[0],previous,'Adjacent batches do not repeat a character');
 drawn.forEach(id=>assert.ok(GUEST_AVATARS.some(a=>a.id===id)));
 previous=drawn.at(-1);
}
const guestAvatar=rooms.get('party').players.get('guest').avatar;
assert.ok(GUEST_AVATARS.some(a=>a.id===guestAvatar));
assert.equal(rooms.get('party').players.get('hero').avatar,'king');
assert.equal(rooms.get('elsewhere').players.get('other').avatar,'king','Claiming hero replaces guest appearance');
assert.equal(snapshots.at(-1).payload.players.find(p=>p.id==='guest').avatar,guestAvatar,'Broadcast carries assigned appearance');
const partyAvatars=[];
for(let i=0;i<4;i++){
 const c=client('avatar-'+i);assert.equal(c.send('join',{roomId:'avatars',name:'Guest',gift:'flowers',avatar:'king'}).ok,true);
 partyAvatars.push(rooms.get('avatars').players.get('avatar-'+i).avatar);
}
assert.equal(new Set(partyAvatars).size,4,'Joining guests receive one of each per shuffled group');
assert.ok(!partyAvatars.includes('king'),'Client cannot choose an unauthorized appearance');
console.log('PASS: shuffled avatar groups, batch boundary, server allocation, broadcast identity and hero conversion.');

for(const room of rooms.values())for(const player of room.players.values()){assert.equal(player.name,player.role==='hero'?'오늘의 왕':findAvatar(player.avatar).name,'Server chooses the character name, ignoring supplied nickname');}
console.log('PASS: automatic character names, exact role labels and hero conversion.');
