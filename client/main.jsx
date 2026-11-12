import {demoState,demoTransition} from '../shared/demo.js';
import {createPartyAudio} from './audio.js';
import CharacterStudio from './CharacterStudio.jsx';
import React,{useEffect,useRef,useState,Suspense} from 'react';import{createRoot}from'react-dom/client';import{Canvas}from'@react-three/fiber';import{io}from'socket.io-client';import Palace from './Palace.jsx';import GiftIcon from './GiftIcon.jsx';import {GIFTS} from '../shared/gifts.js';import './style.css';
const DEMO=new URLSearchParams(location.search).has('demo');
const externalSocket=import.meta.env.VITE_SOCKET_URL;
const socket=io(externalSocket||undefined,{autoConnect:false,transports:['websocket'],path:externalSocket||import.meta.env.DEV?'/socket.io':'/api/socket-io/socket.io'});
function readSession(room){try{return sessionStorage.getItem('bday:session:'+room)||undefined}catch{return undefined}}
function saveSession(room,token){try{sessionStorage.setItem('bday:session:'+room,token)}catch{}}
class SceneBoundary extends React.Component{constructor(props){super(props);this.state={failed:false}}static getDerivedStateFromError(){return {failed:true}}componentDidCatch(error){console.error('3D scene could not load',error)}render(){return this.state.failed?<div className="render-error" role="alert"><p>왕궁을 불러오지 못했어요.</p><button onClick={()=>location.reload()}>다시 불러오기</button></div>:this.props.children}}
const PREVIEW_PLAYERS=[{id:'preview-hero',role:'hero',name:'오늘의 주인공',slot:-1,z:-7.65},...[0,1,2,3,4,5].map(slot=>({id:'preview-'+slot,role:'guest',name:'',slot,z:0}))];
function App(){
 const [entryStep,setEntryStep]=useState('splash'),[gift,setGift]=useState('flowers');
 const [joining,setJoining]=useState(false),[joined,setJoined]=useState(DEMO),[id,setId]=useState(DEMO?'demo-hero':'');
 const [roomId]=useState(()=>new URLSearchParams(location.search).get('room')?.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32)||'birthday');
 const [state,setState]=useState(()=>DEMO?demoState():{phase:'waiting',players:[],outfit:{},gifts:[]});
 const [targetZ,setTargetZ]=useState(null),[clapping,setClapping]=useState({}),[messages,setMessages]=useState([]),[draft,setDraft]=useState('');
 const [chatOpen,setChatOpen]=useState(false),[wardrobeOpen,setWardrobeOpen]=useState(false);
 const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[confetti,setConfetti]=useState(false),[muted,setMuted]=useState(false);
 const stateRef=useRef(state),musicRef=useRef(null),mutedRef=useRef(false),playedRef=useRef(false),timers=useRef([]),chatBottom=useRef(null),resumeRef=useRef(null);stateRef.current=state;
 const me=state.players.find(p=>p.id===id),hero=state.players.find(p=>p.role==='hero'),role=me?.role||'guest';
 const unlockAudio=async()=>{try{if(!musicRef.current)musicRef.current=createPartyAudio();if(!musicRef.current)throw Error('Unsupported audio');await musicRef.current.resume();return musicRef.current}catch{mutedRef.current=true;setMuted(true);setNotice('소리를 재생하지 못했어요. 브라우저의 사이트 소리 권한을 확인하고 다시 켜 주세요.');return null}};
 const toggleSound=async()=>{const next=!mutedRef.current;mutedRef.current=next;setMuted(next);if(next){musicRef.current?.setMuted(true);return}const audio=await unlockAudio();if(!audio||mutedRef.current)return;audio.setMuted(false);audio.startAmbient();if(stateRef.current.phase==='celebration')playBirthday()};
 const later=(fn,ms)=>{const timer=setTimeout(fn,ms);timers.current.push(timer);return timer};
 const playBirthday=async()=>{if(playedRef.current||mutedRef.current)return;const audio=await unlockAudio();if(!audio||mutedRef.current||playedRef.current||stateRef.current.phase!=='celebration')return;audio.setMuted(false);playedRef.current=audio.playBirthday()};
 const emit=(event,payload={})=>{
  if(!DEMO){socket.emit(event,payload);return}
  if(event==='chat'){setMessages(old=>[...old,{id:'demo-chat-'+Date.now(),name:'오늘의 왕',text:payload.text}].slice(-50));return}
  if(event==='reset'){playedRef.current=false;setConfetti(false);setTargetZ(null);musicRef.current?.stopBirthday()}
  if(event==='crown')unlockAudio();
  setState(previous=>demoTransition(previous,event,payload));
 };
 useEffect(()=>{if(!DEMO||state.phase!=='celebration')return;playBirthday();setConfetti(true);setClapping(Object.fromEntries(state.players.filter(p=>p.role==='guest').map(p=>[p.id,true])));const t=setTimeout(()=>{setConfetti(false);setClapping({})},8000);return()=>clearTimeout(t)},[state.phase]);
 useEffect(()=>{const t=setTimeout(()=>setEntryStep('gift'),1400);return()=>clearTimeout(t)},[]);
 useEffect(()=>{
  if(DEMO)return()=>{timers.current.forEach(clearTimeout);musicRef.current?.close()};
  const onState=s=>{const current=stateRef.current;if(current.epoch===s.epoch&&current.version>=s.version)return;stateRef.current=s;setState(s);if(s.messages)setMessages(s.messages);if(s.phase==='celebration')playBirthday()};
  const onChat=m=>setMessages(old=>old.some(item=>item.id===m.id)?old:[...old,m].slice(-50));
  const onClap=({id})=>{musicRef.current?.clap();setClapping(c=>({...c,[id]:true}));later(()=>setClapping(c=>({...c,[id]:false})),700)};
  const onCelebrate=event=>{if(event?.version<stateRef.current.version||stateRef.current.phase!=='celebration')return;playBirthday();setConfetti(true);later(()=>setConfetti(false),8000)};
  const onReset=()=>{if(stateRef.current.phase!=='waiting')return;playedRef.current=false;setConfetti(false);setTargetZ(null);musicRef.current?.stopBirthday()};
  const onDisconnect=()=>{musicRef.current?.stopAmbient();setNotice('연결을 다시 이어가고 있어요…')};
  const onConnect=()=>{const saved=resumeRef.current;if(!saved)return;socket.timeout(8000).emit('join',saved,(err,res)=>{if(err||!res?.ok){resumeRef.current=null;setJoined(false);setEntryStep('gift');setNotice(res?.error||'다시 입장해 주세요.');return}setId(res.id);onState(res.state);setNotice('다시 연결했어요.');if(!mutedRef.current){musicRef.current?.setMuted(false);musicRef.current?.startAmbient()}})};
  const heartbeat=setInterval(()=>{if(socket.connected&&resumeRef.current)socket.emit('heartbeat',{})},20000);
  socket.on('connect',onConnect);

  socket.on('state',onState);socket.on('chat',onChat);socket.on('clap',onClap);socket.on('celebrate',onCelebrate);socket.on('reset',onReset);socket.on('disconnect',onDisconnect);
  return()=>{clearInterval(heartbeat);socket.off('connect',onConnect);socket.off('state',onState);socket.off('chat',onChat);socket.off('clap',onClap);socket.off('celebrate',onCelebrate);socket.off('reset',onReset);socket.off('disconnect',onDisconnect);socket.disconnect();timers.current.forEach(clearTimeout);musicRef.current?.close()};
 },[]);
 useEffect(()=>{if(chatOpen)chatBottom.current?.scrollIntoView({block:'nearest'})},[messages,chatOpen]);
 useEffect(()=>{
  if(!joined||role!=='hero')return;const keys=new Set();
  const down=e=>{if(['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName))return;if(['w','W','s','S','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();keys.add(e.key)}};
  const up=e=>keys.delete(e.key),blur=()=>keys.clear();window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
  const interval=setInterval(()=>{const s=stateRef.current,p=s.players.find(p=>p.id===id);if(!p||s.phase!=='walking')return;const delta=[...keys].some(k=>['w','W','ArrowUp'].includes(k))?-.22:[...keys].some(k=>['s','S','ArrowDown'].includes(k))?.22:targetZ!==null&&Math.abs(targetZ-p.z)>.18?Math.sign(targetZ-p.z)*.22:0;if(delta)emit('move',{z:p.z+delta})},80);
  return()=>{clearInterval(interval);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur)};
 },[joined,role,id,targetZ]);
 const join=(entryRole='guest')=>{if(joining)return;setNotice('');unlockAudio().then(audio=>{if(audio&&!mutedRef.current&&socket.connected&&!!resumeRef.current){audio.setMuted(false);audio.startAmbient()}});setJoining(true);socket.connect();socket.timeout(8000).emit('join',{roomId,role:entryRole,gift,sessionToken:readSession(roomId)},(err,res)=>{setJoining(false);if(err||!res?.ok){setNotice(err?'연결이 지연되고 있어요. 서버를 확인하고 다시 시도해 주세요.':res?.error||'입장하지 못했어요.');return}setId(res.id);setMessages(res.messages||[]);resumeRef.current={roomId,sessionToken:res.sessionToken};saveSession(roomId,res.sessionToken);if(res.state){stateRef.current=res.state;setState(res.state);if(res.state.phase==='celebration')playBirthday()}setJoined(true);if(!mutedRef.current){musicRef.current?.setMuted(false);musicRef.current?.startAmbient()}history.replaceState(null,'',`?room=${encodeURIComponent(roomId)}`)})};
 const action=(event,payload={},success='')=>{if(DEMO){emit(event,payload);if(success)setNotice(success);return}if(busy)return;setBusy(true);socket.timeout(5000).emit(event,payload,(err,res)=>{setBusy(false);setNotice(err?'연결이 지연되고 있어요. 다시 시도해 주세요.':res?.error||success)})};
 const share=async()=>{if(DEMO){setNotice('주인공 체험 화면이에요. 실제 초대는 파티로 돌아간 뒤 해 주세요.');return}try{await navigator.clipboard.writeText(`${location.origin}${location.pathname}?room=${encodeURIComponent(roomId)}`);setNotice('초대 링크를 복사했어요. 친구에게 보내 주세요.')}catch{setNotice('주소창의 링크를 복사해서 친구에게 보내 주세요.')}};
 return <div className={'party-app '+(!joined?'is-entry':'')+(DEMO?' is-demo':'')}>
  <main className="party-world" aria-label="생일파티 왕궁">
   <SceneBoundary><Suspense fallback={<div className="world-loader" role="status">왕궁의 문을 열고 있어요…</div>}><Canvas fallback={<div className="render-error">3D 화면을 표시할 수 없어요. 브라우저의 하드웨어 가속을 확인해 주세요.</div>} camera={{position:[8,6.5,16],fov:43}} dpr={[1,1.5]} gl={{antialias:true,toneMapping:4,toneMappingExposure:1.1}} shadows>
    <Palace players={joined?state.players:PREVIEW_PLAYERS} phase={joined?state.phase:'waiting'} outfit={joined?state.outfit:{neck:'ribbon'}} clapping={clapping} onCarpetClick={z=>{if(joined&&role==='hero'&&state.phase==='walking')setTargetZ(Math.max(-7,Math.min(10,z)))}}/>
   </Canvas></Suspense></SceneBoundary>
  </main>
  {!joined?<div className="welcome-overlay"><section className={'welcome-panel '+(entryStep==='splash'?'splash-panel':'')} aria-label="파티에 입장하기">
   <p className="party-kicker">A LITTLE PARTY, JUST FOR YOU</p><h1 className="brand-wordmark"><img src="/favicon.svg" alt=""/>생일 전하</h1>
   {entryStep==='splash'?<div role="status"><p>생일파티를 준비하고 있어요</p><div className="preparing-line"><span/></div></div>:<>
    <p className="welcome-description">빈손으로 와도 반갑지만,<br/>작은 선물 하나 골라볼까요?</p>
    <div className="gift-grid" role="group" aria-label="가져갈 선물 선택">{GIFTS.map(item=><button key={item.id} className={'gift-card '+(gift===item.id?'selected':'')} aria-pressed={gift===item.id} onClick={()=>setGift(item.id)}><GiftIcon item={item.id}/><span>{item.name}</span><small>{gift===item.id?'함께 가져갈게요':item.detail}</small></button>)}</div>
    <p className="automatic-name">이름은 배정된 캐릭터의 이름으로 붙어요.</p>
    <button className="enter-party" disabled={joining} onClick={()=>join()}>{joining?'문을 여는 중…':'선물 들고 입장하기'}<span>캐릭터는 입장할 때 랜덤으로 정해져요</span></button>
    <button className="hero-entry" disabled={joining} onClick={()=>join('hero')}>오늘의 주인공이신가요? 선물 없이 입장하기 →</button>
   </>}
   {notice&&<p className="party-notice" role="status">{notice}</p>}
  </section><span className="welcome-footnote">작은 축하가 모여, 잊지 못할 하루가 됩니다.</span></div>:<>
   {DEMO&&<div className="demo-toolbar"><strong>주인공 체험 · 실제 방과 분리된 화면</strong><div>{state.phase==='walking'&&<button onClick={()=>{setTargetZ(null);emit('move',{z:-7})}}>왕좌 앞으로 이동</button>}<button disabled={state.gifts.length>0} onClick={()=>{emit('demoGifts');setNotice('네 명의 손님이 선물을 건넸어요. 받은 선물에서 벗거나 다시 착용할 수 있어요.')}}>선물 도착 보기</button><button onClick={()=>{emit('reset');setState(demoState());setMessages([]);setNotice('')}}>처음부터</button><a href="/">실제 파티로</a></div></div>}
   <header className="floating-header"><div><p className="party-kicker">생일 전하</p><h1 className="brand-wordmark"><img src="/favicon.svg" alt=""/>생일 전하</h1></div><span className="people-chip">{state.players.length}명</span></header>
   <div className="top-tools"><button className="icon-tool" onClick={toggleSound} aria-label={muted?'소리 켜기':'소리 끄기'} title={muted?'소리 켜기':'소리 끄기'} aria-pressed={!muted}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/>{muted?<path d="m16 9 5 6m0-6-5 6"/>:<><path d="M15 8a6 6 0 0 1 0 8"/><path d="M18 5a10 10 0 0 1 0 14"/></>}</svg></button><button className="icon-tool" onClick={share} aria-label="초대 링크 복사" title="초대 링크 복사"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4"/></svg></button></div>
   <div className="scene-caption"><span className="live-dot"/>{state.phase==='waiting'?hero?`${hero.name} 님의 파티가 곧 시작돼요`:'주인공을 기다리며, 먼저 인사를 나눠요':state.phase==='walking'?'주인공이 레드카펫을 걷고 있어요':state.phase==='seated'?'오늘의 왕관을 준비했어요':'생일 축하해요. 오늘은 당신의 날이에요.'}</div>
   <aside className="guest-label"><span className="assigned-name">나 · {me?.name}</span></aside>
   {notice&&<div className="world-notice" role="status"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="알림 닫기">×</button></div>}
   {confetti&&<div className="celebration-layer"><div className="celebrate">Happy Birthday</div>{Array.from({length:60},(_,i)=><i key={i} className="confetti-piece" style={{left:`${i*71%100}%`,animationDelay:`${i%10/5}s`,background:['#dfc89b','#d3a5a1','#e9e2cf','#a8bcaf'][i%4]}}/>)}</div>}
   <nav className="party-dock" aria-label="파티에서 할 일">
    {role==='guest'?<><button className="dock-gift" disabled={busy||me?.giftGiven||!hero} onClick={()=>action('giveGift',{},'선물을 건넸어요! 주인공에게 잘 어울리네요.')}><GiftIcon item={me?.gift||gift}/><span>{me?.giftGiven?'선물 전달 완료':!hero?'주인공을 기다려요':'선물 건네기'}</span></button><button onClick={()=>emit('clap')} disabled={state.phase==='waiting'}>👏<span>박수</span></button>{!hero&&<button disabled={busy} onClick={()=>action('claimHero',{},'오늘의 주인공으로 설정했어요.')}>♛<span>내가 주인공</span></button>}</>:<>
     {state.phase==='waiting'&&<button className="primary-action" onClick={()=>emit('start')}>♛<span>대관식 시작</span></button>}
     {state.phase==='walking'&&<><button onClick={()=>emit('move',{z:(me?.z??10)-.7})}>↑<span>앞으로 걷기</span></button>{me?.z<=-6.2&&<button onClick={()=>emit('sit')}>♛<span>왕좌에 앉기</span></button>}</>}
     {state.phase==='seated'&&<button onClick={()=>emit('crown')}>♛<span>왕관 쓰기</span></button>}
     {state.phase==='celebration'&&<button onClick={()=>emit('reset')}>↻<span>한 번 더</span></button>}
     <button aria-expanded={wardrobeOpen} onClick={()=>{setWardrobeOpen(v=>!v)}}>♧<span>받은 선물 {state.gifts.length}</span></button>
    </>}
    <button onClick={()=>setChatOpen(v=>!v)} aria-expanded={chatOpen}>☏<span>이야기 나누기</span></button>
   </nav>
   <p className="movement-hint">{role==='hero'?'카펫을 눌러 걷기 · W / ↑ 이동 · ':''}끌어서 둘러보기 · 휠로 확대</p>
   {role==='hero'&&wardrobeOpen&&<section className="wardrobe-panel"><div className="panel-title"><h2>마음을 입어보세요</h2><button onClick={()=>setWardrobeOpen(false)} aria-label="받은 선물 닫기">×</button></div><p>받은 선물을 누르면 착용하거나 벗을 수 있어요.</p>{!state.gifts.length?<p className="empty-gifts">친구들이 선물을 고르고 있어요.</p>:GIFTS.filter(item=>state.gifts.some(g=>g.item===item.id)).map(item=><button className="wardrobe-item" disabled={busy} key={item.id} aria-pressed={state.outfit[item.slot]===item.id} onClick={()=>action('toggleGift',{item:item.id})}><GiftIcon item={item.id}/><span><strong>{item.name}</strong><small>{state.gifts.filter(g=>g.item===item.id).map(g=>g.from).join(', ')} 님의 선물</small></span><em>{state.outfit[item.slot]===item.id?'착용 중':'착용하기'}</em></button>)}</section>}
   {chatOpen&&<section className="party-chat" aria-label="파티 채팅"><div className="panel-title"><h2>함께 나누는 이야기</h2><button onClick={()=>setChatOpen(false)} aria-label="채팅 닫기">×</button></div><div className="party-messages" role="log" aria-live="polite">{!messages.length&&<p className="chat-empty">첫 번째 축하를 남겨보세요.</p>}{messages.map(m=><div key={m.id} className={m.system?'system-message':''}><strong>{m.name}</strong><p>{m.text}</p></div>)}<div ref={chatBottom}/></div><form onSubmit={e=>{e.preventDefault();if(draft.trim()){emit('chat',{text:draft});setDraft('')}}}><input aria-label="축하 메시지" placeholder="축하하는 마음을 남겨주세요" maxLength={200} value={draft} onChange={e=>setDraft(e.target.value)}/><button disabled={!draft.trim()}>전송</button></form></section>}
  </>}
 </div>;
}
createRoot(document.getElementById('root')).render(new URLSearchParams(location.search).has('studio')?<SceneBoundary><CharacterStudio/></SceneBoundary>:<App/>);
