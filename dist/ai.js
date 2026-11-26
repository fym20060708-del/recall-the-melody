import {api} from './social.js';
import {moods,styles,endings} from './music.js';
import {tracks} from './mix.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function wireAi({getProject,apply,toast}){
 const host=document.querySelector('#ai-assistant');if(!host)return;
 host.innerHTML='<h3>让 AI 读懂这段回忆</h3><p role="status">正在检查助手是否可用…</p>';
 const snapshot=()=>{const p=getProject();return JSON.stringify({id:p.id,mode:p.mode,story:p.story,story2:p.mode==='solo'?'':p.story2})};
 api('/ai/status').then(status=>{
  if(!host.isConnected)return;
  if(!status.enabled){host.innerHTML='<h3>AI 编曲助手</h3><p>助手尚未配置。部署者设置模型服务后即可使用；现在可以继续手动选择心情和声音。</p>';return}
  host.innerHTML=`<h3>让 AI 读懂这段回忆</h3><p>根据故事推荐心情、风格、速度与乐器，预览后再应用。${status.loginRequired?'在线使用需先登录。':''}</p><label class="check"><input type="checkbox" id="ai-consent">我同意将当前故事发送给部署者配置的 AI 模型服务${getProject().mode!=='solo'?'，且已获得另一位参与者同意':''}。</label><p>仅发送故事和创作模式。请避免填写不愿交给模型服务的私人信息。</p><button type="button" class="secondary" id="ai-analyze">分析故事，推荐编曲</button><div id="ai-feedback" aria-live="polite"></div>`;
  const button=host.querySelector('#ai-analyze'),feedback=host.querySelector('#ai-feedback');
  button.onclick=async()=>{
   if(!host.querySelector('#ai-consent').checked){feedback.textContent='请先确认同意发送故事。';return}
   const p=getProject();if(!p.story.trim()||(p.mode!=='solo'&&!p.story2.trim())){feedback.textContent='请先填写每位参与者的故事。';return}
   const before=snapshot();button.disabled=true;button.textContent='正在读懂回忆…';feedback.textContent='正在分析，你也可以继续手动创作。';
   try{
    const {suggestion:s}=await api('/ai/suggest','POST',{story:p.story,story2:p.mode==='solo'?'':p.story2,mode:p.mode,consent:true});
    if(!host.isConnected)return;
    if(snapshot()!==before){feedback.textContent='故事已修改，请重新分析以获得对应建议。';return}
    feedback.innerHTML=`<div class="ai-suggestion"><h4>建议的创作方向</h4><p>${esc(moods[s.mood])}${p.mode!=='solo'?` / TA：${esc(moods[s.mood2])}`:''} · ${esc(styles[s.style])} · ${s.tempo} BPM · ${esc(endings[s.ending])}</p><p>${esc(Object.entries(tracks).filter(([k])=>s.instruments[k]).map(([,v])=>v).join('、'))}</p><p>${esc(s.reason)}</p><p>应用会替换心情、风格、速度、结尾和乐器，并重置混音。故事与标题保留，后续仍可修改。</p><button class="primary" type="button" id="ai-apply">应用这份编曲建议</button></div>`;
    host.querySelector('#ai-apply').onclick=()=>{if(snapshot()!==before){feedback.textContent='故事已修改，请重新分析。';return}apply(s);toast('已应用 AI 建议，可继续调整创作方向')};
   }catch(error){if(host.isConnected)feedback.textContent=error.message}
   finally{if(host.isConnected){button.disabled=false;button.textContent='重新分析故事'}}
  };
 }).catch(()=>{if(host.isConnected)host.innerHTML='<h3>AI 编曲助手</h3><p>暂时无法连接助手，你仍可继续手动创作。</p>'});
}
