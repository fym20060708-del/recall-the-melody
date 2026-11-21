export const moods={warm:'温暖',happy:'快乐',nostalgic:'怀念',calm:'平静',sad:'遗憾',hope:'期待',melancholy:'忧郁',anxious:'焦虑',lonely:'孤独',excited:'兴奋',relieved:'释然'};
import {normalizeMix,gainAt,gainPoints} from './mix.js';
export const styles={piano:'舒缓钢琴',electronic:'轻快电子',ambient:'温柔氛围',rnb:'R&B 律动',folk:'民谣',ballad:'抒情芭乐',rock:'摇滚'};
export const endings={soft:'轻轻落下',rise:'带着期待',steady:'留在此刻',resolve:'圆满落幕'};
const styleTempo={piano:84,electronic:104,ambient:72,rnb:88,folk:92,ballad:76,rock:118};
export function hash(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export function compose(p){
 const seed=hash([p.story,p.story2,p.mood,p.mood2,p.style,p.ending,p.variation||0].join('|'));const rng=random(seed);
 const minor=['sad','nostalgic','melancholy','anxious','lonely'].includes(p.mood),scale=minor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11];
 const natural=(styleTempo[p.style]||84)+(['anxious','excited'].includes(p.mood)?10:['melancholy','lonely'].includes(p.mood)?-4:0),bpm=typeof p.tempo==='number'&&Number.isFinite(p.tempo)?Math.max(60,Math.min(150,Math.round(p.tempo))):natural,beat=60/bpm,bar=beat*4,bars=16;
 const root=60+seed%5,progress=[0,5,3,4],events={melody:[],harmony:[],bass:[],drums:[]};
 const motifs=Array.from({length:2},()=>Array.from({length:8},()=>Math.floor(rng()*8)));
 const note=(degree,oct=0)=>root+scale[((degree%7)+7)%7]+12*(Math.floor(degree/7)+oct);
 for(let b=0;b<bars;b++){
  const chord=p.ending==='resolve'&&b>=14?[4,0][b-14]:progress[b%4],part=b<6?0:b<12?1:2,who=p.mode==='solo'?0:b<6?0:b<12?1:b%2;
  const mood=who?p.mood2:p.mood;const lift=['happy','hope','excited','relieved'].includes(mood)?2:['melancholy','lonely'].includes(mood)?-2:0;
  const density=p.style==='ambient'?4:8;const intensity=(p.ending==='rise'?.65+b/40:p.ending==='soft'?1-b/45:.8);
  for(let i=0;i<density;i++){
   if(i!==0&&i!==density-1&&rng()<(p.style==='ambient'?.25:.13))continue;
   let degree=motifs[who][i%8]+lift;if(i===0)degree=chord;if(b===15&&i===density-1)degree=0;if(p.ending==='resolve'&&b===15&&i>=density-3)degree=[4,2,0][i-density+3];
   events.melody.push({time:b*bar+i*bar/density+(mood==='anxious'&&i%2?beat*.12:0)+(p.style==='rnb'&&i%2?beat*.16:0),note:note(degree,0),duration:beat*(mood==='anxious'?.45:p.style==='ambient'?1.6:.72),velocity:(.48+rng()*.25)*intensity,who,part});
  }
  for(const degree of (p.style==='rnb'?[chord,chord+2,chord+4,chord+6]:[chord,chord+2,chord+4]))events.harmony.push({time:b*bar,note:note(degree,-1),duration:bar*.94,velocity:.19*intensity});
  for(let i=0;i<4;i++)events.bass.push({time:b*bar+i*beat,note:note(chord,-2),duration:beat*.75,velocity:.48*intensity});
  for(let i=0;i<8;i++){events.drums.push({time:b*bar+i*beat/2,kind:'hat',duration:.065,velocity:.13*intensity});if(i%4===0)events.drums.push({time:b*bar+i*beat/2,kind:'kick',duration:.22,velocity:.55*intensity});if(i%4===2)events.drums.push({time:b*bar+i*beat/2,kind:'snare',duration:.15,velocity:.24*intensity})}
 }
 events.piano=events.melody.map(e=>({...e,velocity:e.velocity*.85}));
 events.violin=events.melody.filter((e,i)=>i%3===0).map(e=>({...e,note:e.note+12,duration:Math.min(beat*2.4,bars*bar-e.time),velocity:e.velocity*.62}));
 events.guitar=[];for(let b=0;b<bars;b++)for(let i=0;i<8;i++){const degree=progress[b%4]+[0,2,4,7,4,2,4,2][i];events.guitar.push({time:b*bar+i*beat/2,note:note(degree,-1),duration:beat*.9,velocity:.35})}
 if(p.style==='folk'){events.guitar=[];for(let b=0;b<bars;b++)for(let i=0;i<6;i++)events.guitar.push({time:b*bar+i*bar/6,note:note(progress[b%4]+[0,4,7,2,4,7][i],-1),duration:beat*1.3,velocity:i%3===0?.5:.29});events.drums=events.drums.map(e=>({...e,velocity:e.velocity*.45}))}
 if(p.style==='ballad'){events.piano=events.harmony.flatMap(e=>[0,1,2,3].map((j)=>({...e,time:e.time+j*beat,duration:beat*1.8,velocity:e.velocity*1.5})));events.violin=events.violin.map(e=>({...e,duration:Math.min(beat*3,bars*bar-e.time)}));events.drums=events.drums.map(e=>({...e,velocity:e.velocity*.6}))}
 if(p.style==='rnb'){events.bass=events.bass.map((e,i)=>({...e,time:e.time+(i%2?beat*.35:0),note:e.note+(i%4===3?7:0)}));events.drums=events.drums.map(e=>({...e,time:e.time+(e.kind==='hat'&&Math.round(e.time/(beat/2))%2?beat*.16:0),velocity:e.velocity*.85}));events.guitar=events.guitar.filter((e,i)=>i%2).map(e=>({...e,time:e.time+beat*.16,duration:beat*.35}))}
 if(p.style==='rock'){events.guitar=[];for(let b=0;b<bars;b++)for(let i=0;i<8;i++)for(const interval of [0,4,7])events.guitar.push({time:b*bar+i*beat/2,note:note(progress[b%4]+interval,-2),duration:beat*.42,velocity:i%2?.23:.34});events.drums.push(...Array.from({length:bars*4},(_,i)=>({time:i*beat,kind:'kick',duration:.22,velocity:.42})));events.bass=events.bass.map(e=>({...e,velocity:e.velocity*1.1}))}
 if(p.ending==='resolve'){for(const k of Object.keys(events))events[k]=events[k].filter(e=>e.time<bars*bar-beat);for(const k of ['piano','guitar','violin','melody'])events[k].push({time:bars*bar-beat,note:root+(k==='violin'?12:0),duration:beat*1.7,velocity:.32});events.drums=events.drums.filter(e=>e.time<bars*bar-beat*2)}
 return {seed,bpm,duration:bars*bar+2,musicalDuration:bars*bar,events,style:p.style};
}
function tone(ctx,dest,e,track,style){
 if(['guitar','piano','violin'].includes(track)){instrument(ctx,dest,e,track,style);return}
 const gain=ctx.createGain(),t=e.time+.04,d=e.duration,vol=e.velocity*(track==='melody'?.20:track==='harmony'?.12:.23);gain.connect(dest);
 gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(vol,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+d);const f=440*2**((e.note-69)/12);
 const osc=ctx.createOscillator();osc.type=track==='bass'?'sine':style==='electronic'?'triangle':'sine';osc.frequency.value=f;osc.connect(gain);osc.start(t);osc.stop(t+d+.03);
 if(track!=='bass'){const overtone=ctx.createOscillator(),g=ctx.createGain();overtone.type='sine';overtone.frequency.value=f*(style==='piano'?2:1.003);g.gain.value=style==='piano'?.25:.35;overtone.connect(g).connect(gain);overtone.start(t);overtone.stop(t+d+.03)}
}
function instrument(ctx,dest,e,track,style){
 const t=e.time+.04,d=e.duration,f=440*2**((e.note-69)/12),g=ctx.createGain();g.connect(dest);
 const bowed=track==='violin',level=e.velocity*(bowed?.12:track==='piano'?.18:.13);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,level),t+(bowed?.14:.006));g.gain.exponentialRampToValueAtTime(Math.max(.00015,level*(bowed?.7:.25)),t+Math.max(.16,d*.65));g.gain.exponentialRampToValueAtTime(.0001,t+d+.18);
 const partials=track==='piano'?[1,.42,.18,.08,.04]:track==='guitar'?(style==='rock'?[.7,.28,.45,.14,.25,.1,.12]:[1,.5,.32,.12,.08,.03]):[.65,.42,.27,.2,.11,.07];
 partials.forEach((amp,i)=>{const o=ctx.createOscillator(),a=ctx.createGain();o.frequency.value=f*(i+1)*(track==='piano'?1+i*.0008:1);a.gain.value=amp;o.connect(a).connect(g);if(bowed){const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=5.3;lg.gain.value=2.2*(i+1);lfo.connect(lg).connect(o.frequency);lfo.start(t);lfo.stop(t+d+.2)}o.start(t);o.stop(t+d+.2)})
}
function drum(ctx,dest,e,noise){const t=e.time+.04,g=ctx.createGain();g.connect(dest);g.gain.setValueAtTime(e.velocity*.22,t);g.gain.exponentialRampToValueAtTime(.0001,t+e.duration);
 if(e.kind==='kick'){const o=ctx.createOscillator();o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(42,t+.18);o.connect(g);o.start(t);o.stop(t+.24)}else{const s=ctx.createBufferSource(),filter=ctx.createBiquadFilter();s.buffer=noise;filter.type='highpass';filter.frequency.value=e.kind==='hat'?7000:1500;s.connect(filter).connect(g);s.start(t,0,e.duration)}
}
export async function render(score,onProgress=()=>{}){const buffers={},entries=Object.keys(score.events);for(const track of entries){onProgress(Object.keys(buffers).length,entries.length);
 const ctx=new OfflineAudioContext(2,Math.ceil(score.duration*22050),22050),out=ctx.createGain();out.gain.value=.85;out.connect(ctx.destination);
 const noise=ctx.createBuffer(1,22050,22050),data=noise.getChannelData(0),rng=random(score.seed);for(let i=0;i<data.length;i++)data[i]=rng()*2-1;
 for(const e of score.events[track])track==='drums'?drum(ctx,out,e,noise):tone(ctx,out,e,track,score.style);
 buffers[track]=await ctx.startRendering();
 }onProgress(entries.length,entries.length);return buffers}
