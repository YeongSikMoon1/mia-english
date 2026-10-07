/* ---- 아바타 컨트롤러: 자연스러운 상시 모션 + 제스처 + 립싱크 ---- */
const D2R=Math.PI/180;
class Avatar{
 constructor(m){this.m=m;this.t=0;this.speaking=false;this.env=0;this.listening=false;this.lis=0;this.pulse=0;
  this.blink=0;this.nextBlink=2;this.bs=-1;this.gx=0;this.gy=0;this.tgx=0;this.tgy=0;this.nextSac=1.2;
  this.vow={aa:0,ih:0,ou:0,ee:0,oh:0};this.cur='aa';this.ph=0;this.lastS=1;this.mood={happy:.18,relaxed:0,surprised:0,sad:0,angry:0};this.tmood={happy:.18,relaxed:0,surprised:0,sad:0,angry:0};this.post={hx:0,hz:0,sp:0,sh:0,bounce:0,laugh:0};this.tpost={hx:0,hz:0,sp:0,sh:0,bounce:0,laugh:0};this.em=null;this.gz=null;
  this.g=null;this.nod=null;this.beat=null;this.nextBeat=3;this.smQ={};this.sway=0}
 speak(on){this.speaking=on;if(on)this.pulse=1}
 listen(on){this.listening=on}
 setMood(o){this.tmood=Object.assign({happy:0,relaxed:0,surprised:0,sad:0,angry:0},o)}
 /* 감정 연기: 표정 + 몸짓(고개 기울임·숙임·들썩임) + 시선. dur초 뒤 평상시로 천천히 돌아온다. */
 emote(name,dur=3.2){const E={
   neutral:[{happy:.18},{}],
   joy:[{happy:.6},{hz:3,hx:-1,sp:-.8}],
   delight:[{happy:.95},{hz:5,hx:-2,sp:-1.4,bounce:1.2,laugh:.2}],
   laugh:[{happy:1},{hz:4,hx:-3,sp:-1,laugh:1}],
   sorry:[{sad:.5,relaxed:.1},{hx:8,sp:3,hz:-3}],
   worried:[{sad:.55,surprised:.12},{hx:3,hz:-6,sp:1}],
   surprise:[{surprised:1},{hx:-6,sp:-2.5}],
   panic:[{surprised:.8,sad:.45},{hx:-3,hz:4,sp:-1}],
   confused:[{surprised:.28,sad:.3},{hz:7,hx:-1}],
   thinking:[{relaxed:.25,happy:.05},{hz:-5,hx:-2}],
   cheeky:[{happy:.75,angry:.14},{hz:6,hx:1.5}],
   shy:[{relaxed:.45,happy:.4},{hx:4,hz:5}],
   proud:[{happy:.75},{hx:-4,sp:-2}],
   pout:[{angry:.35,sad:.2},{hx:3,hz:-3}]}[name]||[{happy:.18},{}];
  this.setMood(E[0]);this.tpost=Object.assign({hx:0,hz:0,sp:0,sh:0,bounce:0,laugh:0},E[1]);
  if(name==='thinking')this.gz={x:-7,y:-4};else if(name==='confused')this.gz={x:6,y:-3};else if(name==='shy'||name==='sorry')this.gz={x:5,y:5};else this.gz=null;
  this.em={name,t0:this.t,dur}}
 doNod(n=2){this.nod={t0:this.t,n}}
 doShake(){this.nod={t0:this.t,n:2,shake:true}}
 gesture(name,dur){this.g={name,t0:this.t,dur:dur||2.4}}
 env_(g){if(!g)return 0;const s=this.t-g.t0;if(s<0||s>g.dur)return 0;return Math.min(1,s/.4)*Math.min(1,(g.dur-s)/.5)}
 update(dt){
  dt=Math.min(dt,.05);this.t+=dt;const t=this.t,m=this.m,d=m.delta;
  const sm=(c,tg,k)=>c+(tg-c)*(1-Math.exp(-k*dt));
  this.env=sm(this.env,this.speaking?1:0,this.speaking?8:5);this.lis=sm(this.lis,this.listening?1:0,3);
  this.pulse*=Math.exp(-5*dt);this.pulseS=(this.pulseS||0)+(this.pulse-(this.pulseS||0))*(1-Math.exp(-9*dt));const e=this.env,l=this.lis,pu=this.pulseS;
  if(this.em&&t-this.em.t0>this.em.dur){this.em=null;this.gz=null;this.setMood({happy:.18});this.tpost={hx:0,hz:0,sp:0,sh:0,bounce:0,laugh:0}}
  for(const k in this.post)this.post[k]+=(this.tpost[k]-this.post[k])*(1-Math.exp(-5*dt));
  const P=this.post,lg=P.laugh*Math.sin(t*21);
  const br=Math.sin(t*1.5);/* 호흡 */
  /* ---- 몸통 ---- */
  d.hips=Q.euler(0,.7*D2R*Math.sin(t*.37),.5*D2R*Math.sin(t*.5));
  d.spine=Q.euler((.8*br-.4*e+P.sp+P.bounce*Math.sin(t*9)*.8)*D2R,-.4*D2R*Math.sin(t*.37),0);
  d.chest=Q.euler((1.2*br+lg*1.1)*D2R,.3*D2R*Math.sin(t*.45),0);
  d.upperChest=Q.euler(.8*br*D2R,0,0);
  /* ---- 머리 ---- */
  let hx=2*Math.sin(t*.42)+1*Math.sin(t*1.1+1)+e*(1.2*Math.sin(t*1.7)-.7*pu)+l*3;
  let hy=3.5*Math.sin(t*.31)+1.5*Math.sin(t*.83+2)+e*2*Math.sin(t*1.3);
  let hz=1.4*Math.sin(t*.27)+l*4+e*1.2*Math.sin(t*.9);
  if(this.nod){const s=t-this.nod.t0,T=.55*this.nod.n;if(s>T)this.nod=null;else{const w=Math.sin(s/T*Math.PI*this.nod.n)*Math.sin(s/T*Math.PI);if(this.nod.shake)hy+=9*w;else hx+=11*w}}
  if(l>.5&&Math.sin(t*.9)>.96)hx+=3;
  hx+=P.hx;hz+=P.hz;d.neck=Q.euler(hx*.4*D2R,hy*.4*D2R,hz*.4*D2R);d.head=Q.euler(hx*.6*D2R,hy*.6*D2R,hz*.6*D2R);
  /* ---- 시선(카메라 향함 + 미세 도약) ---- */
  this.nextSac-=dt;if(this.nextSac<0){this.nextSac=1.3+Math.random()*2.8;const c=Math.random()<.6;this.tgx=c?0:(Math.random()*2-1)*4;this.tgy=c?0:(Math.random()*2-1)*2.5}
  const gtx=this.gz?this.gz.x:this.tgx,gty=this.gz?this.gz.y:this.tgy;this.gx=sm(this.gx,gtx-hy*.3,16);this.gy=sm(this.gy,gty-hx*.3,16);
  d.leftEye=d.rightEye=Q.euler(this.gy*D2R,this.gx*D2R,0);
  /* ---- 눈 깜빡임 ---- */
  this.nextBlink-=dt;if(this.bs<0&&this.nextBlink<0){this.bs=0;this.dbl=Math.random()<.2}
  if(this.bs>=0){this.bs+=dt;const T=.2,x=this.bs/T;this.blink=x<.4?Math.sin(x/.4*Math.PI/2):x<1?Math.cos((x-.4)/.6*Math.PI/2):0;if(this.bs>=T){this.bs=-1;this.blink=0;this.nextBlink=this.dbl?.1:2.3+Math.random()*3.8}}
  /* ---- 팔(기본 자세) ---- */
  const idle={};const sway=Math.sin(t*.9);
  const arm=(s)=>{/* s=+1 왼쪽, -1 오른쪽 */const side=s>0?'left':'right';
   idle[side+'UpperArm']=Q.euler(0,s*-6*D2R,-s*(76+1.2*Math.sin(t*.8+s))*D2R);
   idle[side+'LowerArm']=Q.euler(0,s*-20*D2R+0,s*0);
   idle[side+'Hand']=Q.euler(0,0,-s*6*D2R);
   idle[side+'Shoulder']=Q.euler(0,0,s*(-1.2*br)*D2R)};
  arm(1);arm(-1);
  const fing=(side,s,curl,thumb)=>{for(const f of ['Index','Middle','Ring','Little']){const k=curl*(f==='Index'?.9:f==='Middle'?1:f==='Ring'?1.05:1.1);
    for(const j of['Proximal','Intermediate','Distal'])idle[side+f+j]=Q.axis('z',-s*k*(j==='Proximal'?.7:j==='Intermediate'?1:.6))}
   idle[side+'ThumbMetacarpal']=Q.euler(0,0,-s*thumb*.3);idle[side+'ThumbProximal']=Q.euler(0,0,-s*thumb*.5);idle[side+'ThumbDistal']=Q.euler(0,0,-s*thumb*.4)};
  fing('left',1,.35+.05*Math.sin(t*.7),.35);fing('right',-1,.35+.05*Math.sin(t*.7+1),.35);
  /* ---- 제스처 ---- */
  const pose={...idle};const ge=this.env_(this.g);
  if(ge>0){const s=t-this.g.t0,n=this.g.name;
   if(n==='wave'){const o=Math.sin(s*6.28*2.4);
    pose.leftUpperArm=Q.euler(0,-38*D2R,-(-12)*D2R*0+(-28*D2R)*-1*0-(-20)*D2R*0);
    pose.leftUpperArm=Q.mul(Q.axis('y',-35*D2R),Q.axis('z',-22*D2R));
    pose.leftLowerArm=Q.mul(Q.axis('z',(100+10*o)*D2R),Q.axis('x',-70*D2R));
    pose.leftHand=Q.axis('z',(8*o)*D2R);fing('left',1,.04,0);for(const k in idle)if(/^left(Index|Middle|Ring|Little|Thumb)/.test(k))pose[k]=idle[k]}
   if(n==='thumbs'){
    pose.leftUpperArm=Q.mul(Q.axis('y',-18*D2R),Q.axis('z',-34*D2R));
    pose.leftLowerArm=Q.mul(Q.axis('y',-68*D2R),Q.axis('x',-95*D2R));
    for(const f of['Index','Middle','Ring','Little'])for(const j of['Proximal','Intermediate','Distal'])pose['left'+f+j]=Q.axis('z',-(1.3)*(j==='Proximal'?.8:1));
    pose.leftThumbMetacarpal=Q.axis('z',.15);pose.leftThumbProximal=Q.axis('z',0);pose.leftThumbDistal=Q.axis('z',0);pose.leftHand=Q.axis('x',20*D2R)}
   if(n==='shrug'){pose.leftUpperArm=Q.mul(Q.axis('y',-14*D2R),Q.axis('z',-52*D2R));pose.rightUpperArm=Q.mul(Q.axis('y',14*D2R),Q.axis('z',52*D2R));pose.leftLowerArm=Q.mul(Q.axis('y',-70*D2R),Q.axis('x',-30*D2R));pose.rightLowerArm=Q.mul(Q.axis('y',70*D2R),Q.axis('x',30*D2R))}
  }
  /* 말할 때 자연스러운 손짓(비트 제스처) */
  if(e>.5&&ge<=0){this.nextBeat-=dt;if(!this.beat&&this.nextBeat<0){this.beat={t0:t,s:Math.random()<.5?1:-1,a:.6+Math.random()*.4};this.nextBeat=1.6+Math.random()*2.4}}
  if(this.beat){const s=t-this.beat.t0,T=.9;if(s>T)this.beat=null;else{const w=Math.sin(s/T*Math.PI),side=this.beat.s>0?'left':'right',k=this.beat.s,a=this.beat.a*w*e;
    pose[side+'UpperArm']=Q.mul(Q.axis('y',k*-26*D2R*a),Q.axis('z',-k*(76-26*a)*D2R));
    pose[side+'LowerArm']=Q.mul(Q.axis('y',k*-(20+55*a)*D2R),Q.axis('z',k*10*a*D2R*Math.sin(s*5)));
    pose[side+'Hand']=Q.axis('z',-k*(6-10*a)*D2R)}}
  /* 팔 포즈 부드럽게 보간(급변 방지) */
  for(const k in pose){const prev=this.smQ[k]||pose[k];this.smQ[k]=Q.slerp(prev,pose[k],1-Math.exp(-10*dt));d[k]=this.smQ[k]}
  /* ---- 표정 ---- */
  for(const k in this.mood)this.mood[k]=sm(this.mood[k],this.tmood[k]||0,7);
  const mv=this.mood;const idl=.05*Math.sin(t*.55)+.04*Math.sin(t*1.3+1);m.setExpr('happy',Math.max(0,Math.min(1,(mv.happy+.1*e+idl)*.85)));m.setExpr('relaxed',mv.relaxed*.8);m.setExpr('surprised',Math.min(1,mv.surprised+.07*pu));m.setExpr('sad',mv.sad);m.setExpr('angry',mv.angry);
  m.setExpr('blink',Math.min(1,this.blink));
  /* ---- 립싱크: 음절 리듬 + 모음 전환 ---- */
  const VOW=['aa','oh','ee','ih','ou','aa','oh'];
  this.ph+=dt*(3.6+.8*Math.sin(t*.7));const sn=Math.sin(this.ph*Math.PI*2);
  if(sn>0&&this.lastS<=0){this.cur=VOW[(Math.random()*VOW.length)|0]}this.lastS=sn;
  const amp=e*((sn*.5+.5)**1.2*.55+.12*pu+.08)*(.8+.2*Math.sin(t*2.1));
  const lm=P.laugh>.05?P.laugh*(.35+.3*Math.sin(t*21)):0;for(const v in this.vow){const tg=(v===this.cur?amp:0)+(v==='aa'?lm:0);this.vow[v]=sm(this.vow[v],tg,v===this.cur?16:12);m.setExpr(v,Math.min(1,this.vow[v]))}
 }
}
