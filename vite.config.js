import {defineConfig,loadEnv} from 'vite';
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'VITE_');
 if(process.env.VERCEL==='1'){
  if(!env.VITE_SOCKET_URL)throw Error('Vercel 환경변수 VITE_SOCKET_URL에 실시간 서버의 HTTPS 주소를 설정해 주세요.');
  let url;try{url=new URL(env.VITE_SOCKET_URL)}catch{throw Error('VITE_SOCKET_URL is not a valid URL')}
  if(url.protocol!=='https:')throw Error('VITE_SOCKET_URL must use HTTPS on Vercel');
 }
 return {server:{proxy:{'/socket.io':{target:'http://localhost:3001',ws:true}}}};
});
