import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {io} from 'socket.io-client';
const origin='https://birthday-frontend.example.com',port='33919';
const child=spawn(process.execPath,['server/index.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,NODE_ENV:'production',CLIENT_ORIGIN:origin,PORT:port},stdio:['ignore','pipe','pipe']});
const clients=[];let startupTimer;
function connect(from=origin){return new Promise((resolve,reject)=>{const socket=io(`http://127.0.0.1:${port}`,{transports:['websocket'],forceNew:true,reconnection:false,timeout:2500,extraHeaders:{Origin:from}});clients.push(socket);socket.once('connect',()=>resolve(socket));socket.once('connect_error',reject)})}
function send(socket,event,payload){return new Promise((resolve,reject)=>socket.timeout(2500).emit(event,payload,(err,res)=>err?reject(err):resolve(res)))}
try{
 await new Promise((resolve,reject)=>{startupTimer=setTimeout(()=>reject(Error('Startup timed out')),8000);child.once('error',reject);child.once('exit',code=>reject(Error('Server exited '+code)));child.stdout.once('data',resolve);child.stderr.once('data',data=>reject(Error(String(data))))});clearTimeout(startupTimer);
 assert.deepEqual(await (await fetch(`http://127.0.0.1:${port}/health`)).json(),{ok:true});
 const guest=await connect(),hero=await connect();assert.equal((await send(guest,'join',{roomId:'smoke',gift:'cape'})).ok,true);assert.equal((await send(hero,'join',{roomId:'smoke',role:'hero'})).ok,true);
 const synced=new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Gift state not synchronized')),2500);guest.on('state',state=>{if(state.outfit.back==='cape'){clearTimeout(t);resolve(state)}})});
 assert.equal((await send(guest,'giveGift',{})).ok,true);const state=await synced;assert.equal(state.players.length,2);assert.equal(state.players.find(p=>p.role==='hero').name,'오늘의 왕');
 await assert.rejects(()=>connect('https://not-allowed.example.com'));
 console.log('PASS: production boot, health endpoint, two real WebSocket clients, shared gifts and rejected unapproved origin.');
}finally{clearTimeout(startupTimer);clients.forEach(socket=>socket.disconnect());child.kill();}