export class Player{
 constructor(){this.ctx=null;this.sources=[];this.gains={};this.position=0;this.started=0;this.playing=false;this.volume=.8}
 async play(buffers,enabled,mix=this.mix){const offset=this.position;this.halt();this.ctx??=new AudioContext();await this.ctx.resume();this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=128;this.analyser.smoothingTimeConstant=.8;this.master.connect(this.analyser).connect(this.ctx.destination);this.levels=new Uint8Array(this.analyser.frequencyBinCount);this.buffers=buffers;this.enabled={...enabled};this.mix=normalizeMix(mix);this.position=offset;this.started=this.ctx.currentTime;this.playing=true;
 for(const [track,buffer]of Object.entries(buffers)){const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.connect(gain).connect(this.master);source.start(0,Math.min(offset,buffer.duration-.01));this.sources.push(source);this.gains[track]=gain;this.schedule(track)}}
 schedule(track){const param=this.gains[track]?.gain;if(!param)return;const duration=Object.values(this.buffers)[0].duration,mix=this.mix[track],t=this.time,now=this.ctx.currentTime;param.cancelScheduledValues(now);param.setValueAtTime(this.enabled[track]?gainAt(mix,t,duration):0,now);if(this.enabled[track])for(const [at,value]of gainPoints(mix,duration))if(at>t)param.linearRampToValueAtTime(value,now+at-t)}
 toggle(track,on){this.enabled??={};this.enabled[track]=on;this.schedule(track)}
 setMix(mix){this.mix=normalizeMix(mix);if(this.playing)for(const track of Object.keys(this.gains))this.schedule(track)}
 setVolume(v){this.volume=v;if(this.master)this.master.gain.setTargetAtTime(v,this.ctx.currentTime,.03)}
 get time(){return this.position+(this.playing?this.ctx.currentTime-this.started:0)}
 frequencies(){if(this.playing&&this.analyser){this.analyser.getByteFrequencyData(this.levels);return this.levels}return null}
 pause(){const t=this.time;this.halt();this.position=t}
 async seek(time,buffers,enabled){const was=this.playing;this.halt();this.position=Math.max(0,Math.min(time,Object.values(buffers)[0].duration-.01));if(was)await this.play(buffers,enabled)}
 halt(){for(const s of this.sources){try{s.stop()}catch{}}this.sources=[];if(this.master)this.master.disconnect();if(this.analyser)this.analyser.disconnect();this.playing=false;this.gains={}}
 stop(){this.halt();this.position=0}
}
export function wav(buffers,enabled,mix){const first=Object.values(buffers)[0],n=first.length,ab=new ArrayBuffer(44+n*4),view=new DataView(ab);const str=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i))};str(0,'RIFF');view.setUint32(4,36+n*4,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,first.sampleRate,true);view.setUint32(28,first.sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,n*4,true);
 const normalized=normalizeMix(mix),tracks=Object.entries(buffers).filter(([k])=>enabled[k]).map(([k,b])=>[b.getChannelData(0),b.getChannelData(1),normalized[k]]);for(let i=0;i<n;i++)for(let ch=0;ch<2;ch++){let v=0;for(const t of tracks)v+=t[ch][i]*gainAt(t[2],i/first.sampleRate,first.length/first.sampleRate);view.setInt16(44+(i*2+ch)*2,Math.max(-1,Math.min(1,v))*32767,true)}return new Blob([ab],{type:'audio/wav'})}
