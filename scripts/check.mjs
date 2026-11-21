import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
for(const dir of ['dist','backend','scripts'])for(const file of readdirSync(new URL('../'+dir+'/',import.meta.url)))if(/\.(mjs|cjs|js)$/.test(file)){const run=spawnSync(process.execPath,['--check',dir+'/'+file],{stdio:'inherit'});if(run.status)process.exit(run.status)}
console.log('所有 JavaScript 文件语法检查通过');
