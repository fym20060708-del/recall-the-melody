const {spawn}=require('node:child_process');
const http=require('node:http');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),url='http://127.0.0.1:4175/';
const child=spawn(process.execPath,['--disable-warning=ExperimentalWarning',path.join(root,'server.mjs')],{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,RECALL_LOCAL:'true',PORT:'4175',DATABASE_PATH:path.join(root,'.data','recall.sqlite')}});
let opened=false,attempts=0,stopped=false;
console.log('\n回忆成调 · Windows 本地版\n正在启动，请稍候…\n');
function check(){if(stopped||opened)return;if(++attempts>60){console.error('启动等待超时。请查看上方错误，或手动打开 '+url);return}const req=http.get(url+'api/health',res=>{let body='';res.on('data',data=>body+=data);res.on('end',()=>{try{const info=JSON.parse(body);if(res.statusCode!==200||info.app!=='recall-the-melody'||!info.localOnly)throw Error();opened=true;console.log('\n已启动：'+url+'\n使用时请保留这个窗口；结束后关闭窗口即可。\n网页未自动打开时，请用 Edge 或 Chrome 打开上面的地址。\n');if(process.env.RECALL_NO_BROWSER!=='true'){const browser=spawn('cmd.exe',['/d','/c','start','',url],{windowsHide:true,stdio:'ignore'});browser.on('error',()=>console.log('请手动打开 '+url));browser.unref()}}catch{setTimeout(check,300)}})});req.setTimeout(1000,()=>req.destroy());req.on('error',()=>setTimeout(check,300))}
// Wait briefly so a failed child cannot accidentally reuse another instance.
setTimeout(check,400);
child.on('error',error=>{stopped=true;console.error('无法启动运行环境：'+error.message);process.exitCode=1});
child.on('exit',code=>{stopped=true;process.exitCode=code??1});
process.on('SIGINT',()=>{stopped=true;child.kill('SIGINT')});
process.on('SIGTERM',()=>{stopped=true;child.kill('SIGTERM')});
