import assert from 'node:assert/strict';
import {createPartyAudio} from '../client/audio.js';
let rejectResume=false;const nodes=[],intervals=new Set();
const param=()=>({value:0,setValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){},exponentialRampToValueAtTime(){}});
class Node{constructor(){this.gain=param();this.frequency=param();this.Q=param();this.started=false;this.stopped=false;nodes.push(this)}connect(){}disconnect(){}start(){this.started=true}stop(){this.stopped=true}}
class Context{constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=48000;this.destination=new Node()}createGain(){return new Node()}createOscillator(){return new Node()}createBufferSource(){return new Node()}createBiquadFilter(){return new Node()}createBuffer(_channels,length){return {getChannelData:()=>new Float32Array(length)}}async resume(){if(rejectResume)throw Error('Autoplay blocked');this.state='running'}async close(){this.state='closed'}}
const audio=createPartyAudio({AudioContext:Context,setIntervalFn:fn=>{intervals.add(fn);return fn},clearIntervalFn:fn=>intervals.delete(fn)});
assert.equal(audio.startAmbient(),false);assert.equal(audio.playBirthday(),false);
await audio.resume();assert.equal(audio.startAmbient(),true);assert.equal(intervals.size,1);const count=nodes.filter(n=>n.started).length;assert.ok(count>0,'Enabling sound immediately schedules audible sources');
audio.startAmbient();assert.equal(intervals.size,1,'No duplicate background loops');
assert.equal(audio.clap(),true);audio.setMuted(true);assert.equal(intervals.size,0);assert.equal(audio.playBirthday(),false);assert.equal(audio.clap(),false);
audio.setMuted(false);audio.startAmbient();assert.equal(intervals.size,1);assert.equal(audio.playBirthday(),true,'Unmuting can play deferred birthday tune');
audio.stopBirthday();assert.equal(intervals.size,1,'Reset stops the tune without stopping ambience');
await audio.close();assert.equal(intervals.size,0);assert.ok(nodes.filter(n=>n.started).every(n=>n.stopped),'Unmount stops all sources');
rejectResume=true;const blocked=createPartyAudio({AudioContext:Context});await assert.rejects(()=>blocked.resume());assert.equal(blocked.startAmbient(),false);await blocked.close();
assert.equal(createPartyAudio({AudioContext:null}),null);
console.log('PASS: gesture resume, immediate ambience, single loop, clap, mute/unmute, deferred tune, reset, shutdown and blocked audio.');
