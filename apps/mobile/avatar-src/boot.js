/* WebView 안에서 Mia(3D)만 그리는 부트 코드. React Native와는 postMessage(JSON)로만 통신한다. */
const cv=document.getElementById('cv');let gl=null,model=null,av=null,speaking=false,pulseIv=null;
const AP={ey:1.38,ez:1.6,cy:1.34,fov:28};   // 대화 중 줌업(상반신) 카메라
const send=o=>{try{window.ReactNativeWebView?window.ReactNativeWebView.postMessage(JSON.stringify(o)):parent!==window&&parent.postMessage(o,'*')}catch(e){}};
function fit(){const dpr=Math.min(devicePixelRatio||1,2),r=cv.getBoundingClientRect();cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr)}
async function start(buf){
  gl=cv.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:false});if(!gl)throw new Error('WebGL2 미지원');
  fit();addEventListener('resize',fit);
  model=await loadVRM(gl,buf);av=new Avatar(model);window.av=av;model.scaleEyes(window.EYE_SCALE||1);
  let last=performance.now();
  (function loop(now){const dt=Math.min((now-last)/1000,.1);last=now;av.update(dt);model.applyPose();model.updateWorld();model.stepSprings(dt);
    gl.viewport(0,0,cv.width,cv.height);gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const t=av.t,asp=cv.width/cv.height;const V=M4.lookAt([.03*Math.sin(t*.4),AP.ey+.01*Math.sin(t*.3),AP.ez],[0,AP.cy,0],[0,1,0]);
    model.render(M4.mul(null,M4.persp(AP.fov*D2R,asp,.05,20),V));requestAnimationFrame(loop)})(last);
  send({type:'ready'});
}
window.loadMia=async b64=>{try{const bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);await start(u.buffer)}catch(e){send({type:'error',message:String(e)})}};
/* 모델 로딩: 앱이 window.__VRM_URL__(로컬 파일 경로)을 미리 넣어 주거나, 개발 중에는 ?vrm=Mia.vrm */
const q=window.__VRM_URL__||new URLSearchParams(location.search).get('vrm');if(q)fetch(q).then(r=>r.arrayBuffer()).then(start).catch(e=>send({type:'error',message:String(e)}));
/* 말하는 동안 입 모양(립싱크) 펄스: TTS가 단어 경계 이벤트를 주지 않는 플랫폼에서도 동작하도록 타이머로 구동 */
function setSpeaking(on){speaking=!!on;if(av){av.speak(on);if(on)av.listen(false)}clearInterval(pulseIv);if(on)pulseIv=setInterval(()=>{if(av)av.pulse=1},430)}
const handlers={
  speak:m=>setSpeaking(m.on),
  pulse:()=>{if(av)av.pulse=1},
  listen:m=>av&&av.listen(!!m.on),
  mood:m=>av&&av.setMood(m.mood||{}),
  emote:m=>av&&av.emote(m.name,m.dur||3.2),
  gesture:m=>av&&av.gesture(m.name,m.dur||2.4),
  nod:m=>av&&av.doNod(m.n||1),
  shake:()=>av&&av.doShake(),
  camera:m=>Object.assign(AP,m.cam||{}),
};
function onMsg(e){let m=e.data;if(typeof m==='string'){try{m=JSON.parse(m)}catch(_){return}}if(m&&handlers[m.type])handlers[m.type](m)}
addEventListener('message',onMsg);document.addEventListener('message',onMsg);   // iOS / Android WebView 둘 다
