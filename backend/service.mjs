import {createAi} from './ai.mjs';
import {openDatabase} from './database.mjs';
import {randomBytes,randomUUID,createHash,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {normalizeMix} from '../dist/mix.js';
import {moods,styles,endings} from '../dist/music.js';
import {validColor} from '../dist/art.js';
const scrypt=promisify(scryptCallback),digest=s=>createHash('sha256').update(s).digest('hex');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
const string=(v,max=1200)=>typeof v==='string'?v.trim().slice(0,max):'';
export function cleanProject(p){if(!p||typeof p!=='object'||typeof p.story!=='string'||!Object.hasOwn(styles,p.style)||!Object.hasOwn(moods,p.mood))fail(400,'作品内容无效');return {id:string(p.id,100)||randomUUID(),title:string(p.title,40)||'未命名的回忆',story:string(p.story),story2:string(p.story2),name1:string(p.name1,32),name2:string(p.name2,32),mode:['couple','friends'].includes(p.mode)?p.mode:'solo',mood:p.mood,mood2:Object.hasOwn(moods,p.mood2)?p.mood2:'warm',style:p.style,ending:Object.hasOwn(endings,p.ending)?p.ending:'soft',memoryColor:validColor(p.memoryColor),tempo:Number.isFinite(p.tempo)?Math.max(60,Math.min(150,Math.round(p.tempo))):null,mix:normalizeMix(p.mix),instruments:Object.fromEntries(['piano','guitar','violin','drums','bass','harmony','melody'].map(k=>[k,!!p.instruments?.[k]])),variation:Number.isInteger(p.variation)?Math.max(0,Math.min(10000,p.variation)):0,created:typeof p.created==='string'&&!isNaN(Date.parse(p.created))?p.created:new Date().toISOString()}}
export async function createService({databasePath=':memory:',databaseUrl='',databaseCa='',publicUrl='',secureCookies=false,authLimit=20,localOnly=false,aiOptions={},aiLimit=10}={}){
 const db=await openDatabase({databasePath,databaseUrl,databaseCa});
 await db.exec(`
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE,display_name TEXT NOT NULL,password_hash TEXT NOT NULL,created BIGINT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires BIGINT NOT NULL);
 CREATE TABLE IF NOT EXISTS projects(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,id TEXT NOT NULL,data TEXT NOT NULL,updated BIGINT NOT NULL,PRIMARY KEY(user_id,id));
 CREATE TABLE IF NOT EXISTS rooms(id TEXT PRIMARY KEY,host_id TEXT NOT NULL REFERENCES users(id),guest_id TEXT REFERENCES users(id),invite_hash TEXT NOT NULL UNIQUE,settings TEXT NOT NULL,host_answer TEXT,guest_answer TEXT,revision INTEGER NOT NULL DEFAULT 0,updated BIGINT NOT NULL,expires BIGINT NOT NULL);`);
 const ai=createAi(aiOptions),aiLimits=new Map();let aiActive=0;
 const limits=new Map();let activeHashes=0;
 async function userFor(req){const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('recall_session='))?.slice(15);if(!token||token.length>200)return null;return (await db.prepare('SELECT u.id,u.username,u.display_name AS "displayName" FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?').get(digest(token),Date.now()))||null}
 const requireUser=async req=>(await userFor(req))||fail(401,'请先登录');
 async function cookie(res,user){const token=randomBytes(32).toString('base64url');(await db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now()));(await db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),user.id,Date.now()+7*86400000));res.setHeader('Set-Cookie',`recall_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secureCookies?'; Secure':''}`)}
 function checkOrigin(req){const expected=publicUrl?new URL(publicUrl).origin:`http://${req.headers.host}`;if(req.headers.origin!==expected)fail(403,'请求来源未通过验证，请刷新页面重试')}
 function rate(req){const key=req.socket.remoteAddress||'unknown',now=Date.now();if(limits.size>10000)for(const [k,v] of limits)if(v.until<now)limits.delete(k);const item=limits.get(key);if(!item||item.until<now)limits.set(key,{count:1,until:now+900000});else if(++item.count>authLimit)fail(429,'尝试次数较多，请稍后再试')}
 async function hashPassword(password,salt){if(activeHashes>=4)fail(429,'登录请求较多，请稍后重试');activeHashes++;try{return await scrypt(password,salt,64)}finally{activeHashes--}}
 async function body(req){let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>65536)fail(413,'提交内容过长');chunks.push(c)}try{const parsed=JSON.parse(Buffer.concat(chunks).toString()||'{}');if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))fail(400,'提交内容格式无效');return parsed}catch{fail(400,'提交内容格式无效')}}
 async function roomFor(id,user){const r=(await db.prepare('SELECT * FROM rooms WHERE id=? AND expires>?').get(id,Date.now()));if(!r||![r.host_id,r.guest_id].includes(user.id))fail(404,'房间不存在、已过期或你无权访问');return r}
 async function roomView(r,user){return {id:r.id,role:r.host_id===user.id?'host':'guest',hostName:(await db.prepare('SELECT display_name FROM users WHERE id=?').get(r.host_id)).display_name,guestName:r.guest_id?(await db.prepare('SELECT display_name FROM users WHERE id=?').get(r.guest_id)).display_name:null,settings:JSON.parse(r.settings),hostAnswer:r.host_answer?JSON.parse(r.host_answer):null,guestAnswer:r.guest_answer?JSON.parse(r.guest_answer):null,ready:!!(r.host_answer&&r.guest_answer),revision:r.revision,expires:r.expires}}
 const reply=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 async function handle(req,res){try{const path=new URL(req.url,'http://local').pathname,method=req.method;if(!path.startsWith('/api/'))return false;if(!['GET','HEAD'].includes(method))checkOrigin(req);
 if(path==='/api/health'&&method==='GET'){await db.prepare('SELECT 1 AS ok').get();reply(res,{ok:true,app:'recall-the-melody',localOnly,accounts:true,rooms:!localOnly});return true}
 if(path==='/api/ai/status'&&method==='GET'){reply(res,{enabled:ai.enabled,loginRequired:!localOnly});return true}
 if(path==='/api/ai/suggest'&&method==='POST'){
  const user=localOnly?null:await requireUser(req);
  const b=await body(req),now=Date.now(),key=user?.id||req.socket.remoteAddress||'local';
  for(const [k,v] of aiLimits)if(v.until<now)aiLimits.delete(k);
  const item=aiLimits.get(key)||{count:0,until:now+3600000};
  if(item.count>=aiLimit)fail(429,'每小时最多分析 '+aiLimit+' 次，请稍后重试');
  if(aiActive>=3)fail(429,'AI 正在处理其他故事，请稍后重试');
  item.count++;aiLimits.set(key,item);aiActive++;
  try{reply(res,{suggestion:await ai.suggest(b)})}finally{aiActive--}return true
 }
 if(path==='/api/session'&&method==='GET'){reply(res,{user:await userFor(req),localOnly});return true}
 if(localOnly&&path.startsWith('/api/rooms'))fail(400,'Windows 本地版支持同机双人创作，不提供远程邀请房间');
 if(['/api/auth/register','/api/auth/login'].includes(path)&&method==='POST'){
  rate(req);const b=await body(req),name=string(b.username,32).normalize('NFKC').toLowerCase(),password=b.password;
  if(!/^[\p{L}\p{N}_.-]{3,32}$/u.test(name)||typeof password!=='string'||password.length<10||password.length>128)fail(400,'账号需 3–32 个文字、字母、数字或下划线；密码需 10–128 位');
  let user;if(path.endsWith('register')){const salt=randomBytes(16).toString('hex'),hash=await hashPassword(password,salt),id=randomUUID();try{(await db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,name,string(b.displayName,32)||name,`${salt}:${hash.toString('hex')}`,Date.now()))}catch(e){if((await db.prepare('SELECT id FROM users WHERE username=?').get(name)))fail(409,'该账号已被注册');throw e}user={id,username:name,displayName:string(b.displayName,32)||name}}else{const row=(await db.prepare('SELECT * FROM users WHERE username=?').get(name)),[salt,expected]=row?row.password_hash.split(':'):['0'.repeat(32),'0'.repeat(128)],hash=await hashPassword(password,salt);if(!row||!timingSafeEqual(hash,Buffer.from(expected,'hex')))fail(401,'账号或密码不正确');user={id:row.id,username:row.username,displayName:row.display_name}}await cookie(res,user);reply(res,{user},path.endsWith('register')?201:200);return true
 }
 if(path==='/api/auth/logout'&&method==='POST'){const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('recall_session='))?.slice(15);if(token)(await db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token)));res.setHeader('Set-Cookie',`recall_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureCookies?'; Secure':''}`);reply(res,{ok:true});return true}
 if(path==='/api/projects'&&method==='GET'){const user=await requireUser(req);reply(res,{projects:(await db.prepare('SELECT data FROM projects WHERE user_id=? ORDER BY updated DESC LIMIT 200').all(user.id)).map(r=>JSON.parse(r.data))});return true}
 if(path==='/api/projects'&&method==='PUT'){const user=await requireUser(req),p=cleanProject(await body(req));if(!(await db.prepare('SELECT id FROM projects WHERE user_id=? AND id=?').get(user.id,p.id))&&(await db.prepare('SELECT count(*) AS n FROM projects WHERE user_id=?').get(user.id)).n>=200)fail(409,'最多保存 200 段云端回忆');(await db.prepare('INSERT INTO projects VALUES(?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET data=excluded.data,updated=excluded.updated').run(user.id,p.id,JSON.stringify(p),Date.now()));reply(res,{ok:true});return true}
 if(path.startsWith('/api/projects/')&&method==='DELETE'){const user=await requireUser(req);(await db.prepare('DELETE FROM projects WHERE user_id=? AND id=?').run(user.id,decodeURIComponent(path.slice(14))));reply(res,{ok:true});return true}
 if(path==='/api/rooms'&&method==='GET'){const user=await requireUser(req);reply(res,{rooms:await Promise.all((await db.prepare('SELECT * FROM rooms WHERE (host_id=? OR guest_id=?) AND expires>? ORDER BY updated DESC LIMIT 30').all(user.id,user.id,Date.now())).map(r=>roomView(r,user)))});return true}
 if(path==='/api/rooms'&&method==='POST'){const user=await requireUser(req),b=await body(req);if((await db.prepare('SELECT count(*) AS n FROM rooms WHERE host_id=? AND expires>?').get(user.id,Date.now())).n>=30)fail(409,'当前房间已达到上限');const id=randomUUID(),token=randomBytes(24).toString('base64url'),settings={title:string(b.title,40)||'我们的共同回忆',mode:b.mode==='friends'?'friends':'couple',style:Object.hasOwn(styles,b.style)?b.style:'piano',ending:Object.hasOwn(endings,b.ending)?b.ending:'soft',memoryColor:validColor(b.memoryColor)};(await db.prepare('INSERT INTO rooms(id,host_id,invite_hash,settings,updated,expires) VALUES(?,?,?,?,?,?)').run(id,user.id,digest(token),JSON.stringify(settings),Date.now(),Date.now()+30*86400000));reply(res,{room:await roomView(await roomFor(id,user),user),inviteToken:token},201);return true}
 if(path==='/api/rooms/join'&&method==='POST'){const user=await requireUser(req),b=await body(req),r=(await db.prepare('SELECT * FROM rooms WHERE invite_hash=? AND expires>?').get(digest(string(b.token,200)),Date.now()));if(!r)fail(404,'邀请已失效或房间已过期');if(r.host_id!==user.id&&r.guest_id!==user.id){if(r.guest_id)fail(409,'这个双人房间已满');if(!(await db.prepare('UPDATE rooms SET guest_id=?,revision=revision+1,updated=? WHERE id=? AND guest_id IS NULL').run(user.id,Date.now(),r.id)).changes)fail(409,'这个双人房间已满')}reply(res,{room:await roomView(await roomFor(r.id,user),user)});return true}
 const match=path.match(/^\/api\/rooms\/([\w-]+)(?:\/(answer|invite))?$/);if(match){const user=await requireUser(req),r=await roomFor(match[1],user);if(method==='GET'&&!match[2]){reply(res,{room:await roomView(r,user)});return true}
  if(method==='POST'&&match[2]==='invite'){if(r.host_id!==user.id)fail(403,'只有创建者可以重新生成邀请');const token=randomBytes(24).toString('base64url');(await db.prepare('UPDATE rooms SET invite_hash=? WHERE id=?').run(digest(token),r.id));reply(res,{inviteToken:token});return true}
  if(method==='PUT'&&match[2]==='answer'){const b=await body(req);if(!string(b.story))fail(400,'请写下你的那一份回忆');if(b.shareConsent!==true)fail(400,'请确认回答将向房间另一位参与者展示');const answer={story:string(b.story),mood:Object.hasOwn(moods,b.mood)?b.mood:'warm',instruments:Object.fromEntries(['piano','guitar','violin','drums','bass','harmony','melody'].map(k=>[k,!!b.instruments?.[k]]))};if(!Object.values(answer.instruments).some(Boolean))answer.instruments.piano=true;const column=r.host_id===user.id?'host_answer':'guest_answer';(await db.prepare(`UPDATE rooms SET ${column}=?,revision=revision+1,updated=? WHERE id=?`).run(JSON.stringify(answer),Date.now(),r.id));reply(res,{room:await roomView(await roomFor(r.id,user),user)});return true}
 }fail(404,'接口不存在')
 }catch(e){reply(res,{error:e.status?e.message:'服务暂时不可用，请重试'},e.status||500);if(!e.status)console.error('API request failed:',e.code||e.name)}return true}
 return {handle,close:()=>db.close(),db};
}
