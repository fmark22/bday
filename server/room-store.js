import {EventEmitter} from 'node:events';
import Redis from 'ioredis';

const TTL=6*60*60;
// One atomic operation commits the room and publishes its snapshot in order.
const COMMIT=`local current=redis.call('GET',KEYS[1]) or ''
if current~=ARGV[1] then return 0 end
redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[4])
redis.call('PUBLISH',KEYS[2],ARGV[3])
return 1`;

export class MemoryRoomStore{
 constructor(){this.rooms=new Map();this.queues=new Map();this.events=new EventEmitter();this.kind='memory'}
 subscribe(listener){this.events.on('room',listener);return()=>this.events.off('room',listener)}
 async transact(id,mutate){
  const previous=this.queues.get(id)||Promise.resolve();
  const work=previous.catch(()=>{}).then(()=>{
   const current=this.rooms.get(id);const result=mutate(current?structuredClone(current):null);
   if(!result.commit)return result;
   result.room.version=(current?.version||0)+1;
   this.rooms.set(id,structuredClone(result.room));
   const packet=result.packet(result.room);this.events.emit('room',packet);
   return {...result,snapshot:packet.state};
  });
  this.queues.set(id,work);try{return await work}finally{if(this.queues.get(id)===work)this.queues.delete(id)}
 }
 async ping(){return true}
 async close(){this.events.removeAllListeners();this.rooms.clear()}
}

export class RedisRoomStore{
 constructor(url,{namespace='bday:v2:production'}={}){
  this.kind='redis';this.namespace=namespace;this.channel=namespace+':events';this.events=new EventEmitter();
  const options={protocol:2,lazyConnect:true,enableReadyCheck:false,maxRetriesPerRequest:2,connectTimeout:8000,retryStrategy:times=>Math.min(times*200,3000)};
  this.client=new Redis(url,options);this.subscriber=new Redis(url,options);
  // Log operational errors without connection URLs or credentials.
  this.client.on('error',()=>{});this.subscriber.on('error',()=>{});
  this.subscriber.on('message',(channel,message)=>{if(channel!==this.channel)return;try{this.events.emit('room',JSON.parse(message))}catch{console.error('Invalid room notification')}});
 }
 async ready(){await Promise.all([this.client.connect(),this.subscriber.connect()]);await this.client.ping();await this.subscriber.subscribe(this.channel);return this}
 subscribe(listener){this.events.on('room',listener);return()=>this.events.off('room',listener)}
 async transact(id,mutate){
  const key=this.namespace+':room:'+id;
  for(let attempt=0;attempt<30;attempt++){
   const raw=await this.client.get(key),current=raw?JSON.parse(raw):null;
   const result=mutate(current);
   if(!result.commit)return result;
   result.room.version=(current?.version||0)+1;
   const packet=result.packet(result.room);
   const committed=await this.client.eval(COMMIT,2,key,this.channel,raw||'',JSON.stringify(result.room),JSON.stringify(packet),TTL);
   if(committed===1)return {...result,snapshot:packet.state};
   await new Promise(resolve=>setTimeout(resolve,Math.min(2**attempt,25)+Math.random()*10));
  }
  throw Error('Room is busy; please retry');
 }
 async ping(){return (await this.client.ping())==='PONG'}
 async close(){this.events.removeAllListeners();await Promise.allSettled([this.client.quit(),this.subscriber.quit()]);this.client.disconnect();this.subscriber.disconnect()}
}

export async function configuredStore(env=process.env){
 const url=env.REDIS_URL||env.KV_URL;
 if(url){
  if(!/^rediss?:\/\//.test(url))throw Error('REDIS_URL must be a Redis TCP connection URL');
  const scope=env.VERCEL_ENV==='preview'?'preview:'+String(env.VERCEL_GIT_COMMIT_REF||'default').replace(/[^\w-]/g,'_'):'production';
  const store=new RedisRoomStore(url,{namespace:env.BDAY_REDIS_NAMESPACE||'bday:v2:'+scope});
  try{return await store.ready()}catch(error){await store.close();throw error}
 }
 if(env.VERCEL==='1')throw Error('Connect Upstash Redis to this Vercel project; REDIS_URL is required');
 return new MemoryRoomStore();
}
