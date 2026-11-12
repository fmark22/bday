import {writeFile,mkdir} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
const out=new URL('../public/',import.meta.url);await mkdir(out,{recursive:true});
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#61303a"/><path d="M15 25l9 8 8-15 8 15 9-8-5 22H20z" fill="#e2c488"/><path d="M21 42h22" stroke="#61303a" stroke-width="2.5"/><circle cx="15" cy="24" r="3" fill="#f2dfae"/><circle cx="32" cy="17" r="3" fill="#f2dfae"/><circle cx="49" cy="24" r="3" fill="#f2dfae"/><path d="M32 30l3 5-3 5-3-5z" fill="#7c3d46"/></svg>`;
await writeFile(new URL('favicon.svg',out),svg);
const table=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
function crc(buf){let c=0xffffffff;for(const n of buf)c=table[(c^n)&255]^(c>>>8);return (c^0xffffffff)>>>0}
function chunk(type,data){const name=Buffer.from(type),len=Buffer.alloc(4),checksum=Buffer.alloc(4);len.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([len,name,data,checksum])}
function inside(x,y,points){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [a,b]=points[i],[c,d]=points[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes}return yes}
function pixel(x,y){
 let color=[97,48,58];
 if(inside(x,y,[[15,25],[24,33],[32,18],[40,33],[49,25],[44,47],[20,47]]))color=[226,196,136];
 if([[15,24],[32,17],[49,24]].some(([a,b])=>(x-a)**2+(y-b)**2<=9))color=[242,223,174];
 if(x>=21&&x<=43&&Math.abs(y-42)<1.25)color=[97,48,58];
 if(inside(x,y,[[32,30],[35,35],[32,40],[29,35]]))color=[124,61,70];
 return color;
}
function png(size){const raw=Buffer.alloc(size*(1+size*4));for(let y=0;y<size;y++)for(let x=0;x<size;x++){const channels=[0,0,0];for(let j=0;j<2;j++)for(let i=0;i<2;i++){const p=pixel((x+(i+.5)/2)*64/size,(y+(j+.5)/2)*64/size);p.forEach((v,k)=>channels[k]+=v/4)}const offset=y*(1+size*4)+1+x*4;channels.forEach((v,k)=>raw[offset+k]=Math.round(v));raw[offset+3]=255}const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))])}
for(const size of [32,180,192,512])await writeFile(new URL(`crown-${size}.png`,out),png(size));
const bitmap=png(32),ico=Buffer.alloc(22);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);ico[6]=ico[7]=32;ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);ico.writeUInt32LE(bitmap.length,14);ico.writeUInt32LE(22,18);await writeFile(new URL('favicon.ico',out),Buffer.concat([ico,bitmap]));
console.log('Generated crown SVG, ICO and PNG icons (32, 180, 192, 512).');
