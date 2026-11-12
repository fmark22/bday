import {randomUUID,randomBytes} from 'node:crypto';
import {drawGuestAvatar,findAvatar} from '../shared/avatars.js';
import {findGift} from '../shared/gifts.js';

export const LEASE_MS=75000;
const clean=(value,max=200)=>String(value??'').trim().slice(0,max);
export function roomCode(value){return clean(value,32).replace(/[^a-zA-Z0-9_-]/g,'')}
export function publicState(room,now=Date.now()){
 return {epoch:room.epoch,version:room.version,phase:room.phase,
  players:Object.values(room.players).filter(p=>p.connected&&p.leaseUntil>now).map(p=>({id:p.id,name:p.name,role:p.role,avatar:p.avatar,slot:p.slot,z:p.z,claps:p.claps,gift:p.gift,giftGiven:p.giftGiven})),
  outfit:room.outfit,gifts:room.gifts,messages:room.messages,hostId:room.hostId};
}
function createRoom(id){return {id,epoch:randomUUID(),version:0,phase:'waiting',players:{},hostId:null,messages:[],outfit:{},gifts:[]}}

export function command(current,event,payload,context){
 const now=context.now??Date.now(),data=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload:{};
 let room=current;const effects=[];
 const reject=error=>({commit:false,reply:{error}});
 if(room)for(const [id,p] of Object.entries(room.players))if(p.leaseUntil<=now)delete room.players[id];
 if(event==='join'){
  if(context.alreadyJoined)return reject('이미 입장했어요.');
  const existing=room&&Object.values(room.players).find(p=>p.sessionToken===data.sessionToken&&typeof data.sessionToken==='string');
  if(existing){
   existing.connectionId=context.connectionId;existing.connected=true;existing.leaseUntil=now+LEASE_MS;
   return commit(existing,{ok:true,id:existing.id,role:existing.role,sessionToken:existing.sessionToken,messages:room.messages});
  }
  if(data.role!=='hero'&&!findGift(data.gift))return reject('가져갈 선물을 골라 주세요.');
  if(!room||!Object.keys(room.players).length)room=createRoom(context.roomId);
  const players=Object.values(room.players),hero=data.role==='hero';
  if(hero&&players.some(p=>p.role==='hero'))return reject('이미 주인공이 입장했습니다.');
  if(players.length>=30||!hero&&players.filter(p=>p.role==='guest').length>=29)return reject('최대 30명까지 참여할 수 있습니다.');
  const avatar=hero?'king':drawGuestAvatar(room),id=randomUUID();
  const slot=hero?-1:Array.from({length:29},(_,n)=>n).find(n=>!players.some(p=>p.slot===n));
  const player={id,name:hero?'오늘의 왕':findAvatar(avatar).name,role:hero?'hero':'guest',avatar,slot,z:10,claps:0,gift:hero?null:data.gift,giftGiven:false,
   sessionToken:randomBytes(32).toString('hex'),connectionId:context.connectionId,connected:true,leaseUntil:now+LEASE_MS};
  room.players[id]=player;if(!room.hostId)room.hostId=id;
  return commit(player,{ok:true,id,role:player.role,sessionToken:player.sessionToken,messages:room.messages});
 }
 const player=room?.players[context.playerId];
 if(!player||player.connectionId!==context.connectionId)return reject('연결이 변경되었어요. 다시 입장해 주세요.');
 if(event==='disconnect'){player.connected=false;player.leaseUntil=now+60000;return commit(player)}
 if(!player.connected)return reject('다시 연결 중이에요.');
 player.leaseUntil=now+LEASE_MS;
 if(event==='heartbeat')return commit(player);
 if(event==='claimHero'){
  if(Object.values(room.players).some(p=>p.role==='hero'))return reject('이미 오늘의 주인공이 있어요.');
  if(room.phase!=='waiting')return reject('대관식이 진행 중이에요.');
  Object.assign(player,{role:'hero',avatar:'king',name:'오늘의 왕',slot:-1,z:10,gift:null,giftGiven:false});
 }else if(event==='giveGift'){
  if(player.role!=='guest')return reject('하객만 선물을 건넬 수 있어요.');
  if(player.giftGiven)return reject('이미 선물을 건넸어요.');
  const gift=findGift(player.gift);if(!gift)return reject('선물을 먼저 골라 주세요.');
  if(!Object.values(room.players).some(p=>p.role==='hero'&&p.connected))return reject('주인공이 오면 건넬 수 있어요.');
  player.giftGiven=true;room.outfit[gift.slot]=gift.id;
  room.gifts.push({id:player.id,item:gift.id,from:player.name});room.gifts=room.gifts.slice(-60);
  message('선물 도착',`${player.name} 님이 ${gift.name}을 건넸어요.`,true);
 }else if(event==='toggleGift'){
  const gift=findGift(data.item);
  if(player.role!=='hero'||!gift||!room.gifts.some(g=>g.item===gift.id))return reject('받은 선물만 착용할 수 있어요.');
  if(room.outfit[gift.slot]===gift.id)delete room.outfit[gift.slot];else room.outfit[gift.slot]=gift.id;
 }else if(event==='move'){
  if(player.role!=='hero'||room.phase!=='walking'||!Number.isFinite(data.z))return reject('지금은 이동할 수 없어요.');
  const dt=Math.max(0,Math.min(1,(now-(player.lastMove||now-500))/1000));
  if(Math.abs(data.z-player.z)>Math.max(.8,dt*4.5))return reject('천천히 이동해 주세요.');
  player.z=Math.max(-7,Math.min(10,data.z));player.lastMove=now;
 }else if(event==='start'){
  if(player.role!=='hero'||room.phase!=='waiting')return reject('주인공만 대관식을 시작할 수 있어요.');room.phase='walking';
 }else if(event==='sit'){
  if(player.role!=='hero'||room.phase!=='walking'||player.z> -6.2)return reject('왕좌 앞으로 이동해 주세요.');room.phase='seated';
 }else if(event==='crown'){
  if(player.role!=='hero'||room.phase!=='seated')return reject('왕좌에 앉은 뒤 왕관을 쓸 수 있어요.');
  room.phase='celebration';effects.push({event:'celebrate',data:{at:now}});message('왕실 안내','대관식이 완료되었습니다! 생일 축하합니다!',true);
 }else if(event==='clap'){
  if(player.role!=='guest'||room.phase==='waiting')return reject('대관식이 시작되면 박수를 보낼 수 있어요.');
  if(now-(player.lastClap||0)<250)return reject('잠시 후 다시 박수를 보내 주세요.');
  player.lastClap=now;player.claps++;effects.push({event:'clap',data:{id:player.id}});
 }else if(event==='chat'){
  if(now-(player.lastMessage||0)<650)return reject('메시지를 너무 빨리 보내고 있어요.');
  const text=clean(data.text).replace(/[\u0000-\u001f\u007f]/g,' ');if(!text)return reject('메시지를 입력해 주세요.');
  player.lastMessage=now;message(player.name,text,false);
 }else if(event==='reset'){
  if(player.role!=='hero')return reject('주인공만 다시 시작할 수 있어요.');
  room.phase='waiting';for(const p of Object.values(room.players)){p.z=10;p.claps=0;p.lastMove=0}
  effects.push({event:'reset',data:{}});
 }else return reject('알 수 없는 요청이에요.');
 return commit(player);

 function message(name,text,system){const msg={id:randomUUID(),name,text,system,at:now};room.messages.push(msg);room.messages=room.messages.slice(-50);effects.push({event:'chat',data:msg})}
 function commit(p,reply={ok:true}){
  if(!room.players[room.hostId])room.hostId=Object.keys(room.players)[0]||null;
  return {commit:true,room,reply,playerId:p.id,packet:updated=>({roomId:updated.id,state:publicState(updated,now),effects:effects.map(effect=>({event:effect.event,data:{...effect.data,epoch:updated.epoch,version:updated.version}}))})};
 }
}
