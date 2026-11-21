import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createService} from './backend/service.mjs';
const localApp=process.env.RECALL_LOCAL==='true';
const root=new URL('./dist/',import.meta.url),publicUrl=localApp?'':process.env.PUBLIC_URL||process.env.RENDER_EXTERNAL_URL||'',port=Number(process.env.PORT||4175),host=localApp?'127.0.0.1':process.env.HOST||'127.0.0.1';
if(!localApp&&process.env.NODE_ENV==='production'&&!publicUrl.startsWith('https://'))throw new Error('Production requires PUBLIC_URL with HTTPS');
if(!localApp&&(process.env.RENDER||process.env.REQUIRE_POSTGRES==='true')&&!process.env.DATABASE_URL)throw new Error('This hosting requires an external DATABASE_URL; local SQLite is disabled');
const service=await createService({localOnly:localApp||!publicUrl,databaseUrl:localApp?'':process.env.DATABASE_URL||'',databaseCa:localApp?'':process.env.DATABASE_CA||'',databasePath:process.env.DATABASE_PATH||fileURLToPath(new URL('./.data/recall.sqlite',import.meta.url)),publicUrl,secureCookies:publicUrl.startsWith('https://')});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
try{if(await service.handle(req,res))return;const path=new URL(req.url,'http://local').pathname;if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}const name=path==='/'?'index.html':path.slice(1);if(!/^[a-zA-Z0-9_-]+\.(html|js|css|svg|png|ico)$/.test(name)){res.writeHead(404);res.end('Not found');return}const data=await readFile(new URL(name,root)),ext=name.slice(name.lastIndexOf('.'));res.writeHead(200,{'Content-Type':types[ext]+'; charset=utf-8','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data)}catch{if(!res.headersSent)res.writeHead(404);res.end('Not found')}});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'端口已被占用，请关闭之前的启动窗口，再重新打开。':`启动失败：${error.code||error.message}`);service.close();process.exitCode=1});
server.listen(port,host,()=>console.log(`回忆成调：http://${host}:${server.address().port}`));
function shutdown(){server.close(async()=>{await service.close();process.exit(0)});setTimeout(()=>process.exit(1),5000).unref()}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
