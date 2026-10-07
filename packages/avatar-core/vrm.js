/* ---- GLB/VRM 1.0 로더 + 스키닝 + 모프 + 스프링본 + MToon 근사 렌더러 ---- */
async function loadVRM(gl,buf){
 const dv=new DataView(buf);let off=12,J,BIN;
 while(off<buf.byteLength){const l=dv.getUint32(off,true),t=dv.getUint32(off+4,true);
  if(t===0x4E4F534A)J=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,off+8,l)));else if(t===0x004E4942)BIN=new Uint8Array(buf,off+8,l);off+=8+l}
 const ext=J.extensions,vrm=ext.VRMC_vrm,sbExt=ext.VRMC_springBone;
 const CT={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},NC={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
 function acc(i){const a=J.accessors[i],bv=J.bufferViews[a.bufferView],T=CT[a.componentType],n=NC[a.type],es=T.BYTES_PER_ELEMENT*n,stride=bv.byteStride||es;
  const base=(bv.byteOffset||0)+(a.byteOffset||0);const out=new T(a.count*n);
  if(stride===es){out.set(new T(BIN.buffer.slice(BIN.byteOffset+base,BIN.byteOffset+base+a.count*es)))}
  else{const src=new DataView(BIN.buffer,BIN.byteOffset);for(let k=0;k<a.count;k++)for(let c=0;c<n;c++){const p=base+k*stride+c*T.BYTES_PER_ELEMENT;
   out[k*n+c]=T===Float32Array?src.getFloat32(p,true):T===Uint16Array?src.getUint16(p,true):T===Uint32Array?src.getUint32(p,true):T===Uint8Array?src.getUint8(p):src.getInt16(p,true)}}
  return{data:out,n,count:a.count,ct:a.componentType}}
 /* 노드 */
 const N=J.nodes,nn=N.length,parent=new Int32Array(nn).fill(-1);
 N.forEach((n,i)=>(n.children||[]).forEach(c=>parent[c]=i));
 const lt=N.map(n=>n.translation?n.translation.slice():[0,0,0]),lr=N.map(n=>n.rotation?n.rotation.slice():[0,0,0,1]),ls=N.map(n=>n.scale?n.scale.slice():[1,1,1]);
 const restR=lr.map(q=>q.slice()),restT=lt.map(t=>t.slice());
 const order=[];function visit(i){order.push(i);(N[i].children||[]).forEach(visit)}J.scenes[J.scene].nodes.forEach(visit);
 const wm=N.map(()=>M4.id());
 function updateWorld(){for(const i of order){M4.fromTRS(wm[i],lt[i],lr[i],ls[i]);if(parent[i]>=0)M4.mul(wm[i],wm[parent[i]],wm[i])}}
 updateWorld();
 const restW=wm.map(m=>M4.rotQ(m));
 /* 휴머노이드 */
 const hb={};for(const k in vrm.humanoid.humanBones)hb[k]=vrm.humanoid.humanBones[k].node;
 const delta={};/* 정규화 공간의 회전(휴식 자세 기준) */
 const nodeToBone={};for(const k in hb)nodeToBone[hb[k]]=k;
 function applyPose(){for(const k in hb){const n=hb[k],d=delta[k]||[0,0,0,1],p=parent[n];const pr=p>=0?restW[p]:[0,0,0,1];
   lr[n]=Q.mul(Q.mul(Q.mul(Q.inv(pr),d),pr),restR[n])}}
 /* 텍스처 */
 const tex=[];const imgs=J.images;
 const bmps=await Promise.all(imgs.map(async im=>{const bv=J.bufferViews[im.bufferView];const blob=new Blob([BIN.slice(bv.byteOffset||0,(bv.byteOffset||0)+bv.byteLength)],{type:im.mimeType});return createImageBitmap(blob,{premultiplyAlpha:'none',colorSpaceConversion:'none'})}));
 const glTex=bmps.map(b=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,b);gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);b.close&&b.close();return t});
 const texOf=ti=>ti==null?null:glTex[J.textures[ti.index].source];
 const white=(()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);return t})();
 const black=(()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);return t})();
 /* 머티리얼 */
 const mats=J.materials.map(m=>{const mt=(m.extensions||{}).VRMC_materials_mtoon||{},pbr=m.pbrMetallicRoughness||{};
  return{name:m.name,mode:m.alphaMode||'OPAQUE',cut:m.alphaCutoff??.5,dbl:!!m.doubleSided,base:pbr.baseColorFactor||[1,1,1,1],baseTex:texOf(pbr.baseColorTexture),
   shade:mt.shadeColorFactor||[1,1,1],shadeTex:texOf(mt.shadeMultiplyTexture)||texOf(pbr.baseColorTexture),shift:mt.shadingShiftFactor??0,toony:mt.shadingToonyFactor??.9,
   emi:m.emissiveFactor||[0,0,0],emiTex:texOf(m.emissiveTexture),rq:mt.renderQueueOffsetNumber||0,zw:!!mt.transparentWithZWrite,
   outW:mt.outlineWidthMode==='worldCoordinates'?(mt.outlineWidthFactor||0):0,outC:mt.outlineColorFactor||[0,0,0],outTex:texOf(mt.outlineWidthMultiplyTexture)}});
 /* 메시/프리미티브 */
 const prims=[];
 N.forEach((n,ni)=>{if(n.mesh==null)return;const mesh=J.meshes[n.mesh];
  mesh.primitives.forEach((p,pi)=>{const A=p.attributes,pos=acc(A.POSITION),nor=acc(A.NORMAL),uv=acc(A.TEXCOORD_0),jn=acc(A.JOINTS_0),wt=acc(A.WEIGHTS_0),idx=acc(p.indices);
   const pr={node:ni,skin:n.skin,mat:mats[p.material],pos:pos.data,basePos:pos.data.slice(),count:pos.count,idx:idx.data,idxCt:idx.ct,idxN:idx.count,targets:null};
   if(p.targets)pr.targets=p.targets.map(t=>acc(t.POSITION).data);
   const vao=gl.createVertexArray();gl.bindVertexArray(vao);
   const mk=(data,loc,size,type,isInt)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);
    isInt?gl.vertexAttribIPointer(loc,size,type,0,0):gl.vertexAttribPointer(loc,size,type,false,0,0);return b};
   pr.posBuf=mk(pos.data,0,3,gl.FLOAT);pr.norBuf=mk(nor.data,1,3,gl.FLOAT);mk(uv.data,2,2,gl.FLOAT);
   mk(jn.ct===5121?jn.data:new Uint16Array(jn.data),3,4,jn.ct===5121?gl.UNSIGNED_BYTE:gl.UNSIGNED_SHORT,true);mk(wt.data,4,4,gl.FLOAT);
   const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idx.data,gl.STATIC_DRAW);
   pr.vao=vao;pr.order=prims.length;prims.push(pr)})});
 gl.bindVertexArray(null);
 /* 스킨 */
 const skins=J.skins.map(s=>{const ibm=acc(s.inverseBindMatrices).data,jt=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,jt);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,4,s.joints.length,0,gl.RGBA,gl.FLOAT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  return{joints:s.joints,ibm,tex:jt,buf:new Float32Array(s.joints.length*16)}});
 /* 표정 */
 const expr={};for(const k in vrm.expressions.preset)expr[k]={binds:vrm.expressions.preset[k].morphTargetBinds||[],w:0,tw:0};
 const exprNodes={};
 let morphDirty=true;
 function applyMorph(){if(!morphDirty)return;morphDirty=false;
  for(const pr of prims){if(!pr.targets)continue;const w=new Float32Array(pr.targets.length);let any=false;
   for(const k in expr){const e=expr[k];if(e.w<.001)continue;for(const b of e.binds){if(b.node===pr.node){w[b.index]+=b.weight*e.w;any=true}}}
   pr.pos.set(pr.basePos);if(any)for(let t=0;t<w.length;t++){if(w[t]<.001)continue;const tg=pr.targets[t],ww=w[t];for(let i=0;i<pr.pos.length;i++)pr.pos[i]+=tg[i]*ww}
   gl.bindBuffer(gl.ARRAY_BUFFER,pr.posBuf);gl.bufferSubData(gl.ARRAY_BUFFER,0,pr.pos)}}
 /* 눈 키우기: 눈 관련 프리미티브(흰자·눈동자·하이라이트·아이라인·속눈썹)를 눈 중심 기준으로 XY 확대. 모프 변화량도 같은 비율로 키워 깜빡임이 어긋나지 않게 한다. */
 function scaleEyes(sc){
  const ey=prims.filter(p=>/Eye(White|Iris|Highlight|line|lash)/i.test(p.mat.name||''));const wh=ey.find(p=>/EyeWhite/i.test(p.mat.name||''));if(!wh)return;
  if(!scaleEyes.done){scaleEyes.done=ey.map(p=>({p,base:p.basePos.slice(),tg:(p.targets||[]).map(t=>t.slice())}))}
  const cs=[0,0,0,0,0,0];{const b=scaleEyes.done.find(o=>o.p===wh).base;let n=[0,0];for(let i=0;i<wh.count;i++){const k=b[3*i]>0?0:1;cs[k*3]+=b[3*i];cs[k*3+1]+=b[3*i+1];cs[k*3+2]+=b[3*i+2];n[k]++}for(let k=0;k<2;k++)for(let j=0;j<3;j++)cs[k*3+j]/=Math.max(1,n[k])}
  for(const o of scaleEyes.done){const p=o.p;for(let i=0;i<p.count;i++){const k=o.base[3*i]>0?0:1,cx=cs[k*3],cy=cs[k*3+1];
    p.basePos[3*i]=cx+sc*(o.base[3*i]-cx);p.basePos[3*i+1]=cy+sc*(o.base[3*i+1]-cy)}
   (p.targets||[]).forEach((t,ti)=>{const b=o.tg[ti];for(let i=0;i<p.count;i++){t[3*i]=b[3*i]*sc;t[3*i+1]=b[3*i+1]*sc}})}
  morphDirty=true}
 function setExpr(name,v){const e=expr[name];if(e&&Math.abs(e.w-v)>.002){e.w=v;morphDirty=true}}
 /* 스프링본 */
 const colG=(sbExt.colliderGroups||[]).map(g=>g.colliders.map(ci=>sbExt.colliders[ci]));
 const springs=(sbExt.springs||[]).map(sp=>{const js=sp.joints.map(j=>({node:j.node,hit:j.hitRadius||0,stiff:j.stiffness??1,gp:j.gravityPower||0,gd:j.gravityDir||[0,-1,0],drag:j.dragForce??.4}));
  const cols=[].concat(...(sp.colliderGroups||[]).map(gi=>colG[gi]));
  const chain=[];for(let i=0;i<js.length;i++){const nd=js[i].node;const child=js[i+1]?js[i+1].node:((N[nd].children||[])[0]);
   if(child==null)continue;const ct=lt[child],len=Math.hypot(ct[0],ct[1],ct[2])||.05;
   chain.push({...js[i],child,axis:V3.nrm(ct),len,lr0:restR[nd].slice(),cur:null,prev:null})}
  return{chain,cols}});
 let springInit=false;
 function colWorld(c){const m=wm[c.node],sh=c.shape;if(sh.sphere){return{t:'s',a:M4.xf(m,sh.sphere.offset),r:sh.sphere.radius}}
  if(sh.capsule){return{t:'c',a:M4.xf(m,sh.capsule.offset),b:M4.xf(m,sh.capsule.tail),r:sh.capsule.radius}}return null}
 let sacc=0;function stepSprings(dt){sacc+=dt;if(sacc>.2)sacc=.05;let n=0;while(sacc>=1/60&&n<3){stepOnce(1/60);sacc-=1/60;n++}}
 function stepOnce(dt){if(!springInit){for(const s of springs)for(const j of s.chain){const p=M4.pos(wm[j.child]);j.cur=p.slice();j.prev=p.slice()}springInit=true}
  dt=Math.min(dt,1/30);
  for(const s of springs){const cols=s.cols.map(colWorld).filter(Boolean);
   for(const j of s.chain){const nd=j.node,pa=parent[nd];const pw=pa>=0?M4.rotQ(wm[pa]):[0,0,0,1];const headP=M4.pos(wm[nd]);
    const baseQ=Q.mul(pw,j.lr0);const axisW=Q.rot(baseQ,j.axis);
    let nt=V3.add(j.cur,V3.add(V3.mul(V3.sub(j.cur,j.prev),1-j.drag),V3.add(V3.mul(axisW,j.stiff*dt),V3.mul(V3.nrm(j.gd),j.gp*dt))));
    let d=V3.sub(nt,headP);nt=V3.add(headP,V3.mul(V3.nrm(d),j.len));
    for(const c of cols){const rad=c.r+j.hit;let q=c.a;if(c.t==='c'){const ab=V3.sub(c.b,c.a),t=Math.max(0,Math.min(1,V3.dot(V3.sub(nt,c.a),ab)/(V3.dot(ab,ab)||1)));q=V3.add(c.a,V3.mul(ab,t))}
     const dd=V3.sub(nt,q),dl=V3.len(dd);if(dl<rad){nt=V3.add(q,V3.mul(V3.nrm(dd),rad));d=V3.sub(nt,headP);nt=V3.add(headP,V3.mul(V3.nrm(d),j.len))}}
    j.prev=j.cur;j.cur=nt;
    const dl=Q.rot(Q.inv(baseQ),V3.nrm(V3.sub(nt,headP)));lr[nd]=Q.mul(j.lr0,Q.fromUnit(j.axis,dl));
    M4.fromTRS(wm[nd],lt[nd],lr[nd],ls[nd]);if(pa>=0)M4.mul(wm[nd],wm[pa],wm[nd]);
    /* 자식 월드 갱신 */(function upd(i){for(const c of (N[i].children||[])){M4.fromTRS(wm[c],lt[c],lr[c],ls[c]);M4.mul(wm[c],wm[i],wm[c]);upd(c)}})(nd)}}}
 /* 셰이더 */
 const VS=`#version 300 es
 layout(location=0)in vec3 aP;layout(location=1)in vec3 aN;layout(location=2)in vec2 aUv;layout(location=3)in uvec4 aJ;layout(location=4)in vec4 aW;
 uniform sampler2D uJ;uniform mat4 uVP;uniform float uOut;
 out vec3 vN;out vec2 vUv;
 mat4 jm(uint i){int r=int(i);return mat4(texelFetch(uJ,ivec2(0,r),0),texelFetch(uJ,ivec2(1,r),0),texelFetch(uJ,ivec2(2,r),0),texelFetch(uJ,ivec2(3,r),0));}
 void main(){mat4 s=aW.x*jm(aJ.x)+aW.y*jm(aJ.y)+aW.z*jm(aJ.z)+aW.w*jm(aJ.w);
  vec3 n=normalize(mat3(s)*aN);vec4 p=s*vec4(aP,1.);p.xyz+=n*uOut;vN=n;vUv=aUv;gl_Position=uVP*p;}`;
 const FS=`#version 300 es
 precision highp float;in vec3 vN;in vec2 vUv;out vec4 o;
 uniform sampler2D uB,uS,uE;uniform vec4 uBase;uniform vec3 uShade,uEmi,uOutC;uniform float uCut,uShift,uToony;uniform int uMode,uPass;uniform vec3 uL;
 void main(){vec4 t=texture(uB,vUv)*uBase;if(uMode==1&&t.a<uCut)discard;
  if(uPass==1){o=vec4(uOutC,1.);return;}
  vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
  float nl=dot(n,uL);float lo=-1.+uToony,hi=1.-uToony;float s=clamp((nl+uShift-lo)/max(hi-lo,1e-4),0.,1.);
  vec3 lit=t.rgb,sh=uShade*texture(uS,vUv).rgb;vec3 c=mix(sh,lit,s)+uEmi*texture(uE,vUv).rgb;
  o=vec4(c,uMode==2?t.a:1.);}`;
 const cs=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(x));return x};
 const prog=gl.createProgram();gl.attachShader(prog,cs(gl.VERTEX_SHADER,VS));gl.attachShader(prog,cs(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog));
 const U={};['uJ','uVP','uOut','uB','uS','uE','uBase','uShade','uEmi','uOutC','uCut','uShift','uToony','uMode','uPass','uL'].forEach(n=>U[n]=gl.getUniformLocation(prog,n));
 const mode=m=>m.mode==='MASK'?1:m.mode==='BLEND'?2:0;
 const opaque=prims.filter(p=>p.mat.mode!=='BLEND'),blend=prims.filter(p=>p.mat.mode==='BLEND').sort((a,b)=>a.mat.rq-b.mat.rq||a.order-b.order);
 function drawPrim(pr,pass){const m=pr.mat,sk=skins[pr.skin];gl.bindVertexArray(pr.vao);
  gl.uniform4fv(U.uBase,m.base);gl.uniform3fv(U.uShade,m.shade);gl.uniform3fv(U.uEmi,m.emi);gl.uniform3fv(U.uOutC,m.outC);gl.uniform1f(U.uCut,m.cut);gl.uniform1f(U.uShift,m.shift);gl.uniform1f(U.uToony,m.toony);
  gl.uniform1i(U.uMode,mode(m));gl.uniform1i(U.uPass,pass);gl.uniform1f(U.uOut,pass?m.outW:0);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,m.baseTex||white);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,m.shadeTex||white);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,m.emiTex||black);
  gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,sk.tex);
  gl.drawElements(gl.TRIANGLES,pr.idxN,pr.idxCt===5125?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT,0)}
 function render(VP){
  updateWorld();/* 포즈 적용 후 호출 */
  gl.useProgram(prog);gl.uniformMatrix4fv(U.uVP,false,VP);gl.uniform1i(U.uB,0);gl.uniform1i(U.uS,1);gl.uniform1i(U.uE,2);gl.uniform1i(U.uJ,3);gl.uniform3fv(U.uL,V3.nrm([.35,.55,.75]));
  skins.forEach((sk,si)=>{for(let k=0;k<sk.joints.length;k++){const m=M4.mul(null,wm[sk.joints[k]],sk.ibm.subarray(k*16,k*16+16));sk.buf.set(m,k*16)}
   gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,sk.tex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,4,sk.joints.length,gl.RGBA,gl.FLOAT,sk.buf)});
  applyMorph();
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  /* 외곽선(뒷면만) */
  gl.enable(gl.CULL_FACE);gl.cullFace(gl.FRONT);gl.disable(gl.BLEND);gl.depthMask(true);
  for(const p of opaque)if(p.mat.outW>0)drawPrim(p,1);
  gl.disable(gl.CULL_FACE);
  for(const p of opaque){if(!p.mat.dbl){gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK)}else gl.disable(gl.CULL_FACE);drawPrim(p,0)}
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  for(const p of blend){gl.depthMask(p.mat.zw);if(!p.mat.dbl){gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK)}else gl.disable(gl.CULL_FACE);drawPrim(p,0)}
  gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.bindVertexArray(null)}
 return{J,hb,delta,applyPose,updateWorld,stepSprings,render,setExpr,scaleEyes,expr,lt,lr,wm,parent,restR,restW,nodeToBone,N,
  boneWorldPos(b){return M4.pos(wm[hb[b]])}}}
