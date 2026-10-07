/* ---- 최소 수학 라이브러리 (외부 의존성 없음) ---- */
const M4={
 id(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])},
 mul(o,a,b){const r=new Float32Array(16);for(let c=0;c<4;c++)for(let rr=0;rr<4;rr++){r[c*4+rr]=a[rr]*b[c*4]+a[4+rr]*b[c*4+1]+a[8+rr]*b[c*4+2]+a[12+rr]*b[c*4+3]}if(o){o.set(r);return o}return r},
 fromTRS(o,t,q,s){const[x,y,z,w]=q,x2=x+x,y2=y+y,z2=z+z,xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
  o[0]=(1-(yy+zz))*s[0];o[1]=(xy+wz)*s[0];o[2]=(xz-wy)*s[0];o[3]=0;
  o[4]=(xy-wz)*s[1];o[5]=(1-(xx+zz))*s[1];o[6]=(yz+wx)*s[1];o[7]=0;
  o[8]=(xz+wy)*s[2];o[9]=(yz-wx)*s[2];o[10]=(1-(xx+yy))*s[2];o[11]=0;
  o[12]=t[0];o[13]=t[1];o[14]=t[2];o[15]=1;return o},
 persp(fovy,asp,n,f){const t=1/Math.tan(fovy/2),o=new Float32Array(16);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o},
 lookAt(e,c,u){let zx=e[0]-c[0],zy=e[1]-c[1],zz=e[2]-c[2],l=Math.hypot(zx,zy,zz);zx/=l;zy/=l;zz/=l;
  let xx=u[1]*zz-u[2]*zy,xy=u[2]*zx-u[0]*zz,xz=u[0]*zy-u[1]*zx;l=Math.hypot(xx,xy,xz);xx/=l;xy/=l;xz/=l;
  const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
  return new Float32Array([xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*e[0]+xy*e[1]+xz*e[2]),-(yx*e[0]+yy*e[1]+yz*e[2]),-(zx*e[0]+zy*e[1]+zz*e[2]),1])},
 pos(m){return[m[12],m[13],m[14]]},
 rotQ(m){/* 스케일 무시 회전 추출 */const sx=Math.hypot(m[0],m[1],m[2]),sy=Math.hypot(m[4],m[5],m[6]),sz=Math.hypot(m[8],m[9],m[10]);
  const a=m[0]/sx,b=m[1]/sx,c=m[2]/sx,d=m[4]/sy,e=m[5]/sy,f=m[6]/sy,g=m[8]/sz,h=m[9]/sz,i=m[10]/sz;const tr=a+e+i;let q;
  if(tr>0){const s=Math.sqrt(tr+1)*2;q=[(f-h)/s,(g-c)/s,(b-d)/s,.25*s]}
  else if(a>e&&a>i){const s=Math.sqrt(1+a-e-i)*2;q=[.25*s,(d+b)/s,(g+c)/s,(f-h)/s]}
  else if(e>i){const s=Math.sqrt(1+e-a-i)*2;q=[(d+b)/s,.25*s,(h+f)/s,(g-c)/s]}
  else{const s=Math.sqrt(1+i-a-e)*2;q=[(g+c)/s,(h+f)/s,.25*s,(b-d)/s]}return q},
 xf(m,p){return[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]]}
};
const Q={
 mul(a,b){return[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]},
 inv(a){return[-a[0],-a[1],-a[2],a[3]]},
 axis(ax,ang){const s=Math.sin(ang/2);return ax==='x'?[s,0,0,Math.cos(ang/2)]:ax==='y'?[0,s,0,Math.cos(ang/2)]:[0,0,s,Math.cos(ang/2)]},
 euler(x,y,z){return Q.mul(Q.mul(Q.axis('y',y),Q.axis('x',x)),Q.axis('z',z))},
 rot(q,v){const[x,y,z,w]=q,ix=w*v[0]+y*v[2]-z*v[1],iy=w*v[1]+z*v[0]-x*v[2],iz=w*v[2]+x*v[1]-y*v[0],iw=-x*v[0]-y*v[1]-z*v[2];
  return[ix*w+iw*-x+iy*-z-iz*-y,iy*w+iw*-y+iz*-x-ix*-z,iz*w+iw*-z+ix*-y-iy*-x]},
 norm(q){const l=Math.hypot(q[0],q[1],q[2],q[3])||1;return[q[0]/l,q[1]/l,q[2]/l,q[3]/l]},
 slerp(a,b,t){let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];if(d<0){b=[-b[0],-b[1],-b[2],-b[3]];d=-d}
  if(d>.9995)return Q.norm([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,a[3]+(b[3]-a[3])*t]);
  const th=Math.acos(d),s=Math.sin(th),w1=Math.sin((1-t)*th)/s,w2=Math.sin(t*th)/s;return[a[0]*w1+b[0]*w2,a[1]*w1+b[1]*w2,a[2]*w1+b[2]*w2,a[3]*w1+b[3]*w2]},
 fromUnit(a,b){const d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2];if(d<-.999999){return[0,0,1,0]}
  return Q.norm([a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0],1+d])}
};
const V3={sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],len:a=>Math.hypot(a[0],a[1],a[2]),
 nrm(a){const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]},dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2]};
