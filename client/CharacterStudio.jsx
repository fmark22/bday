import React,{Suspense,useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {OrbitControls,useGLTF,Center,ContactShadows,Html} from '@react-three/drei';
import Person from './Person.jsx';
import {StudioReflections} from './RoyalArchitecture.jsx';
const TYPES=[['king','왕'],['steward','집사'],['scholar','학자'],['guard','근위병'],['bard','음유시인']];
export default function CharacterStudio(){
 const [type,setType]=useState('king'),[gifts,setGifts]=useState(true),[clap,setClap]=useState(false);
 const outfit=gifts?{hand:'flowers',face:'glasses',neck:'ribbon',back:'cape'}:{};
 return <div className="model-studio"><div className="studio-heading"><p>생일 전하</p><h1>왕실의 사람들</h1><span>끌어서 돌려보고, 휠로 가까이 살펴보세요.</span></div><Canvas camera={{position:[3,2.2,4.5],fov:34}} dpr={[1,1.5]} shadows gl={{antialias:true,toneMapping:4}}><color attach="background" args={['#e7ddcb']}/><StudioReflections/><ambientLight intensity={.6}/><directionalLight position={[3,6,5]} intensity={3} castShadow shadow-mapSize={[2048,2048]}/><directionalLight position={[-4,3,-3]} intensity={1.5} color="#ffe4b0"/><Suspense fallback={<Html center>캐릭터를 불러오고 있어요…</Html>}><Person key={type} p={{id:'studio',role:type==='king'?'hero':'guest',avatar:type,slot:0,z:0,name:''}} phase="celebration" clapping={clap} outfit={outfit}/></Suspense><mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial color="#e7ddcb" roughness={.85}/></mesh><OrbitControls target={type==='king'?[0,1.2,0]:[-3.25,1.2,0]} minDistance={2.8} maxDistance={8} minPolarAngle={.3} maxPolarAngle={1.5}/></Canvas><nav className="studio-controls">{TYPES.map(([id,name])=><button key={id} aria-pressed={id===type} onClick={()=>setType(id)}>{name}</button>)}<label><input type="checkbox" checked={gifts} onChange={e=>setGifts(e.target.checked)}/>선물 착용</label><label><input type="checkbox" checked={clap} onChange={e=>setClap(e.target.checked)}/>박수</label><a href="/">파티로 돌아가기</a></nav></div>
}
