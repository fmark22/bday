import {defineConfig,loadEnv} from 'vite';
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'VITE_');
 if(env.VITE_SOCKET_URL){const url=new URL(env.VITE_SOCKET_URL);if(process.env.VERCEL==='1'&&url.protocol!=='https:')throw Error('VITE_SOCKET_URL must use HTTPS')}
 return {server:{proxy:{'/socket.io':{target:'http://localhost:3001',ws:true}}}};
});
