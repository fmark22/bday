import {refineModelMaterials} from './modelMaterials.js';
import React,{useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html,useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {findAvatar,GUEST_AVATARS} from '../shared/avatars.js';

function GiftModel({item,head=false}){
 const {scene}=useGLTF(`/models/${item}.glb`);
 const model=useMemo(()=>{refineModelMaterials(scene);const copy=scene.clone(true);copy.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true});return copy},[scene]);
 return <primitive object={model} dispose={null}/>;
}
export default function Person({p,phase,clapping,outfit={}}){
 const hero=p.role==='hero',look=findAvatar(p.avatar)||GUEST_AVATARS[Math.abs(p.slot)%4];
 const type=hero?'king':look.id,{scene}=useGLTF(`/models/${type}.glb`),root=useRef(),progress=useRef(0);
 const rig=useMemo(()=>{
  refineModelMaterials(scene);const model=scene.clone(true);model.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true});
  const arms=['ArmLeft','ArmRight'].map(name=>model.getObjectByName(name));
  const legs=['LegLeft','LegRight'].map(name=>model.getObjectByName(name));
  return {model,arms,legs,head:model.getObjectByName('Head'),crown:model.getObjectByName('Crown')};
 },[scene]);
 const seated=hero&&['seated','celebration'].includes(phase);
 const x=hero?0:p.slot%2===0?-3.25:3.25,z=hero?seated?-8.6:p.z:-5.7+Math.floor(p.slot/2)*1.18;
 useFrame(({clock},dt)=>{
  if(!root.current)return;
  const moving=hero&&!seated&&Math.abs(root.current.position.z-z)>.025;
  root.current.position.z=THREE.MathUtils.damp(root.current.position.z,z,8,dt);
  root.current.position.y=seated?.45:moving?Math.abs(Math.sin(clock.elapsedTime*7))*.022:0;
  rig.arms.forEach((arm,i)=>{if(!arm)return;arm.rotation.x=THREE.MathUtils.damp(arm.rotation.x,clapping?-1.05+Math.sin(clock.elapsedTime*18)*.12:moving?Math.sin(clock.elapsedTime*7+i*Math.PI)*.32:0,12,dt);arm.rotation.z=clapping?(i===0?-.42:.42):i===0?.12:-.12});
  rig.legs.forEach((leg,i)=>{if(!leg)return;leg.rotation.x=THREE.MathUtils.damp(leg.rotation.x,seated?-Math.PI/2:moving?Math.sin(clock.elapsedTime*7+i*Math.PI)*.42:0,12,dt);const knee=leg.getObjectByName('Knee');if(knee)knee.rotation.x=seated?Math.PI/2:0});
  if(rig.head)rig.head.rotation.z=Math.sin(clock.elapsedTime*.7+x)*.012;
  if(phase!=='celebration')progress.current=0;
  if(rig.crown){rig.crown.visible=phase==='celebration';progress.current=Math.min(1,progress.current+dt*.8);rig.crown.position.y=2.06+Math.pow(1-progress.current,3)*1.5;}
 });
 return <group ref={root} position={[x,0,z]} rotation={[0,hero?(phase==='walking'?Math.PI:0):x<0?Math.PI/2:-Math.PI/2,0]} scale={hero?[1.12,1.08,1.12]:[look.width*.95,look.height,look.width*.95]}>
  <primitive object={rig.model} dispose={null}/>
  {hero&&Object.values(outfit).map(item=>['flowers','ribbon','cape','glasses'].includes(item)&&<group key={item} position={item==='glasses'?[0,1.76,0]:[0,0,0]}><GiftModel item={item}/></group>)}
  {p.name&&<Html position={[0,2.5,0]} center distanceFactor={15} style={{pointerEvents:"none"}}><span className="character-name">{p.name}</span></Html>}
 </group>;
}
for(const id of ['king','steward','scholar','guard','bard','flowers','ribbon','cape','glasses'])useGLTF.preload(`/models/${id}.glb`);
