import React from 'react';
function Orb({at,scale=[1,1,1],size=.1,color,metalness=0}){return <mesh position={at} scale={scale} castShadow><sphereGeometry args={[size,20,16]}/><meshStandardMaterial color={color} metalness={metalness} roughness={metalness?.35:.8}/></mesh>}
function Block({at,size,color,rotation}){return <mesh position={at} rotation={rotation} castShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.7}/></mesh>}
function Skirt({color,height=.72,radius=.37}){return <mesh position={[0,.62,0]} castShadow><cylinderGeometry args={[.28,radius,height,28]}/><meshStandardMaterial color={color} roughness={.95}/></mesh>}
function Belt(){return <><mesh position={[0,.72,0]}><cylinderGeometry args={[.365,.365,.075,28]}/><meshStandardMaterial color="#604637" roughness={.8}/></mesh><Block at={[0,.72,.36]} size={[.12,.1,.025]} color="#b69a60"/></>}
export default function GuestCostume({avatar}){
 return <>
 {avatar==='steward'&&<>
  <Skirt color="#475337" height={.57}/><Belt/>
  {[-1,1].map(side=><React.Fragment key={side}><Orb at={[side*.09,1.43,.33]} scale={[1,.4,.6]} size={.1} color="#665044"/><Block at={[side*.15,1.02,.23]} size={[.075,.35,.025]} color="#b59b63" rotation={[0,0,side*-.25]}/></React.Fragment>)}
  {[.84,.97,1.1].map(y=><Orb key={y} at={[0,y,.26]} size={.025} color="#c6ac70" metalness={.5}/>)}
  <Block at={[-.39,.58,.08]} size={[.28,.25,.13]} color="#72533b"/><Block at={[-.39,.62,.16]} size={[.25,.04,.025]} color="#aa8d5c"/>
 </>}
 {avatar==='scholar'&&<>
  <Skirt color="#714958" height={1.02} radius={.4}/><Orb at={[0,1.98,-.05]} size={.19} scale={[1,.85,1]} color="#77716b"/>
  {[-.13,.13].map(x=><mesh key={x} position={[x,1.55,.325]}><torusGeometry args={[.1,.012,8,28]}/><meshStandardMaterial color="#b69a60" metalness={.6} roughness={.3}/></mesh>)}<Block at={[0,1.55,.33]} size={[.06,.015,.02]} color="#b69a60"/>
  <mesh position={[0,1.12,-.02]} rotation={[.15,0,0]}><cylinderGeometry args={[.29,.42,.45,24,1,true,Math.PI/2,Math.PI]}/><meshStandardMaterial color="#603d50" side={2}/></mesh>
  <Block at={[.35,.62,.06]} size={[.2,.28,.1]} color="#72553e"/><Block at={[.35,.62,.12]} size={[.12,.2,.015]} color="#ba9d6c"/>
 </>}
 {avatar==='guard'&&<>
  <Skirt color="#3c4a60" height={.5}/><Belt/>
  <Orb at={[0,1.03,.02]} size={.32} scale={[1,.8,.82]} color="#8b9494" metalness={.65}/>
  {[-1,1].map(side=><Orb key={side} at={[side*.33,1.12,0]} size={.18} scale={[1.2,.7,1]} color="#969d9a" metalness={.65}/>)}
  <Orb at={[0,1.33,.19]} size={.22} scale={[1,.55,.8]} color="#7c624b"/>
  <Block at={[0,1.01,.285]} size={[.1,.13,.03]} color="#c1a370"/>
 </>}
 {avatar==='bard'&&<>
  <Skirt color="#d5c3a0" height={.75} radius={.44}/><Belt/>
  <Orb at={[.04,1.88,0]} size={.4} scale={[1.1,.38,1.02]} color="#8d4937"/>
  <mesh position={[-.19,2.13,0]} rotation={[0,0,.4]}><capsuleGeometry args={[.035,.3,5,10]}/><meshStandardMaterial color="#dac5a0"/></mesh>
  {[-1,1].map(side=>[0,1,2].map(i=><Orb key={side+'-'+i} at={[side*.3,1.54-i*.12,-.05]} size={.13} color="#754a32"/>))}
  <group position={[.1,.93,-.3]} rotation={[0,0,-.35]}><Orb size={.24} scale={[.8,1.2,.4]} color="#a87943"/><Block at={[0,.38,0]} size={[.055,.48,.045]} color="#735039"/>{[-.012,.012].map(x=><Block key={x} at={[x,.17,-.09]} size={[.003,.65,.005]} color="#ceb982"/>)}</group>
 </>}
 </>
}
