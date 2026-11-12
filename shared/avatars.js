export const GUEST_AVATARS=[
 {id:'steward',name:'왕실 집사',color:'#475337',hair:'#645044',skin:'#dfb192',width:1.13,height:.96},
 {id:'scholar',name:'궁정 학자',color:'#714958',hair:'#77716b',skin:'#e1baa1',width:.94,height:1.04},
 {id:'guard',name:'근위병',color:'#3c4a60',hair:'#816348',skin:'#cfa185',width:1.2,height:1.08},
 {id:'bard',name:'음유시인',color:'#a16b45',hair:'#754a32',skin:'#dbb198',width:1,height:1},
];
export const findAvatar=id=>GUEST_AVATARS.find(avatar=>avatar.id===id);
export function drawGuestAvatar(room,random=Math.random){
 if(!room.avatarBag?.length){
  room.avatarBag=GUEST_AVATARS.map(avatar=>avatar.id);
  for(let i=room.avatarBag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[room.avatarBag[i],room.avatarBag[j]]=[room.avatarBag[j],room.avatarBag[i]];}
  // Also avoid identical guests on the boundary between two shuffled groups.
  if(room.avatarBag[0]===room.lastAvatar)[room.avatarBag[0],room.avatarBag[1]]=[room.avatarBag[1],room.avatarBag[0]];
 }
 const avatar=room.avatarBag.shift();room.lastAvatar=avatar;return avatar;
}
