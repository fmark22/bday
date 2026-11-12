import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {Box3,Vector3} from 'three';
const manifest=JSON.parse(await readFile(new URL('../public/models/manifest.json',import.meta.url),'utf8'));
const loader=new GLTFLoader();let total=0;
for(const [category,entries] of Object.entries(manifest)){
 if(!['characters','gifts'].includes(category))continue;
 for(const [id,entry] of Object.entries(entries)){
  const bytes=await readFile(new URL('../public/models/'+entry.file,import.meta.url));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.byteLength);
  const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const result=await loader.parseAsync(buffer,'');
  let triangles=0;result.scene.traverse(object=>{if(!object.isMesh)return;const positions=object.geometry.attributes.position;assert.ok(positions.count>0);for(const n of positions.array)assert.ok(Number.isFinite(n),id+' has a finite vertex');triangles+=(object.geometry.index?.count??positions.count)/3;assert.ok(object.material.color,id+' has a material');});
  assert.equal(triangles,entry.triangles);assert.ok(bytes.length<1024*1024,id+' stays below 1 MB');total+=bytes.length;
  if(category==='characters'){
   for(const name of ['Head','ArmLeft','ArmRight','LegLeft','LegRight'])assert.ok(result.scene.getObjectByName(name),id+' has '+name);
   const size=new Box3().setFromObject(result.scene).getSize(new Vector3());assert.ok(size.y>1.7&&size.y<2.6,id+' has consistent world scale');
  }
  if(id==='king')assert.ok(result.scene.getObjectByName('Crown'));
 }
}
assert.ok(total<6*1024*1024,'All nine models fit within a 6 MB asset budget');
console.log(`PASS: nine GLBs parsed by Three.js; geometry, joints, materials, dimensions and asset budget checked (${(total/1024/1024).toFixed(2)} MB total).`);
