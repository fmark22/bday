// A direct, extensionless API route avoids subpath/static-file routing of
// Socket.IO's conventional dotted /socket.io path on the Vercel CDN.
export {default} from './socket-io.js';
