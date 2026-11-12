import {HallDetails,RoyalThrone} from './RoyalArchitecture.jsx';
import Person from './Person.jsx';
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Locally generated surface maps keep the room independent of asset CDNs.
function surface(kind) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'); let seed = 41;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const pixels = ctx.createImageData(512, 512);
  for (let y=0;y<512;y++) for(let x=0;x<512;x++) {
    const noise=(random()-.5)*14;
    const vein=Math.sin(x*.036+Math.sin(y*.019)*3+Math.sin(y*.053)) * Math.sin(y*.011+x*.007);
    const v=kind==='stone'?202+noise-Math.pow(Math.abs(vein),12)*40:kind==='wood'?75+noise+Math.sin(x*.15+Math.sin(y*.014)*2)*12:100+noise+((x+y)%3)*3;
    const i=(y*512+x)*4; pixels.data[i]=v; pixels.data[i+1]=kind==='wood'?v*.69:v*.97;pixels.data[i+2]=kind==='wood'?v*.46:v*.9;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(kind==='stone'?5:2,kind==='stone'?7:8);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  return map;
}
function Box({position, size, color='#c2b9a6', material, ...props}) {
  return <mesh position={position} castShadow receiveShadow {...props}><boxGeometry args={size}/>{material?<primitive object={material} attach="material"/>:<meshStandardMaterial color={color} roughness={.7}/>}</mesh>;
}
function Column({x,z,stone}) {
 return <group position={[x,0,z]}>
  <Box position={[0,.13,0]} size={[1,.26,1]} material={stone}/>
  <mesh position={[0,3.35,0]} castShadow receiveShadow><cylinderGeometry args={[.29,.37,6.2,24]}/><primitive object={stone} attach="material"/></mesh>
  {[.4,6.35].map(y=><mesh key={y} position={[0,y,0]} castShadow><cylinderGeometry args={[.48,.48,.18,24]}/><primitive object={stone} attach="material"/></mesh>)}
  <Box position={[0,6.6,0]} size={[1,.3,1]} material={stone}/>
 </group>;
}
function Window({x,z}) {
 const arch=useMemo(()=>{const s=new THREE.Shape();s.moveTo(-1.05,0);s.lineTo(-1.05,3.6);s.absarc(0,3.6,1.05,Math.PI,0,true);s.lineTo(1.05,0);s.closePath();return s},[]);
 return <group position={[x,1.5,z]} rotation={[0,x<0?Math.PI/2:-Math.PI/2,0]}>
  <mesh><shapeGeometry args={[arch]}/><meshStandardMaterial color="#dce8e5" emissive="#c6d7df" emissiveIntensity={.65} roughness={.35} side={THREE.DoubleSide}/></mesh>
  {[-1.12,1.12].map(v=><Box key={v} position={[v,1.8,.07]} size={[.18,3.8,.25]}/>)}
  <mesh position={[0,3.6,.06]}><torusGeometry args={[1.12,.09,8,32,Math.PI]}/><meshStandardMaterial color="#c2b9a6"/></mesh>
  <Box position={[0,1.8,.1]} size={[.055,3.6,.08]} color="#625b4c"/>
  <Box position={[0,2.9,.1]} size={[2.05,.055,.08]} color="#625b4c"/>
  <Box position={[0,0,.15]} size={[2.5,.18,.45]}/>
 </group>;
}
export default function Palace({players,phase,clapping,onCarpetClick,outfit={}}) {
 const materials=useMemo(()=>{
  const stoneMap=surface('stone'), woodMap=surface('wood'), clothMap=surface('cloth');
  return {stone:new THREE.MeshStandardMaterial({map:stoneMap,roughness:.3,color:'#ded1b7'}),wood:new THREE.MeshStandardMaterial({map:woodMap,roughness:.58}),carpet:new THREE.MeshStandardMaterial({map:clothMap,color:'#6d2d35',roughness:1}),maps:[stoneMap,woodMap,clothMap]};
 },[]);
 useEffect(()=>()=>{materials.maps.forEach(m=>m.dispose());materials.stone.dispose();materials.wood.dispose();materials.carpet.dispose()},[materials]);
 return <>
  <color attach="background" args={['#7a7365']}/><fog attach="fog" args={['#7a7365',30,65]}/>
  <ambientLight intensity={.35}/><hemisphereLight args={['#e7edf0','#776750',1.1]}/>
  <directionalLight position={[-8,10,3]} intensity={2.7} color="#fff1d8" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-normalBias={.035} shadow-bias={-.0002}/>
  <spotLight position={[0,7,-6]} intensity={65} angle={.7} penumbra={1} color="#ffddb1"/>
  <Box position={[0,-.17,0]} size={[20,.3,34]} material={materials.stone}/>
  {Array.from({length:16},(_,i)=><Box key={i} position={[0,-.009,-15+i*2]} size={[19,.008,.016]} color="#a39d8e"/>)}
  {[-8,-6,-4,-2,2,4,6,8].map(x=><Box key={x} position={[x,-.008,0]} size={[.014,.008,32]} color="#aaa494"/>)}
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.018,1.4]} receiveShadow onPointerDown={e=>{e.stopPropagation();onCarpetClick(e.point.z)}}><planeGeometry args={[3.15,21.5]}/><primitive object={materials.carpet} attach="material"/></mesh>
  {[-1,1].map(side=><group key={side}>
   <Box position={[side*1.5,.022,1.4]} size={[.035,.01,21.5]} color="#b09c72"/>
   <Box position={[side*9.6,4,-1]} size={[.4,8,32]} color="#b7b09f"/>
   <Box position={[side*9.32,1,-1]} size={[.12,2,32]} material={materials.wood}/>
   <Box position={[side*9.2,2.05,-1]} size={[.2,.12,32]} material={materials.wood}/>
   <Box position={[side*6.6,6.9,-1]} size={[.8,.35,32]} material={materials.stone}/>
   {Array.from({length:6},(_,i)=><Column key={i} x={side*6.6} z={-11+i*4.4} stone={materials.stone}/>)}
   {Array.from({length:5},(_,i)=><Window key={i} x={side*9.37} z={-9+i*5.2}/>)}
   {Array.from({length:7},(_,i)=><Box key={'panel'+i} position={[side*9.17,1,-13+i*4.5]} size={[.12,1.7,.06]} color="#8d7c63"/>)}
  </group>)}
  <Box position={[0,4,-12.5]} size={[19,8,.4]} color="#b5ae9e"/>
  <Box position={[0,2.8,-12.23]} size={[5.8,5.6,.12]} material={materials.wood}/>
  {[-3.1,3.1].map(x=><Box key={x} position={[x,3,-12.12]} size={[.16,6,.16]} color="#a28c61"/>)}
  {[0,1,2].map(i=><Box key={i} position={[0,.12+i*.16,-8.9-i*.35]} size={[5.6-i*.55,.24+i*.32,3.6-i*.55]} material={materials.stone}/>)}
  <RoyalThrone/>
  <HallDetails/>
  {[-5,3].map(z=><group key={z} position={[0,5.6,z]}><mesh position={[0,1,0]}><cylinderGeometry args={[.025,.025,2,8]}/><meshStandardMaterial color="#574c37" metalness={.7} roughness={.4}/></mesh><mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[1.25,.035,8,48]}/><meshStandardMaterial color="#8b7751" metalness={.7} roughness={.35}/></mesh>{Array.from({length:8},(_,i)=><group key={i} position={[Math.cos(i*Math.PI/4)*1.25,0,Math.sin(i*Math.PI/4)*1.25]}><mesh><cylinderGeometry args={[.045,.05,.26,8]}/><meshStandardMaterial color="#e7dbbd"/></mesh><mesh position={[0,.19,0]}><sphereGeometry args={[.04,8,8]}/><meshStandardMaterial color="#fff0ce" emissive="#ffd6a0" emissiveIntensity={2}/></mesh></group>)}<pointLight intensity={12} distance={9} color="#ffdbad" decay={2}/></group>)}
  {[-1,1].map(side=><group key={'garden'+side}>
   {[-8,1,9].map(z=><group key={z} position={[side*5.1,0,z]}><mesh position={[0,.35,0]} castShadow><cylinderGeometry args={[.34,.24,.7,16]}/><meshStandardMaterial color="#b6a68d" roughness={.9}/></mesh>{[0,1,2].map(i=><mesh key={i} position={[Math.sin(i*3)*.18,.9+i*.24,0]} scale={[.8,1,.8]} castShadow><sphereGeometry args={[.42,16,12]}/><meshStandardMaterial color={i%2?'#829074':'#697e63'} roughness={.95}/></mesh>)}</group>)}
   {[-5,5].map(z=><group key={z} position={[side*2.05,0,z]}><mesh position={[0,.28,0]}><cylinderGeometry args={[.09,.1,.56,12]}/><meshStandardMaterial color="#f3e7cd"/></mesh><pointLight position={[0,.64,0]} intensity={1.5} distance={2} color="#ffdbab"/><mesh position={[0,.6,0]}><sphereGeometry args={[.045,8,8]}/><meshStandardMaterial color="#ffe6b7" emissive="#ffce81" emissiveIntensity={2}/></mesh></group>)}
  </group>)}

  {players.map(p=><Person key={p.id} p={p} phase={phase} clapping={clapping[p.id]} outfit={outfit}/>)}
  <OrbitControls makeDefault enablePan={false} target={[0,1,-2]} minDistance={9} maxDistance={25} minPolarAngle={.65} maxPolarAngle={1.4} minAzimuthAngle={-.8} maxAzimuthAngle={.8}/>
 </>;
}
