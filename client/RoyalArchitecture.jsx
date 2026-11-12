import React,{useEffect,useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';

export function StudioReflections(){
 const {gl,scene}=useThree();
 useEffect(()=>{const generator=new THREE.PMREMGenerator(gl),room=new RoomEnvironment(),map=generator.fromScene(room,.04);const previous=scene.environment;scene.environment=map.texture;scene.environmentIntensity=.45;room.dispose();generator.dispose();return()=>{scene.environment=previous;map.dispose()}},[gl,scene]);
 return null;
}
function Brass(){return <meshStandardMaterial color="#ad8c4e" metalness={.82} roughness={.3}/>}
function Block({at,size,color='#b2965c',metal=false}){return <mesh position={at} castShadow receiveShadow><boxGeometry args={size}/>{metal?<Brass/>:<meshStandardMaterial color={color} roughness={.65}/>}</mesh>}
function Line({points,r=.02,color='#b2965c'}){const geo=useMemo(()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,r,6,false),[points,r]);useEffect(()=>()=>geo.dispose(),[geo]);return <mesh geometry={geo} castShadow><meshStandardMaterial color={color} metalness={.72} roughness={.35}/></mesh>}
function Curtain({x,z}){
 const geometry=useMemo(()=>{const n=28,rows=12,vertices=[],indices=[];for(let j=0;j<=rows;j++)for(let i=0;i<=n;i++){const t=j/rows,a=i/n;vertices.push((a-.5)*(1.15+t*.4),-t*5.7,Math.sin(a*8*Math.PI)*(.06+t*.06));}for(let j=0;j<rows;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;indices.push(a,b,a+1,b,b+1,a+1)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g},[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <group position={[x,6.8,z]}>
  <mesh geometry={geometry} castShadow receiveShadow><meshPhysicalMaterial color="#602632" roughness={.9} sheen={1} sheenColor="#a66c73" sheenRoughness={.8} side={THREE.DoubleSide}/></mesh>
  <Block at={[0,.12,0]} size={[1.6,.18,.2]} metal/>
  <Line points={[[-.65,-3.5,.07],[0,-3.62,.18],[.65,-3.5,.07]]} r={.022}/>
 </group>;
}
export function RoyalThrone(){
 const arch=useMemo(()=>{const s=new THREE.Shape();s.moveTo(-.73,.8);s.lineTo(-.73,2.3);s.quadraticCurveTo(-.73,3,0,3.2);s.quadraticCurveTo(.73,3,.73,2.3);s.lineTo(.73,.8);s.closePath();return s},[]);
 return <group position={[0,.52,-8.95]}>
  <mesh position={[0,0,-.35]} castShadow><extrudeGeometry args={[arch,{depth:.16,bevelEnabled:true,bevelSize:.045,bevelThickness:.04,bevelSegments:3,steps:1}]}/><Brass/></mesh>
  <mesh position={[0,.16,-.12]} scale={[.83,.84,1]} castShadow><extrudeGeometry args={[arch,{depth:.06,bevelEnabled:true,bevelSize:.04,bevelThickness:.04,bevelSegments:3}]}/><meshPhysicalMaterial color="#6c2530" roughness={.9} sheen={1} sheenColor="#b66e7a"/></mesh>
  {Array.from({length:5},(_,row)=>[-1,0,1].map(col=><mesh key={row+'-'+col} position={[col*.28,.99+row*.3,-.008]}><sphereGeometry args={[.02,8,8]}/><Brass/></mesh>))}
  <Block at={[0,.8,.12]} size={[1.3,.2,1]} color="#6c2530"/>
  {[-1,1].map(side=><group key={side}>
   <Line points={[[side*.58,.05,.35],[side*.55,.5,.32],[side*.62,1.18,.35],[side*.72,1.28,.08],[side*.67,1.17,-.18]]} r={.07}/>
   <Block at={[side*.64,1.21,.13]} size={[.16,.13,.8]} metal/>
   <mesh position={[side*.7,1.21,.58]} scale={[1,.8,1.2]}><sphereGeometry args={[.115,16,12]}/><Brass/></mesh>
   <Line points={[[side*.58,.05,-.3],[side*.61,.5,-.31],[side*.65,.94,-.3]]} r={.065}/>
   <Line points={[[side*.64,1.45,-.15],[side*.65,2.3,-.15],[side*.4,2.8,-.15],[0,3.03,-.15]]} r={.025}/>
  </group>)}
  <mesh position={[0,3.23,-.25]}><sphereGeometry args={[.085,16,12]}/><Brass/></mesh>
 </group>;
}
export function HallDetails(){
 const arch=useMemo(()=>{const outer=new THREE.Shape();outer.moveTo(-6.5,5.9);outer.quadraticCurveTo(0,10.9,6.5,5.9);outer.lineTo(6.5,6.18);outer.quadraticCurveTo(0,11.3,-6.5,6.18);outer.closePath();return outer},[]);
 return <>
  <StudioReflections/>
  {[-9,-2,5,12].map(z=><mesh key={z} position={[0,0,z]} castShadow><extrudeGeometry args={[arch,{depth:.25,bevelEnabled:true,bevelSize:.03,bevelThickness:.03,bevelSegments:2}]}/><meshStandardMaterial color="#c8b99c" roughness={.65}/></mesh>)}
  {[-1,1].map(side=><group key={side}>
   {[-9,-2,5,12].map(z=><group key={z} position={[side*6.6,0,z]}>
    {[.65,6.1].map(y=><mesh key={y} position={[0,y,0]}><torusGeometry args={[.4,.025,6,32]}/><Brass/></mesh>)}
   </group>)}
   {[-5,5].map(z=><group key={z} position={[side*8.7,0,z]} rotation={[0,side===-1?Math.PI/2:-Math.PI/2,0]}><Curtain x={-1.25} z={0}/><Curtain x={1.25} z={0}/></group>)}
   <Curtain x={side*3.9} z={-12.05}/>
   {[.18,2.25,6.9].map(y=><Block key={y} at={[side*9.2,y,-1]} size={[.18,.08,31]} metal/>)}
  </group>)}
  <group position={[0,4.5,-12.08]}>
   <mesh><torusGeometry args={[1.1,.045,8,64]}/><Brass/></mesh>
   {Array.from({length:16},(_,i)=>{const a=i/16*Math.PI*2;return <mesh key={i} position={[Math.sin(a)*1.22,Math.cos(a)*1.22,0]} rotation={[0,0,-a]} scale={[.045,.13,.025]}><sphereGeometry args={[1,8,8]}/><Brass/></mesh>})}
   <mesh position={[0,0,.04]}><sphereGeometry args={[.55,32,20]}/><meshStandardMaterial color="#673330" roughness={.8}/></mesh>
   <Line points={[[-.3,-.13,.58],[-.3,.23,.58],[0,.04,.59],[.3,.23,.58],[.3,-.13,.58],[-.3,-.13,.58]]} r={.04}/>
  </group>
  {[-1,1].map(side=>Array.from({length:9},(_,i)=><mesh key={side+'-'+i} position={[side*1.43,.031,-8+i*2]} rotation={[-Math.PI/2,0,Math.PI/4]}><planeGeometry args={[.05,.05]}/><Brass/></mesh>))}
 </>;
}
