const NOTES=[['G4',.35],['G4',.18],['A4',.55],['G4',.55],['C5',.55],['B4',1],['G4',.35],['G4',.18],['A4',.55],['G4',.55],['D5',.55],['C5',1],['G4',.35],['G4',.18],['G5',.55],['E5',.55],['C5',.55],['B4',.55],['A4',1],['F5',.35],['F5',.18],['E5',.55],['C5',.55],['D5',.55],['C5',1]];
const HZ={G4:392,A4:440,B4:493.88,C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99};
const CHORDS=[[130.81,196,261.63,329.63],[110,164.81,220,261.63],[87.31,130.81,174.61,261.63],[98,146.83,196,293.66]];
export function createPartyAudio({AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext,setIntervalFn=setInterval,clearIntervalFn=clearInterval}={}){
 if(!AudioContext)return null;
 const ctx=new AudioContext(),master=ctx.createGain(),ambient=ctx.createGain();master.gain.value=.7;ambient.gain.value=.15;ambient.connect(master);master.connect(ctx.destination);
 let muted=false,interval=null,chord=0,closed=false;
 const sources={ambient:new Set(),birthday:new Set(),effect:new Set()};
 function track(source,bus,nodes=[]){sources[bus].add(source);source.onended=()=>{sources[bus].delete(source);source.disconnect();nodes.forEach(node=>node.disconnect())};return source}
 function clear(bus){for(const node of sources[bus]){try{node.stop()}catch{}}sources[bus].clear()}
 function tone(hz,time,duration,volume,bus='ambient',type='sine'){
  const osc=ctx.createOscillator(),env=ctx.createGain();osc.type=type;osc.frequency.value=hz;
  env.gain.setValueAtTime(.0001,time);env.gain.exponentialRampToValueAtTime(volume,time+.06);env.gain.exponentialRampToValueAtTime(.0001,time+duration);
  osc.connect(env);env.connect(bus==='ambient'?ambient:master);track(osc,bus,[env]);osc.start(time);osc.stop(time+duration+.03);
 }
 function phrase(){if(closed||muted||ctx.state!=='running')return;const start=ctx.currentTime+.04;
  CHORDS[chord%CHORDS.length].forEach((hz,i)=>{tone(hz,start+i*.35,3,.045);tone(hz*2,start+i*.35,2.8,.008)});chord++;
 }
 function startAmbient(){if(closed||muted||ctx.state!=='running')return false;if(interval===null){phrase();interval=setIntervalFn(phrase,3200)}return true}
 function stopAmbient(){if(interval!==null)clearIntervalFn(interval);interval=null;clear('ambient')}
 return {
  ctx,
  async resume(){if(closed)throw Error('Audio has been closed');await ctx.resume();if(ctx.state!=='running')throw Error('Audio is not running');return true},
  setMuted(value){muted=value;master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(value?0:.7,ctx.currentTime,.04);if(value)stopAmbient()},
  startAmbient,stopAmbient,
  playBirthday(){if(closed||muted||ctx.state!=='running')return false;clear('birthday');ambient.gain.cancelScheduledValues(ctx.currentTime);ambient.gain.setTargetAtTime(.025,ctx.currentTime,.2);let t=ctx.currentTime+.08;for(const [note,duration] of NOTES){tone(HZ[note],t,duration*.92,.14,'birthday','triangle');t+=duration}ambient.gain.setTargetAtTime(.15,t,.5);return true},
  stopBirthday(){clear('birthday');ambient.gain.cancelScheduledValues(ctx.currentTime);ambient.gain.setValueAtTime(.15,ctx.currentTime)},
  clap(){if(closed||muted||ctx.state!=='running')return false;
   const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.16),ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*.025));
   const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),env=ctx.createGain();noise.buffer=buffer;filter.type='bandpass';filter.frequency.value=1450;filter.Q.value=.7;env.gain.value=.3;
   noise.connect(filter);filter.connect(env);env.connect(master);track(noise,'effect',[filter,env]);noise.start();noise.stop(ctx.currentTime+.17);return true;
  },
  async close(){if(closed)return;closed=true;stopAmbient();clear('birthday');clear('effect');await ctx.close()}
 };
}
