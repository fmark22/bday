import {createPartyServer} from './party-server.js';
const party=await createPartyServer();
party.http.listen(process.env.PORT||3001,'0.0.0.0',()=>console.log('Birthday Highness server ready'));
let stopping=false;
async function shutdown(){if(stopping)return;stopping=true;await party.close();process.exit(0)}
process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
