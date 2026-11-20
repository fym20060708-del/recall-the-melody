// Audio-reactive star orbits. No timers or sound generation in the drawing layer.
export function drawConstellation(canvas,{levels,progress=0,time=0,playing=false,color='#39c9ef',reduced=false}){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=rect.width,h=rect.height;if(!w||!h)return;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
 const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const cx=w/2,cy=h/2,r=Math.min(w*.35,h*.37),rgb=color.slice(1).match(/../g).map(n=>parseInt(n,16)).join(','),energy=levels?levels.reduce((a,b)=>a+b,0)/levels.length/255:0,phase=reduced?0:time;
 const glow=ctx.createRadialGradient(cx,cy,20,cx,cy,r*1.7);glow.addColorStop(0,`rgba(${rgb},${.1+energy*.18})`);glow.addColorStop(.55,`rgba(${rgb},.04)`);glow.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 for(let i=0;i<42;i++){const x=(i*73.7+19)%w,y=(i*53.3+8)%h;ctx.fillStyle=`rgba(${rgb},${.13+(Math.sin(phase*.4+i)+1)*.09})`;ctx.beginPath();ctx.arc(x,y,i%5===0?1.4:.7,0,Math.PI*2);ctx.fill()}
 // Two crossing orbit planes and their floating musical satellites.
 for(let k=0;k<3;k++){ctx.save();ctx.translate(cx,cy);ctx.rotate([-.36,.4,0][k]);ctx.scale(1,[.53,.72,1][k]);ctx.strokeStyle=`rgba(${rgb},${k===2?.16:.24})`;ctx.lineWidth=.7;ctx.beginPath();ctx.arc(0,0,r*(1.22-k*.11),0,Math.PI*2);ctx.stroke();ctx.restore();
  const a=phase*(playing?.24:.06)*(k%2?-1:1)+k*2.1,rad=r*(1.22-k*.11),tilt=[-.36,.4,0][k],x=Math.cos(a)*rad,y=Math.sin(a)*rad*[.53,.72,1][k],px=cx+x*Math.cos(tilt)-y*Math.sin(tilt),py=cy+x*Math.sin(tilt)+y*Math.cos(tilt);
  ctx.shadowColor=color;ctx.shadowBlur=playing?12:5;ctx.fillStyle=color;ctx.font=`${k===1?19:15}px Georgia`;ctx.fillText(['♪','♫','♩'][k],px-6,py+5);ctx.shadowBlur=0;
 }
 // The luminous progress ring begins at twelve o'clock.
 ctx.lineWidth=2;ctx.strokeStyle=`rgba(${rgb},.12)`;ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,Math.PI*1.5);ctx.stroke();
 ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=12;ctx.lineWidth=2.4;ctx.lineCap='round';ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();
 const a=-Math.PI/2+Math.PI*2*progress;ctx.fillStyle='#e9fcff';ctx.beginPath();ctx.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r,3.7,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
 // Frequency petals: each ray follows a real analyser bin, mirrored around the orbit.
 for(let i=0;i<80;i++){const a=i/80*Math.PI*2,v=levels?levels[Math.min(63,Math.floor((i<40?i:79-i)*1.6))]/255:0,baseline=3+Math.sin(i*.65)**2*3,len=reduced?5:baseline+v*25;const ri=r-13;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*ri,cy+Math.sin(a)*ri);ctx.lineTo(cx+Math.cos(a)*(ri-len),cy+Math.sin(a)*(ri-len));ctx.strokeStyle=`rgba(${rgb},${.18+v*.75})`;ctx.lineWidth=1.8;ctx.stroke()}
 ctx.beginPath();ctx.arc(cx,cy,r*.45,0,Math.PI*2);ctx.strokeStyle=`rgba(${rgb},.15)`;ctx.lineWidth=1;ctx.stroke();
 if(playing&&!reduced)for(let j=0;j<2;j++){const wave=((phase*.32+j*.5)%1);ctx.beginPath();ctx.arc(cx,cy,35+wave*r*.42,0,Math.PI*2);ctx.strokeStyle=`rgba(${rgb},${(1-wave)*energy*.4})`;ctx.stroke()}
}
export function orbitPosition(clientX,clientY,rect,duration){let angle=Math.atan2(clientY-(rect.top+rect.height/2),clientX-(rect.left+rect.width/2))+Math.PI/2;if(angle<0)angle+=Math.PI*2;return Math.min(duration-.01,angle/(2*Math.PI)*duration)}
