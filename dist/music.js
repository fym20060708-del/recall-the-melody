export const moods={warm:'温暖',happy:'快乐',nostalgic:'怀念',calm:'平静',sad:'遗憾',hope:'期待',melancholy:'忧郁',anxious:'焦虑',lonely:'孤独',excited:'兴奋',relieved:'释然'};
export const styles={piano:'舒缓钢琴',electronic:'轻快电子',ambient:'温柔氛围'};
export function hash(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export function compose(p){
 const seed=hash([p.story,p.story2,p.mood,p.mood2,p.style,p.ending,p.variation||0].join('|'));const rng=random(seed);
 const minor=['sad','nostalgic','melancholy','anxious','lonely'].includes(p.mood),scale=minor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11];
 const bpm=(p.style==='electronic'?104:p.style==='ambient'?72:84)+(['anxious','excited'].includes(p.mood)?10:['melancholy','lonely'].includes(p.mood)?-4:0),beat=60/bpm,bar=beat*4,bars=16;
 const root=60+seed%5,progress=[0,5,3,4],events={melody:[],harmony:[],bass:[],drums:[]};
 const motifs=Array.from({length:2},()=>Array.from({length:8},()=>Math.floor(rng()*8)));
 const note=(degree,oct=0)=>root+scale[((degree%7)+7)%7]+12*(Math.floor(degree/7)+oct);
 for(let b=0;b<bars;b++){
  const chord=progress[b%4],part=b<6?0:b<12?1:2,who=p.mode==='solo'?0:b<6?0:b<12?1:b%2;
  const mood=who?p.mood2:p.mood;const lift=['happy','hope','excited','relieved'].includes(mood)?2:['melancholy','lonely'].includes(mood)?-2:0;
  const density=p.style==='ambient'?4:8;const intensity=(p.ending==='rise'?.65+b/40:p.ending==='soft'?1-b/45:.8);
  for(let i=0;i<density;i++){
   if(i!==0&&i!==density-1&&rng()<(p.style==='ambient'?.25:.13))continue;
   let degree=motifs[who][i%8]+lift;if(i===0)degree=chord;if(b===15&&i===density-1)degree=0;
   events.melody.push({time:b*bar+i*bar/density+(mood==='anxious'&&i%2?beat*.12:0),note:note(degree,0),duration:beat*(mood==='anxious'?.45:p.style==='ambient'?1.6:.72),velocity:(.48+rng()*.25)*intensity,who,part});
  }
  for(const degree of [chord,chord+2,chord+4])events.harmony.push({time:b*bar,note:note(degree,-1),duration:bar*.94,velocity:.19*intensity});
  for(let i=0;i<4;i++)events.bass.push({time:b*bar+i*beat,note:note(chord,-2),duration:beat*.75,velocity:.48*intensity});
  for(let i=0;i<8;i++){events.drums.push({time:b*bar+i*beat/2,kind:'hat',duration:.065,velocity:.13*intensity});if(i%4===0)events.drums.push({time:b*bar+i*beat/2,kind:'kick',duration:.22,velocity:.55*intensity});if(i%4===2)events.drums.push({time:b*bar+i*beat/2,kind:'snare',duration:.15,velocity:.24*intensity})}
 }
 events.piano=events.melody.map(e=>({...e,velocity:e.velocity*.85}));
 events.violin=events.melody.filter((e,i)=>i%3===0).map(e=>({...e,note:e.note+12,duration:Math.min(beat*2.4,bars*bar-e.time),velocity:e.velocity*.62}));
 events.guitar=[];for(let b=0;b<bars;b++)for(let i=0;i<8;i++){const degree=progress[b%4]+[0,2,4,7,4,2,4,2][i];events.guitar.push({time:b*bar+i*beat/2,note:note(degree,-1),duration:beat*.9,velocity:.35})}
 return {seed,bpm,duration:bars*bar+2,events,style:p.style};
}
function tone(ctx,dest,e,track,style){
 if(['guitar','piano','violin'].includes(track)){instrument(ctx,dest,e,track);return}
 const gain=ctx.createGain(),t=e.time+.04,d=e.duration,vol=e.velocity*(track==='melody'?.20:track==='harmony'?.12:.23);gain.connect(dest);
 gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(vol,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+d);const f=440*2**((e.note-69)/12);
 const osc=ctx.createOscillator();osc.type=track==='bass'?'sine':style==='electronic'?'triangle':'sine';osc.frequency.value=f;osc.connect(gain);osc.start(t);osc.stop(t+d+.03);
 if(track!=='bass'){const overtone=ctx.createOscillator(),g=ctx.createGain();overtone.type='sine';overtone.frequency.value=f*(style==='piano'?2:1.003);g.gain.value=style==='piano'?.25:.35;overtone.connect(g).connect(gain);overtone.start(t);overtone.stop(t+d+.03)}
}
function instrument(ctx,dest,e,track){
 const t=e.time+.04,d=e.duration,f=440*2**((e.note-69)/12),g=ctx.createGain();g.connect(dest);
 const bowed=track==='violin',level=e.velocity*(bowed?.12:track==='piano'?.18:.13);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,level),t+(bowed?.14:.006));g.gain.exponentialRampToValueAtTime(Math.max(.00015,level*(bowed?.7:.25)),t+Math.max(.16,d*.65));g.gain.exponentialRampToValueAtTime(.0001,t+d+.18);
 const partials=track==='piano'?[1,.42,.18,.08,.04]:track==='guitar'?[1,.5,.32,.12,.08,.03]:[.65,.42,.27,.2,.11,.07];
 partials.forEach((amp,i)=>{const o=ctx.createOscillator(),a=ctx.createGain();o.frequency.value=f*(i+1)*(track==='piano'?1+i*.0008:1);a.gain.value=amp;o.connect(a).connect(g);if(bowed){const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=5.3;lg.gain.value=2.2*(i+1);lfo.connect(lg).connect(o.frequency);lfo.start(t);lfo.stop(t+d+.2)}o.start(t);o.stop(t+d+.2)})
}
function drum(ctx,dest,e,noise){const t=e.time+.04,g=ctx.createGain();g.connect(dest);g.gain.setValueAtTime(e.velocity*.22,t);g.gain.exponentialRampToValueAtTime(.0001,t+e.duration);
 if(e.kind==='kick'){const o=ctx.createOscillator();o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(42,t+.18);o.connect(g);o.start(t);o.stop(t+.24)}else{const s=ctx.createBufferSource(),filter=ctx.createBiquadFilter();s.buffer=noise;filter.type='highpass';filter.frequency.value=e.kind==='hat'?7000:1500;s.connect(filter).connect(g);s.start(t,0,e.duration)}
}
export async function render(score){const buffers={};for(const track of Object.keys(score.events)){
 const ctx=new OfflineAudioContext(2,Math.ceil(score.duration*22050),22050),out=ctx.createGain();out.gain.value=.85;out.connect(ctx.destination);
 const noise=ctx.createBuffer(1,22050,22050),data=noise.getChannelData(0),rng=random(score.seed);for(let i=0;i<data.length;i++)data[i]=rng()*2-1;
 for(const e of score.events[track])track==='drums'?drum(ctx,out,e,noise):tone(ctx,out,e,track,score.style);
 buffers[track]=await ctx.startRendering();
 }return buffers}
