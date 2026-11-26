import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAi,validateSuggestion} from '../backend/ai.mjs';
const suggestion={mood:'nostalgic',mood2:'happy',style:'piano',ending:'soft',tempo:80,instruments:{piano:true,guitar:false,violin:true,bass:true,drums:false,melody:false,harmony:true},reason:'缓慢的钢琴和弦乐呼应告别时的不舍。'};
const input={story:'毕业那天下雨了，我们在校门口告别',mode:'solo',consent:true};
const config={apiKey:'test-private-key',baseUrl:'https://model.example/v1',model:'test-model'};
test('模型请求只包含故事和模式，使用服务端密钥，返回白名单参数',async()=>{
 const ai=createAi({...config,fetchImpl:async(url,options)=>{
  assert.equal(String(url),'https://model.example/v1/chat/completions');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer test-private-key');
  const body=JSON.parse(options.body);assert.equal(body.response_format.type,'json_object');assert.deepEqual(JSON.parse(body.messages[1].content),{mode:'solo',story:input.story,story2:''});
  return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({...suggestion,story:'恶意覆盖',apiKey:'secret'})}}]});
 }});
 assert.deepEqual(await ai.suggest({...input,title:'不应发送的标题',story2:'单人模式不应发送'}),suggestion);
});
test('未配置、未同意、空故事与双人缺失故事均不调用模型',async()=>{
 await assert.rejects(createAi().suggest(input),{status:503});
 const ai=createAi({...config,fetchImpl:()=>{assert.fail('不应调用模型')}});
 for(const data of [{...input,consent:false},{...input,story:''},{...input,mode:'friends'},{...input,story:'a'.repeat(1201)}])await assert.rejects(ai.suggest(data),{status:400});
 assert.throws(()=>createAi({...config,baseUrl:'http://example.com'}));
});
test('拒绝未知枚举、非法速度、无声编曲和缺失理由',()=>{
 for(const value of [{...suggestion,mood:'__proto__'},{...suggestion,tempo:200},{...suggestion,tempo:'80'},{...suggestion,instruments:{}},{...suggestion,instruments:Object.fromEntries(Object.keys(suggestion.instruments).map(k=>[k,false]))},{...suggestion,reason:''}])assert.throws(()=>validateSuggestion(value),{status:502});
});
test('处理模型错误、截断和非法 JSON，不泄露上游响应',async()=>{
 for(const response of [new Response('private key details',{status:401}),Response.json({choices:[{finish_reason:'length',message:{content:'{}'}}]}),Response.json({choices:[{finish_reason:'stop',message:{content:'invalid'}}]})]){
  await assert.rejects(createAi({...config,fetchImpl:async()=>response}).suggest(input),error=>error.status===502&&!error.message.includes('private key'));
 }
 await assert.rejects(createAi({...config,fetchImpl:async()=>new Response('',{status:429})}).suggest(input),{status:429});
});
test('模型超时会中断请求',async()=>{
 const ai=createAi({...config,timeoutMs:10,fetchImpl:(_url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))))});
 await assert.rejects(ai.suggest(input),{status:504});
});
