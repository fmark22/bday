import * as T from 'three';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {mergeGeometries,mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {mkdir,writeFile} from 'node:fs/promises';

// The exporter uses FileReader for binary packaging. No DOM or external services.
globalThis.FileReader=class{
 readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.()})}
 readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result=`data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;this.onloadend?.()})}
};
const out=new URL('../public/models/',import.meta.url);await mkdir(out,{recursive:true});
const material=(name,color,options={})=>{const m=new T.MeshPhysicalMaterial({color,roughness:.7,...options});m.name=name;return m};
const gold=material('Antique brass','#b99953',{metalness:.83,roughness:.29});
const leather=material('Leather','#50392c',{roughness:.61});
const ivory=material('Ivory woven cloth','#e8d7b4',{sheen:.7,sheenColor:new T.Color('#f9e8cd'),sheenRoughness:.9});
const steel=material('Brushed steel','#8f9998',{metalness:.8,roughness:.38});
const ruby=material('Garnet','#7b2931',{metalness:.2,roughness:.18,clearcoat:1});
const eye=material('Pupil','#28241f',{roughness:.16,clearcoat:.8});
const white=material('Eye white','#e9e3d6',{roughness:.35});
const blush=material('Warm cheek','#bd7c67');
function group(parent,name,pos=[0,0,0]){const g=new T.Group();g.name=name;g.position.set(...pos);parent.add(g);return g}
function mesh(parent,geo,mat,pos=[0,0,0],scale=[1,1,1],rotation=[0,0,0]){const m=new T.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);m.rotation.set(...rotation);m.castShadow=m.receiveShadow=true;parent.add(m);return m}
const orb=(p,m,pos,scale=[1,1,1],r=1)=>mesh(p,new T.SphereGeometry(r,16,12),m,pos,scale);
const box=(p,m,pos,size,rot)=>mesh(p,new T.BoxGeometry(...size),m,pos,[1,1,1],rot);
const ring=(p,m,pos,r,t,rot=[0,0,0])=>mesh(p,new T.TorusGeometry(r,t,6,32),m,pos,[1,1,1],rot);
function curve(p,m,points,r=.01){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),Math.max(8,points.length*4),r,5,false),m)}
function lathe(p,m,profile,pos=[0,0,0],depth=1){return mesh(p,new T.LatheGeometry(profile.map(([x,y])=>new T.Vector2(x,y)),32),m,pos,[1,1,depth])}
function cloth(p,m,{top=.28,bottom=.45,height=.8,depth=.75,start=Math.PI/2,arc=Math.PI,folds=9,y=1.2}={}){
 const n=48,rows=14,positions=[],uv=[],indices=[];
 for(let j=0;j<=rows;j++){const t=j/rows;for(let i=0;i<=n;i++){
  const a=start+arc*i/n,r=T.MathUtils.lerp(top,bottom,t)+Math.sin(i/n*folds*Math.PI*2)*.025*t;
  positions.push(Math.sin(a)*r,y-t*height+Math.sin(a*folds)*.009*t,Math.cos(a)*r*depth);uv.push(i/n,t);
 }}
 for(let j=0;j<rows;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;indices.push(a,b,a+1,b,b+1,a+1)}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const obj=mesh(p,geo,m);obj.material.side=T.DoubleSide;
 return obj;
}
function embroidery(parent,height,width,z){
 for(const side of [-1,1]){
  curve(parent,gold,[[side*width,.85,z],[side*(width+.025),height*.75,z],[side*width,height,z]],.008);
  for(let i=0;i<7;i++){const y=.86+i*(height-.9)/7;curve(parent,gold,[[side*width,y,z],[side*(width+.055),y+.025,z-.003],[side*width,y+.055,z]],.004)}
 }
}
function hairLock(parent,mat,points,r=.035){curve(parent,mat,points,r)}
function face(parent,{skin,hair,beard=false,moustache=false,bun=false,bald=false,curly=false}){
 const head=group(parent,'Head',[0,1.76,0]);
 orb(head,skin,[0,0,0],[.235,.287,.219]);
 orb(head,skin,[0,-.13,.085],[.21,.14,.17]);
 for(const side of [-1,1]){
  orb(head,skin,[side*.231,-.015,0],[.049,.078,.041]);
  orb(head,blush,[side*.147,-.083,.163],[.065,.025,.012]);
  orb(head,white,[side*.089,.025,.192],[.05,.033,.019]);
  orb(head,eye,[side*.089,.024,.21],[.022,.025,.01]);
  orb(head,white,[side*.083,.031,.219],[.006,.007,.003]);
  curve(head,hair,[[side*.045,.093,.185],[side*.09,.108,.19],[side*.146,.086,.175]],.017);
 }
 orb(head,skin,[0,-.035,.219],[.052,.07,.057]);
 orb(head,skin,[0,-.06,.249],[.061,.038,.045]);
 curve(head,blush,[[-.065,-.135,.182],[0,-.148,.202],[.065,-.132,.182]],.008);
 for(const side of [-1,1])curve(head,blush,[[side*.11,-.054,.193],[side*.136,-.083,.18],[side*.129,-.106,.172]],.003);
 if(!bald)mesh(head,new T.SphereGeometry(1,20,12,0,Math.PI*2,0,1.42),hair,[0,.04,-.012],[.247,.262,.23]);
 // Swept locks use shaped curves rather than a single spherical hair cap.
 for(let i=0;i<(bald?7:18);i++){
  const a=i/(bald?7:18)*Math.PI*2,x=Math.sin(a)*.215,z=Math.cos(a)*.19;
  hairLock(head,hair,[[x,.06,z],[x*1.16,.15,z*1.04],[x*.9,.23,z*.8],[x*.5,.255,z*.4]],.028);
 }
 if(bald)orb(head,skin,[0,.17,.015],[.18,.13,.17]);
 if(curly)for(const side of [-1,1])for(let i=0;i<6;i++)orb(head,hair,[side*(.22+Math.sin(i)*.025),.12-i*.065,-.02],[.065,.071,.07]);
 if(bun)for(let i=0;i<9;i++){const a=i/9*Math.PI*2;orb(head,hair,[Math.sin(a)*.055,.29+Math.cos(a)*.035,-.055],[.058,.058,.07])}
 if(moustache)for(const side of [-1,1])hairLock(head,hair,[[0,-.095,.236],[side*.07,-.105,.231],[side*.13,-.085,.203]],.023);
 if(beard)for(let i=0;i<17;i++){const a=-1.35+i/16*2.7,x=Math.sin(a)*.16,z=Math.cos(a)*.15;hairLock(head,hair,[[x,-.095,z],[x*.9,-.18,z+.02],[x*.6,-.255,z*.75]],.025)}
 return head;
}
function crown(parent,pos=[0,2.06,0]){
 const g=group(parent,'Crown',pos);
 lathe(g,gold,[[.19,0],[.215,.02],[.217,.1],[.205,.12],[.19,.1],[.19,0]], [0,0,0],1);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2,x=Math.sin(a)*.21,z=Math.cos(a)*.21;
  mesh(g,new T.ConeGeometry(.047,.13,4),gold,[x,.16,z]);orb(g,gold,[x,.23,z],[.024,.024,.024]);
  orb(g,ruby,[Math.sin(a)*.218,.065,Math.cos(a)*.218],[.02,.031,.02]);
 }
 return g;
}
const configs={
 king:{cloth:'#6c2330',hair:'#766859',skin:'#d7a27d',belly:.37,beard:true,moustache:true,bald:true},
 steward:{cloth:'#3e4c2e',hair:'#695142',skin:'#d9a484',belly:.37,moustache:true,bald:true},
 scholar:{cloth:'#613b55',hair:'#827b76',skin:'#ddbaa1',belly:.28,bun:true,robe:true},
 guard:{cloth:'#303f5a',hair:'#806147',skin:'#c99b7b',belly:.32,beard:true,moustache:true},
 bard:{cloth:'#945138',hair:'#78492c',skin:'#d2a383',belly:.29,curly:true,skirt:true},
};
function character(id){
 const c=configs[id],root=new T.Group();root.name=id;
 root.userData={design:'Royal Birthday original procedural character v1',reference:'design/character',rig:'hierarchical articulated joints; no skinned deformation'};
 const velvet=material('Velvet '+id,c.cloth,{roughness:.82,sheen:1,sheenColor:new T.Color(c.cloth).multiplyScalar(1.5),sheenRoughness:.7});
 const skin=material('Skin '+id,c.skin,{roughness:.65}),hair=material('Hair '+id,c.hair,{roughness:.85});
 const body=group(root,'Body');
 lathe(body,velvet,[[.22,.76],[c.belly,.85],[c.belly+.015,1.04],[.31,1.26],[.27,1.4],[.16,1.44]], [0,0,0],.76);
 lathe(body,ivory,[[.105,1.38],[.115,1.48],[.12,1.52],[.095,1.53]], [0,0,0],.9);
 cloth(body,velvet,{top:c.belly,bottom:c.robe?.37:.39,height:c.robe?.78:.4,depth:.8,start:0,arc:Math.PI*2,y:.89,folds:10});
 if(c.skirt)cloth(body,ivory,{top:.31,bottom:.44,height:.64,depth:.9,start:0,arc:Math.PI*2,y:.73,folds:14});
 const hem=c.robe?.12:.49;
 ring(body,gold,[0,hem,0],c.robe?.37:.39,.009,[Math.PI/2,0,0]).scale.y=.8;
 embroidery(body,1.36,.075,c.belly*.77+.01);
 for(let i=0;i<5;i++)orb(body,gold,[0,.96+i*.08,c.belly*.77+.015],[.013,.013,.013]);
 lathe(body,leather,[[c.belly+.008,.83],[c.belly+.012,.84],[c.belly+.012,.91],[c.belly+.008,.92]],[0,0,0],.79);
 box(body,gold,[0,.875,c.belly*.8+.015],[.11,.085,.025]);
 box(body,leather,[0,.875,c.belly*.8+.03],[.065,.045,.01]);
 for(const side of [-1,1]){
  const leg=group(root,side<0?'LegLeft':'LegRight',[side*.137,.78,0]);
  orb(leg,leather,[0,-.18,0],[.13,.25,.13]);
  const knee=group(leg,'Knee',[0,-.37,0]);
  lathe(knee,leather,[[.095,-.31],[.1,-.05],[.14,0],[.14,.055],[.1,.06]], [0,0,0],.95);
  orb(knee,leather,[0,-.34,.065],[.12,.075,.195]);
  box(knee,gold,[0,-.11,.11],[.075,.05,.02]);
  const arm=group(root,side<0?'ArmLeft':'ArmRight',[side*.3,1.32,0]);arm.rotation.z=-side*.12;
  orb(arm,velvet,[side*.035,-.08,0],[.145,.16,.145]);
  orb(arm,ivory,[side*.055,-.24,0],[.11,.23,.11]);
  lathe(arm,velvet,[[.105,-.47],[.112,-.465],[.112,-.38],[.105,-.375]], [side*.055,0,0]);
  ring(arm,gold,[side*.055,-.39,0],.11,.008,[Math.PI/2,0,0]);
  const hand=group(arm,'Hand',[side*.055,-.52,0]);orb(hand,skin,[0,0,0],[.065,.085,.041]);
  for(let f=0;f<4;f++)orb(hand,skin,[(f-1.5)*.027,-.085+(f===0||f===3?.009:0),.008],[.014,.06,.018]);
  orb(hand,skin,[-side*.071,-.015,.02],[.026,.056,.023]);
  if(id==='guard')orb(arm,steel,[side*.03,-.02,0],[.19,.115,.18]);
 }
 const head=face(root,{...c,skin,hair});
 if(id==='scholar'){
  for(const side of [-1,1])ring(head,gold,[side*.09,.025,.223],.069,.006);
  curve(head,gold,[[-.02,.025,.223],[0,.04,.23],[.02,.025,.223]],.005);
  box(body,leather,[.32,.65,.01],[.17,.23,.075]);
  box(body,gold,[.32,.65,.053],[.12,.17,.009]);
 }
 if(id==='guard'){
  orb(body,steel,[0,1.16,.035],[.316,.242,.251]);
  for(const side of [-1,1])curve(body,gold,[[side*.2,.97,.2],[side*.24,1.18,.2],[side*.18,1.34,.2]],.009);
  orb(body,gold,[0,1.17,.29],[.041,.052,.009]);
 }
 if(id==='steward'){
  box(body,leather,[-.36,.65,.03],[.23,.21,.09]);box(body,gold,[-.36,.68,.082],[.05,.04,.013]);
  curve(body,leather,[[.21,1.35,.2],[-.08,1.05,.3],[-.35,.7,.1]],.025);
 }
 if(id==='bard'){
  orb(head,velvet,[.02,.27,0],[.3,.075,.255]);
  curve(head,ivory,[[-.16,.31,0],[-.23,.45,0],[-.28,.57,0]],.018);
  for(let i=0;i<6;i++)curve(head,ivory,[[-.16-i*.015,.32+i*.03,0],[-.23-i*.015,.36+i*.03,0]],.006);
  const lute=group(body,'Lute',[.12,.95,-.23]);lute.rotation.z=-.35;
  const wood=material('Lute wood','#986333',{roughness:.4});orb(lute,wood,[0,0,-.04],[.17,.23,.075]);
  box(lute,leather,[0,.3,-.03],[.045,.36,.035]);
  for(let i=0;i<4;i++)curve(lute,gold,[[(i-1.5)*.008,-.15,-.118],[(i-1.5)*.008,.48,-.055]],.0018);
 }
 if(id==='king'){
  // The crown stays hidden until the shared ceremony reaches its final phase.
  crown(root);
  for(const side of [-1,1])curve(body,gold,[[side*.26,1.38,.16],[side*.2,1.25,.25],[side*.26,1.05,.26]],.013);
 }
 return root;
}
function gift(id){
 const root=new T.Group();root.name=id;
 if(id==='glasses'){
  for(const side of [-1,1]){ring(root,gold,[side*.09,.025,.226],.072,.008);curve(root,gold,[[side*.162,.025,.226],[side*.218,.028,.14],[side*.225,.015,.015]],.006)}
  curve(root,gold,[[-.018,.025,.226],[0,.04,.238],[.018,.025,.226]],.006);
 }
 if(id==='ribbon'){
  const silk=material('Silk ribbon','#8c91b8',{side:T.DoubleSide,roughness:.35,sheen:1,sheenColor:new T.Color('#d6d4f0'),sheenRoughness:.4});
  for(const side of [-1,1]){
   const points=[new T.Vector2(0,0),new T.Vector2(.11,.09),new T.Vector2(.2,.095),new T.Vector2(.22,-.045),new T.Vector2(.11,-.07),new T.Vector2(0,0)];
   const shape=new T.Shape(points);const geo=new T.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.013,bevelThickness:.012});
   mesh(root,geo,silk,[0,1.385,.16],[side,1,1]);
   const tail=new T.Shape();tail.moveTo(0,0);tail.lineTo(.08,0);tail.lineTo(.11,-.23);tail.lineTo(.06,-.19);tail.lineTo(.015,-.24);tail.closePath();
   mesh(root,new T.ExtrudeGeometry(tail,{depth:.009,bevelEnabled:false}),silk,[side*.01,1.35,.17],[side,1,1]);
  }
  orb(root,silk,[0,1.39,.19],[.045,.048,.033]);
 }
 if(id==='cape'){
  const velvet=material('Royal velvet cape','#6d2537',{sheen:1,sheenColor:new T.Color('#aa6479'),sheenRoughness:.8});
  cloth(root,velvet,{top:.31,bottom:.56,height:1.22,depth:.9,start:.72,arc:Math.PI*2-1.44,y:1.4,folds:12});
  const fur=material('Ivory fur','#e9decb',{roughness:1,sheen:1,sheenColor:new T.Color('#fff9e7')});
  for(let i=0;i<28;i++){const a=.72+i/27*(Math.PI*2-1.44);orb(root,fur,[Math.sin(a)*.32,1.42,Math.cos(a)*.28],[.06,.048,.055]);}
  for(const side of [-1,1]){
   const edge=[];for(let i=0;i<=14;i++){const t=i/14,a=side*.72,r=.31+t*.25;edge.push([Math.sin(a)*r,1.39-t*1.21,Math.cos(a)*r*.9]);orb(root,fur,edge.at(-1),[.033,.055,.035]);}
   curve(root,gold,edge,.008);orb(root,gold,[side*.2,1.39,.25],[.04,.04,.012]);
  }
 }
 if(id==='flowers'){
  const paper=material('Bouquet wrap','#b98d81',{roughness:.92,side:T.DoubleSide}),green=material('Leaves','#667757'),pink=material('Rose petals','#d7a195',{roughness:.65,sheen:.4});
  const cream=material('Cream petals','#ead8b6',{roughness:.65});
  const g=group(root,'Bouquet',[-.37,.96,.27]);g.rotation.z=-.3;
  lathe(g,paper,[[.025,-.23],[.045,-.2],[.19,.1],[.2,.14]],[0,0,0],.85);
  for(let i=0;i<7;i++){const a=i*2.399,r=i===0?0:.11,x=Math.cos(a)*r,z=Math.sin(a)*r;
   curve(g,green,[[0,-.25,0],[x,.08,z],[x,.19,z]],.008);
   for(let j=0;j<7;j++){const b=j/7*Math.PI*2;const petal=orb(g,i%3?pink:cream,[x+Math.sin(b)*.035,.16+(i%2)*.05,z+Math.cos(b)*.035],[.035,.025,.05]);petal.rotation.y=b;}
   orb(g,i%3?pink:cream,[x,.18+(i%2)*.05,z],[.023,.025,.023]);
   orb(g,green,[x*1.5,.07,z*1.5],[.035,.075,.012]);
  }
  ring(g,gold,[0,-.13,0],.07,.009,[Math.PI/2,0,0]);
 }
 return root;
}
// Merge static parts by material within each joint: detailed shapes, bounded draw calls.
function optimize(g){
 for(const child of [...g.children])if(child.isGroup)optimize(child);
 const byMaterial=new Map();
 for(const child of [...g.children])if(child.isMesh){child.updateMatrix();const geo=child.geometry.clone().applyMatrix4(child.matrix);if(!byMaterial.has(child.material))byMaterial.set(child.material,[]);byMaterial.get(child.material).push(geo);g.remove(child);child.geometry.dispose();}
 for(const [mat,geos] of byMaterial){const combined=mergeGeometries(geos.map(geo=>{const result=geo.index?geo.toNonIndexed():geo;geo.dispose();return result}),false);const m=new T.Mesh(mergeVertices(combined,1e-5),mat);m.castShadow=m.receiveShadow=true;m.name=mat.name;g.add(m);geos.forEach(geo=>geo.dispose());}
}
const manifest={version:1,source:'Original parametric geometry; no external model data',characters:{},gifts:{}};
for(const [kind,ids] of [['characters',Object.keys(configs)],['gifts',['flowers','ribbon','cape','glasses']]])for(const id of ids){
 const scene=kind==='characters'?character(id):gift(id);optimize(scene);
 const binary=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:false});
 const file=`${id}.glb`;await writeFile(new URL(file,out),Buffer.from(binary));
 let meshes=0,triangles=0;scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3}});
 manifest[kind][id]={file,bytes:binary.byteLength,meshes,triangles};console.log(`${file}: ${Math.round(binary.byteLength/1024)} KB, ${meshes} meshes, ${triangles} triangles`);
}
await writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2));