export class Player{
 constructor(){this.ctx=null;this.sources=[];this.gains={};this.position=0;this.started=0;this.playing=false;this.volume=.8}
 async play(buffers,enabled){const offset=this.position;this.halt();this.ctx??=new AudioContext();await this.ctx.resume();this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=128;this.analyser.smoothingTimeConstant=.8;this.master.connect(this.analyser).connect(this.ctx.destination);this.levels=new Uint8Array(this.analyser.frequencyBinCount);this.buffers=buffers;this.position=offset;this.started=this.ctx.currentTime;this.playing=true;
 for(const [track,buffer]of Object.entries(buffers)){const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;gain.gain.value=enabled[track]?1:0;source.connect(gain).connect(this.master);source.start(0,Math.min(offset,buffer.duration-.01));this.sources.push(source);this.gains[track]=gain}}
 toggle(track,on){if(this.gains[track])this.gains[track].gain.setTargetAtTime(on?1:0,this.ctx.currentTime,.025)}
 setVolume(v){this.volume=v;if(this.master)this.master.gain.setTargetAtTime(v,this.ctx.currentTime,.03)}
 get time(){return this.position+(this.playing?this.ctx.currentTime-this.started:0)}
 frequencies(){if(this.playing&&this.analyser){this.analyser.getByteFrequencyData(this.levels);return this.levels}return null}
 pause(){const t=this.time;this.halt();this.position=t}
 async seek(time,buffers,enabled){const was=this.playing;this.halt();this.position=Math.max(0,Math.min(time,Object.values(buffers)[0].duration-.01));if(was)await this.play(buffers,enabled)}
 halt(){for(const s of this.sources){try{s.stop()}catch{}}this.sources=[];if(this.master)this.master.disconnect();if(this.analyser)this.analyser.disconnect();this.playing=false;this.gains={}}
 stop(){this.halt();this.position=0}
}
export function wav(buffers,enabled){const first=Object.values(buffers)[0],n=first.length,ab=new ArrayBuffer(44+n*4),view=new DataView(ab);const str=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i))};str(0,'RIFF');view.setUint32(4,36+n*4,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,first.sampleRate,true);view.setUint32(28,first.sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,n*4,true);
 const tracks=Object.entries(buffers).filter(([k])=>enabled[k]).map(([,b])=>[b.getChannelData(0),b.getChannelData(1)]);for(let i=0;i<n;i++)for(let ch=0;ch<2;ch++){let v=0;for(const t of tracks)v+=t[ch][i];view.setInt16(44+(i*2+ch)*2,Math.max(-1,Math.min(1,v))*32767,true)}return new Blob([ab],{type:'audio/wav'})}
