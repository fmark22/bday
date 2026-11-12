import {createPartyServer} from '../server/party-server.js';
const party=await createPartyServer();
export default party.http;
