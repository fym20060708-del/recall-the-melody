import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const files={'/':['index.html','text/html; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/music.js':['music.js','text/javascript; charset=utf-8']};
http.createServer(async(req,res)=>{const item=files[new URL(req.url,'http://localhost').pathname];if(!item){res.writeHead(404);res.end('Not found');return}try{const data=await readFile(new URL('./dist/'+item[0],import.meta.url));res.writeHead(200,{'Content-Type':item[1],'Cache-Control':'no-cache'});res.end(data)}catch{res.writeHead(500);res.end('Unable to load page')}}).listen(4175,'127.0.0.1',()=>console.log('回忆成调已启动：http://127.0.0.1:4175'));
