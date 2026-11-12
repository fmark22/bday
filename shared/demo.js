import {GUEST_AVATARS} from './avatars.js';
import {GIFTS,findGift} from './gifts.js';
export function demoState(){return {phase:'waiting',players:[{id:'demo-hero',name:'오늘의 왕',avatar:'king',role:'hero',slot:-1,z:10},...GUEST_AVATARS.map((avatar,slot)=>({id:'demo-'+slot,name:avatar.name,avatar:avatar.id,role:'guest',slot,z:10,gift:GIFTS[slot].id,giftGiven:false}))],outfit:{},gifts:[]}}
export function demoTransition(state,event,payload={}){
 if(event==='start'&&state.phase==='waiting')return {...state,phase:'walking'};
 if(event==='move'&&state.phase==='walking'&&Number.isFinite(payload.z))return {...state,players:state.players.map(p=>p.role==='hero'?{...p,z:Math.max(-7,Math.min(10,payload.z))}:p)};
 if(event==='sit'&&state.phase==='walking'&&state.players[0].z<=-6.2)return {...state,phase:'seated'};
 if(event==='crown'&&state.phase==='seated')return {...state,phase:'celebration'};
 if(event==='reset')return {...state,phase:'waiting',players:state.players.map(p=>({...p,z:10}))};
 if(event==='demoGifts')return {...state,outfit:Object.fromEntries(GIFTS.map(g=>[g.slot,g.id])),gifts:GIFTS.map((g,i)=>({id:'demo-gift-'+i,item:g.id,from:GUEST_AVATARS[i].name})),players:state.players.map(p=>p.role==='guest'?{...p,giftGiven:true}:p)};
 if(event==='toggleGift'){const gift=findGift(payload.item);if(!gift||!state.gifts.some(g=>g.item===gift.id))return state;const outfit={...state.outfit};if(outfit[gift.slot]===gift.id)delete outfit[gift.slot];else outfit[gift.slot]=gift.id;return {...state,outfit}}
 return state;
}
