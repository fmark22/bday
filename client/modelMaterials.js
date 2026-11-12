import * as THREE from 'three';

const treated=new WeakSet();
let weave,leather;
function grain(type){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const context=canvas.getContext('2d'),pixels=context.createImageData(128,128);
 let seed=37;
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  seed=(seed*16807)%2147483647;
  const random=seed/2147483647;
  const v=type==='weave'?110+((x%4<2)!==(y%4<2)?25:0)+random*12:115+random*28;
  const i=(y*128+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;
 }
 context.putImageData(pixels,0,0);
 const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(type==='weave'?6:3,type==='weave'?6:3);texture.anisotropy=4;
 return texture;
}
// Cached source materials are shared by clones of the same avatar.
export function refineModelMaterials(scene){
 scene.traverse(object=>{
  if(!object.isMesh)return;const material=object.material;if(treated.has(material))return;
  treated.add(material);material.envMapIntensity=.65;
  if(/velvet|woven|silk|wrap/i.test(material.name)){
   weave??=grain('weave');material.bumpMap=weave;material.bumpScale=/silk/i.test(material.name)?.0008:.0018;
  }else if(/leather/i.test(material.name)){
   leather??=grain('leather');material.bumpMap=leather;material.bumpScale=.002;
  }
  material.needsUpdate=true;
 });
}
