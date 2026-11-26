import {openSuggestions,exportSuggestions} from './suggestion-store.js';

// The workstation turns saved suggestions into a new House revision.
// This module adds a send footer to the Edits panel (formerly Suggestions) and a Jobs dialog
// that shows every job's place in the queue, current step, per-suggestion
// outcome and history. The workstation publishes successful builds itself.

const encode=new TextEncoder();
const label=(en,zh)=>document.documentElement.lang?.startsWith('zh')?zh:en;
const hex=bytes=>Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
const bytes=str=>Uint8Array.from(atob(str),c=>c.charCodeAt(0));
function base64(raw){let s='';for(let i=0;i<raw.length;i+=8192)s+=String.fromCharCode(...raw.subarray(i,i+8192));return btoa(s);}
async function seal(key,plaintext,aad){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encode.encode(aad)},key,plaintext));
 const packet=new Uint8Array(iv.length+ciphertext.length);packet.set(iv);packet.set(ciphertext,iv.length);return base64(packet);
}
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined&&text!==null)node.textContent=text;if(className)node.className=className;return node;}
function action(text,onclick,className){const node=el('button',text,className);node.type='button';node.onclick=onclick;return node;}

const ACTIVE=new Set(['received','designing','checking','publishing']);
const STEPS={
 validating:['Checking the submission','检查提交'],inspecting:['Reading the model','读取模型'],planning:['Planning the design','规划方案'],
 trying:['Trying the changes','试做修改'],waiting:['Waiting for the owner','等待站主'],
 modeling:['Changing the model','修改模型'],freezing:['Freezing the revision','冻结版本'],building:['Building the web model','生成网页模型'],
 rendering:['Rendering comparisons','渲染对比图'],packaging:['Packaging the delivery','打包交付'],report:['Writing the report','生成报告'],
 website:['Preparing the website update','准备网站更新'],'site-check':['Testing the website','测试网站'],push:['Pushing the commit','推送提交'],
 preview:['Waiting for the Vercel preview','等待 Vercel 预览'],merge:['Merging','合并'],production:['Checking zbao.art','核对正式站'],repo:['Saving to layout2house','保存到 layout2house'],
};
// Steps a job reports, in order, for progress.
export const DESIGN_STEPS=['validating','inspecting','planning','trying','modeling','freezing','building','rendering','packaging','report','website','site-check'];
export const PUBLISH_STEPS=['push','preview','merge','production','repo'];
// Step number, total and fraction done for a running job.
export function progressOf(state){
 const steps=state?.stage==='publishing'?PUBLISH_STEPS:DESIGN_STEPS;
 if(!state||state.stage==='received')return {index:0,total:steps.length,fraction:0,steps};
 const index=Math.max(0,steps.indexOf(state.step));
 return {index:index+1,total:steps.length,fraction:(index+.5)/steps.length,steps};
}
const duration=ms=>{const s=Math.max(0,Math.round(ms/1000)),m=Math.floor(s/60);return m>=60?`${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`:`${m}:${String(s%60).padStart(2,'0')}`;};
const PHASES=[['Sent','已发送'],['Queued','排队'],['Planning','规划'],['Building','建模'],['Checking','检查'],['Publishing','发布'],['Live','上线']];
const stepText=step=>STEPS[step]?label(...STEPS[step]):'';
export {duration};

// Index of the timeline phase a job has reached.
export function phaseOf(state){
 if(!state)return 0;
 switch(state.stage){
  case 'received':return 1;
  case 'designing':case 'waiting':return !state.step||['validating','inspecting','planning','trying','waiting'].includes(state.step)?2:3;
  case 'checking':return 4;
  case 'review':case 'publishing':return 5;
  case 'published':return PHASES.length;
  case 'held':return 2;
  case 'failed':{const last=[...(state.history??[])].reverse().find(h=>h.stage!=='failed');return last?phaseOf(last):1;}
  default:return 0;
 }
}
// Short status and tone for a job, as the viewer's role sees it.
// `brief` leaves the current step out, for places that show it separately.
export function statusOf(state,owner,brief=false){
 if(!state)return [label('Sending','发送中'),'active'];
 switch(state.stage){
  case 'received':return [state.queue>0?label(`Queued · ${state.queue} ahead`,`排队中 · 前面还有 ${state.queue} 个`):label('Starting next','即将开始'),'active'];
  case 'designing':case 'checking':return [!brief&&stepText(state.step)||label('Working','处理中'),'active'];
  case 'review':return [owner?label('Ready to publish','可以发布'):label('Built · going live','已建好 · 即将上线'),'attention'];
  case 'publishing':return [!brief&&stepText(state.step)||label('Publishing','发布中'),'active'];
  case 'published':return [label('Live','已上线'),'done'];
  case 'held':return [label('Needs your input','需要你确认'),'attention'];
  case 'waiting':return [owner?label('Needs you in Claude','需要你在 Claude 中处理'):label('Waiting for the owner','等待站主'),'attention'];
  case 'failed':return [label('Stopped','已停止'),'error'];
  default:return [state.stage,'active'];
 }
}
function ago(time){
 if(!time)return '';
 const seconds=Math.round((time-Date.now())/1000),format=new Intl.RelativeTimeFormat(document.documentElement.lang||'en',{numeric:'auto'});
 for(const [unit,size] of [['day',86400],['hour',3600],['minute',60]])if(Math.abs(seconds)>=size)return format.format(Math.round(seconds/size),unit);
 return format.format(seconds,'second');
}
const clock=time=>new Date(time).toLocaleTimeString(document.documentElement.lang||undefined,{hour:'2-digit',minute:'2-digit'});

export function installWorkstation(catalog,privacy,submission){
 const panel=document.getElementById('suggestions-panel');
 if(!panel||!catalog?.projectId)return;
 const store=openSuggestions(catalog.projectId,privacy);

 // ---- Local record of this device's submissions ----
 const recordKey='house-station-jobs/'+catalog.projectId,legacyKey='house-station-recent/'+catalog.projectId;
 function records(){
  let list=[];
  try{list=JSON.parse(localStorage.getItem(recordKey)||'[]').filter(r=>typeof r?.job==='string');}catch{}
  try{for(const job of JSON.parse(localStorage.getItem(legacyKey)||'[]'))if(typeof job==='string'&&!list.some(r=>r.job===job))list.push({job,notes:[]});}catch{}
  return list.slice(0,20);
 }
 function remember(record){
  try{localStorage.setItem(recordKey,JSON.stringify([record,...records().filter(r=>r.job!==record.job)].slice(0,20)));}catch{}
 }

 // ---- Relay access ----
 let owner,online=false,epoch=null,submitOnline=false,ownerRecent=[];
 const states=new Map();
 const offlineText=()=>label('Workstation offline. Your edits stay saved on this device.','工作站离线。修改仍保存在这台设备上。');
 const unavailable=()=>label('Submission access unavailable. Reopen House and try again.','提交权限暂不可用，请重新进入 House 后重试。');
 const api=async (body,token=submission?.token)=>{
  if(!token)throw Error(unavailable());
  const r=await fetch('/api/house-jobs',{method:'POST',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:AbortSignal.timeout(17000)});
  if(!r.ok)throw Error(r.status===503?offlineText():r.status===403||r.status===401?label('Access denied.','访问被拒绝。'):label('Request failed. Please retry.','请求失败，请重试。'));return r.json();
 };
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 // A command is a notification; retry until the workstation's state shows it arrived.
 async function command(cmd,accepted,token){
  for(let attempt=0;attempt<18;attempt++){
   const {online:live,state}=await api({op:'read',job:cmd.job},token);
   if(accepted(state)){states.set(cmd.job,state);return state;}
   if(!live)throw Error(offlineText());
   if(attempt%3===0)await api(cmd,token);
   await sleep(attempt<6?1200:2800);
  }
  throw Error(label('No workstation receipt yet. Check the job list again in a minute; your edits are still saved.','暂未收到工作站回执。请稍后再看任务列表，修改仍然保存着。'));
 }
 async function load(){
  const token=owner?.token||submission?.token;
  const info=await api({op:'status'},token);
  online=!!info.online;epoch=info.epoch;
  submitOnline=!!submission && (owner?(await api({op:'status'})).online:online);
  ownerRecent=owner?info.recent??[]:[];
  const ids=[...new Set([...records().map(r=>r.job),...ownerRecent])];
  const results=await Promise.all(ids.map(job=>api({op:'read',job,submissionPreviews:!!submission},token).catch(()=>null)));
  for(const [i,job] of ids.entries())if(results[i])states.set(job,results[i].state);
 }

 // ---- What can be sent ----
 function currentBuild(){
  const current=window.__walkthrough?.revisions?.getState();
  const revision=catalog.revisions.find(r=>r.revisionId===current?.revisionId);
  return {current,revision};
 }
 // The latest submission that carried each suggestion.
 function latestSent(){
  const latest=new Map();
  for(const r of [...records()].sort((a,b)=>(a.sentAt??0)-(b.sentAt??0)))for(const n of r.notes??[])latest.set(n.id,{record:r,version:n.version});
  return latest;
 }
 // Where a saved suggestion stands. Staged suggestions go in the next send:
 // new, edited since sent, or returned because their job stopped or could not build them.
 // Decrypted per-suggestion previews, kept as object URLs for the life of the page.
 const previewUrls=new Map();
 function previewLoader(job,state,id){
  if(!state?.previewIds?.includes(id))return undefined;
  const cacheKey=job+'/'+id;
  return async()=>{
   if(previewUrls.has(cacheKey))return previewUrls.get(cacheKey);
   const key=state.access==='submitter'?submission?.key:owner?.key;
   const token=state.access==='submitter'?submission?.token:owner?.token;
   if(!key||!token)return null;
   const {data}=await api({op:'getPreview',job,id},token);
   if(!data)return null;
   const packet=bytes(data);
   const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:packet.slice(0,12),additionalData:encode.encode(job+'/preview/'+id)},key,packet.slice(12));
   const url=URL.createObjectURL(new Blob([plain],{type:'image/jpeg'}));previewUrls.set(cacheKey,url);return url;
  };
 }
 // Where one saved suggestion stands, what was built, and what the viewer can do next.
 // Groups: attention (needs this viewer), progress, draft (to send), done (published).
 // Edits held by a job that the viewer asked to send again unchanged, keyed by edit id -> held job.
 const resendKey='house-edits-resend';
 const resendMarks=()=>{try{return JSON.parse(localStorage.getItem(resendKey)||'{}')||{};}catch{return {};}};
 function classify(note,latest=latestSent()){
  const sent=latest.get(note.id);
  if(!sent)return {group:'draft',text:label('Draft','草稿'),tone:''};
  if(sent.version!==note.version)return {group:'draft',text:label('Edited since sent','发送后已修改'),tone:''};
  const job=sent.record.job,state=states.get(job);
  if(!state)return {group:'progress',text:label('Sending','发送中'),tone:'active'};
  const outcome=state.outcomes?.find(o=>o.id===note.id),preview=previewLoader(job,state,note.id);
  if(state.stage==='failed')return {group:'draft',text:label('Job stopped · send again','任务已停止 · 可重新发送'),tone:'attention',note:state.reason};
  if(state.stage==='held'||outcome?.status==='review'){
   if(resendMarks()[note.id]===job)return {group:'draft',text:label('Ready to send again','可以重新发送'),tone:''};
   return {group:'attention',text:label('Not built · needs your input','未建模 · 需要你确认'),tone:'attention',note:outcome?.note||state.reason,
    actions:[{id:'resend',label:label('Send again','重新发送'),primary:true}]};
  }
  if(state.stage==='published')return {group:'done',text:label(`Live in ${state.version}`,`已上线于 ${state.version}`),tone:'done',preview};
  if(state.stage==='review'||state.stage==='publishing')return {group:'progress',text:label(`Built in ${state.version} · going live`,`已建入 ${state.version} · 正在上线`),tone:'active',preview};
  const [text,tone]=statusOf(state,!!owner);
  return {group:state.stage==='waiting'&&owner?'attention':'progress',text,tone:tone==='error'?'attention':tone};
 }
 window.__HOUSE_SUGGESTION_ACTION=(note,action)=>{
  const sent=latestSent().get(note.id);if(!sent)return;
  if(action==='resend'){
   // Send the held edit again as it is: the workstation now builds what makes sense as a design.
   const marks=resendMarks();marks[note.id]=sent.record.job;
   try{localStorage.setItem(resendKey,JSON.stringify(marks));}catch{}
   void recount();document.dispatchEvent(new Event('house:suggestions-refresh'));
  }
 };
 window.__HOUSE_SUGGESTION_STATUS=note=>classify(note);
 // Numbers follow the Edits panel, so #1 means the same suggestion everywhere.
 const byCreation=(a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id);
 // Summaries are enough to count and list; only a send reads full notes with their images.
 async function sendable(full=false){
  const {current,revision}=currentBuild();
  if(!revision)return {notes:[],revisionId:current?.revisionId};
  const list=await (full?store.all():store.list()),latest=latestSent();
  const known=new Set(catalog.revisions.map(r=>r.revisionDigest));
  const onBuild=list.filter(n=>known.has(n.model.revisionDigest));
  return {notes:onBuild.filter(n=>classify(n,latest).group==='draft'),all:onBuild,revisionId:revision.revisionId};
 }

 // ---- Footer in the Edits panel ----
 const footer=document.getElementById('suggestions-footer')||(()=>{const f=el('div',null,'sg-footer hs-footer');panel.append(f);return f;})();
 footer.classList.add('hs-footer');
 const footStatus=el('p',null,'hs-foot-status'),dot=el('span',null,'hs-dot'),footText=el('span');
 footStatus.append(dot,footText);
 const openSend=action('',()=>sendFromPanel(),'hs-primary');openSend.id='house-station-button';
 const openJobs=action(label('History','历史'),()=>openDialog(false),'hs-link');openJobs.id='house-station-jobs';
 const jobsBadge=el('span',null,'hs-count');openJobs.append(jobsBadge);
 const ownerLink=action('',()=>{if(owner)signOut();else ownerFile.click();},'hs-link');ownerLink.id='house-station-owner';
 const ownerFile=el('input');ownerFile.type='file';ownerFile.accept='.json,application/json';ownerFile.hidden=true;
 ownerFile.onchange=()=>void signIn(ownerFile.files[0]).finally(()=>{ownerFile.value='';});
 const footLinks=el('div',null,'hs-foot-links');footLinks.append(openJobs,ownerLink,ownerFile);
 const footActions=el('div',null,'hs-foot-actions');footActions.append(openSend);
 footer.append(footStatus,footActions,footLinks);
 let pending={notes:[]},lastLoad=0,loading=null;
 async function refresh(force){
  // A forced refresh (new owner access, a send) must not reuse a load that started before it.
  if(loading){if(!force)return loading;await loading.catch(()=>{});return refresh(true);}
  if(!force&&Date.now()-lastLoad<(anyActive()?8000:20000))return;
  loading=(async()=>{try{await load();lastLoad=Date.now();}catch{online=false;}finally{loading=null;}pending=await sendable().catch(()=>({notes:[]}));paint();})();
  return loading;
 }
 function anyActive(){return [...states.values()].some(s=>s&&ACTIVE.has(s.stage));}
 function paintFooter(){
  const count=pending.notes.length;
  dot.dataset.tone=submitOnline?'done':'error';
  footText.textContent=(submitOnline?label('Workstation online','工作站在线'):label('Workstation offline','工作站离线'))+' · '+
   (count?label(`${count} ready to send`,`${count} 条可发送`):label('nothing new to send','没有新的修改要发送'));
  openSend.textContent=panelSending||(count?label(`Send ${count} to the workstation`,`发送 ${count} 条到工作站`):label('Send to the workstation','发送到工作站'));
  openSend.disabled=!count||!submitOnline||!!panelSending;
  ownerLink.textContent=owner?label('Signed in as owner · sign out','已用站主身份登录 · 退出'):label('Owner sign-in','站主登录');
  const active=[...states.values()].filter(s=>s&&ACTIVE.has(s.stage)).length;
  const attention=[...states.values()].filter(s=>s&&(s.stage==='held'||(s.stage==='review'&&owner))).length;
  jobsBadge.textContent=attention?label(` · ${attention} need you`,` · ${attention} 待处理`):active?label(` · ${active} running`,` · ${active} 进行中`):'';
  jobsBadge.dataset.tone=attention?'attention':active?'active':'';
 }
 let lastNotes=[];
 function paint(){
  paintFooter();paintLive();paintStatus();
  document.dispatchEvent(new Event('house:suggestions-refresh'));
  if(modal.open)renderDialog();
  scheduleLive();
 }
 async function recount(){pending=await sendable().catch(()=>({notes:[]}));paintFooter();}
 document.addEventListener('house:suggestions',event=>{
  lastNotes=event.detail?.notes??[];
  if(event.detail?.page==='list'){void recount();void refresh(false);}
 });
 // Older viewers without the footer slot or render event: refresh when the panel opens.
 new MutationObserver(()=>{paintLive();if(!panel.hidden)void refresh(false);}).observe(panel,{attributes:true,attributeFilter:['hidden']});

 // ---- Live strip above the Edits button ----
 // While a job runs, it shows the step, progress and elapsed time without opening anything.
 const live=action('',()=>openDialog(false),'hs-live');live.id='house-station-live';live.hidden=true;
 const liveDot=el('span',null,'hs-spin'),liveText=el('span',null,'hs-live-text'),liveTitle=el('strong'),liveMeta=el('small'),liveBar=el('span',null,'hs-live-bar'),liveFill=el('i');
 liveText.append(liveTitle,liveMeta);liveBar.append(liveFill);live.append(liveDot,liveText,liveBar);
 const dock=panel.closest('.sg-dock');
 if(dock)dock.insertBefore(live,dock.querySelector('.sg-bar'));else document.body.append(live);
 function featured(){
  const jobs=[...states.entries()].filter(([,s])=>s);
  const pick=test=>jobs.filter(([,s])=>test(s)).sort((a,b)=>(b[1].updated??0)-(a[1].updated??0))[0];
  return pick(s=>['designing','checking','publishing'].includes(s.stage))||pick(s=>s.stage==='waiting')||pick(s=>s.stage==='received')
   ||pick(s=>s.stage==='held'||(s.stage==='review'&&owner))||pick(s=>s.stage==='review');
 }
 function jobStart(state){return state?.history?.[0]?.at??state?.receivedAt??state?.updated;}
 function paintLive(){
  // The panel's own status bar shows the same thing while it is open.
  const entry=panel.hidden?featured():null;
  live.hidden=!entry;if(!entry)return;
  const [,state]=entry,running=ACTIVE.has(state.stage),progress=progressOf(state);
  live.dataset.tone=running?'active':'attention';
  const count=state.outcomes?.length??records().find(r=>r.job===entry[0])?.notes?.length??0;
  if(state.stage==='received'){liveTitle.textContent=statusOf(state,!!owner)[0];}
  else if(running){liveTitle.textContent=stepText(state.step)||statusOf(state,!!owner)[0];}
  else if(state.stage==='waiting')liveTitle.textContent=owner?label('Claude needs you — open the session','Claude 需要你处理，请打开会话'):label('Claude is waiting for the owner','Claude 在等站主');
  else liveTitle.textContent=state.stage==='review'?(owner?label(`Revision ${state.version} is built and going live`,`版本 ${state.version} 已建好，正在上线`):label(`Revision ${state.version} is built and going live`,`版本 ${state.version} 已建好，正在上线`)):label('A job needs your input','有任务需要你确认');
  const parts=[];
  if(running&&state.stage!=='received')parts.push(label(`Step ${progress.index} of ${progress.total}`,`第 ${progress.index}/${progress.total} 步`));
  if(running)parts.push(duration(Date.now()-jobStart(state)));
  if(count)parts.push(label(`${count} edit${count>1?'s':''}`,`${count} 条修改`));
  if(state.message&&(running||state.stage==='waiting'))parts.unshift(state.message);
  liveMeta.textContent=parts.join(' · ');
  liveBar.hidden=!running;liveFill.style.width=Math.round(progress.fraction*100)+'%';
  live.setAttribute('aria-label',liveTitle.textContent+'. '+liveMeta.textContent);
 }
 // While a job runs: tick the clock every second and ask the relay every 5 s.
 let liveTick=0,liveFetch=0;
 function scheduleLive(){
  const running=anyActive();
  if(running&&!liveTick)liveTick=setInterval(paintLive,1000);
  if(!running&&liveTick){clearInterval(liveTick);liveTick=0;}
  clearTimeout(liveFetch);
  if(running&&!modal.open)liveFetch=setTimeout(()=>void refresh(true),5000);
 }

 // ---- Jobs dialog ----
 const modal=el('dialog',null,'house-station');modal.setAttribute('aria-labelledby','hs-title');document.body.append(modal);
 const head=el('header'),title=el('h2',null),pill=el('span',null,'hs-pill'),close=action('×',()=>modal.close(),'hs-close');
 title.id='hs-title';close.setAttribute('aria-label',label('Close','关闭'));head.append(title,pill,close);
 const lede=el('p',null,'hs-lede'),sendBox=el('section',null,'hs-send'),jobsBox=el('section',null,'hs-jobs');
 const status=el('p',null,'hs-status');status.setAttribute('role','status');
 const ownerTools=el('details',null,'hs-owner'),ownerHeading=el('summary'),upload=el('input');
 upload.type='file';upload.accept='.json,application/json';ownerTools.append(ownerHeading,upload);
 modal.append(head,lede,sendBox,status,jobsBox,ownerTools);
 let working=false,timer=0,confirming=null,sendStage='';
 const say=text=>{status.textContent=text||'';status.hidden=!text;};
 async function guard(work){
  if(working)return;working=true;renderDialog();
  try{await work();}catch(e){say(e.message);}finally{working=false;renderDialog();}
 }
 function schedule(){clearTimeout(timer);if(modal.open)timer=setTimeout(async()=>{await refresh(true);schedule();},anyActive()?4000:15000);}
 async function openDialog(focusSend){
  if(document.pointerLockElement)document.exitPointerLock();
  say('');renderDialog();modal.showModal();
  await refresh(true);schedule();
  if(focusSend)sendBox.querySelector('button')?.focus();
 }
 modal.onclose=()=>{clearTimeout(timer);confirming=null;};
 // Escape closes only the dialog, not the Edits panel behind it, even when focus left the dialog.
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&modal.open){event.stopPropagation();modal.close();}},true);
 modal.tabIndex=-1;

 function renderSend(){
  const count=pending.notes.length,box=[];
  if(!submission)box.push(el('p',unavailable(),'hs-muted'));
  else if(!count)box.push(el('p',pending.all?.length?label('Every edit has been sent. Change one or add a new one to send again.','所有修改都已发送。更改或新增修改后可以再次发送。'):label('No saved edits yet. Add one in the Edits panel.','还没有保存的修改。请先在修改面板中新增。'),'hs-muted'));
  else{
   box.push(el('p',label(`${count} edit${count>1?'s':''} ready to send:`,`${count} 条修改可以发送：`),'hs-send-title'));
   const list=el('ol',null,'hs-send-list');
   for(const n of pending.notes){const number=lastNotes.find(x=>x.id===n.id)?.number;const item=el('li',n.title||n.text||label('Image reference','参考图'));if(number)item.value=number;list.append(item);}
   box.push(list);
  }
  const send=action(sendStage||label(`Send ${count} to the workstation`,`发送 ${count} 条到工作站`),()=>guard(submit),'hs-primary');
  send.disabled=working||!count||!submitOnline;
  if(count||sendStage)box.push(send);
  if(count&&!submitOnline&&submission)box.push(el('p',offlineText(),'hs-muted'));
  sendBox.replaceChildren(...box);
 }
 async function submit(){
  const {notes:unsorted,revisionId}=await sendable(true);
  if(!unsorted.length)throw Error(label('Nothing new to send.','没有新的修改要发送。'));
  const notes=[...unsorted].sort(byCreation).map(n=>({...n,number:lastNotes.find(x=>x.id===n.id)?.number}));
  const live=await api({op:'status'});if(!live.online)throw Error(offlineText());
  const bundle=exportSuggestions(catalog.projectId,notes);delete bundle.exportedAt;
  const bare=encode.encode(JSON.stringify(bundle));
  const raw=encode.encode(JSON.stringify({bundle,buildAccess:submission.buildAccess}));
  if(raw.length>48*1024*1024)throw Error(label('Send fewer reference images at a time.','请分批发送参考图。'));
  const digest=hex(await crypto.subtle.digest('SHA-256',raw));
  const idKey='house-submission-id/'+hex(await crypto.subtle.digest('SHA-256',bare));
  let job=localStorage.getItem(idKey)||crypto.randomUUID();
  if(['failed','held'].includes((await api({op:'read',job})).state?.stage))job=crypto.randomUUID();
  localStorage.setItem(idKey,job);
  remember({job,sentAt:Date.now(),revisionId,notes:notes.map(n=>({id:n.id,version:n.version,number:lastNotes.find(x=>x.id===n.id)?.number,text:(n.text||'').slice(0,160)}))});
  const old=(await api({op:'read',job})).state;
  if(old){states.set(job,old);say(label('The workstation already has these edits.','工作站已收到这批修改。'));return;}
  const step=555000,count=Math.ceil(raw.length/step);
  for(let i=0;i<count;i++){
   sendStage=label(`Sending ${i+1} of ${count}…`,`正在发送 ${i+1} / ${count}…`);renderSend();panelSending=sendStage;paintFooter();
   await api({op:'chunk',job,epoch:live.epoch,index:i,data:await seal(submission.key,raw.slice(i*step,(i+1)*step),job+'/'+i)});
  }
  sendStage=label('Waiting for the workstation…','等待工作站回执…');renderSend();panelSending=sendStage;paintFooter();
  try{await command({op:'submit',job,epoch:live.epoch,count,digest},s=>!!s);}
  finally{sendStage='';panelSending='';}
  say(label('Received. Follow it in the list below.','工作站已收到。可在下方列表跟进。'));
  pending=await sendable();lastLoad=0;schedule();
 }

 let panelSending='',panelNotice='',publishConfirm=null;
 async function sendFromPanel(){
  if(panelSending)return;
  panelNotice='';
  try{await submit();panelNotice=label('Sent. Each edit shows its progress below.','已发送。每条修改的进度显示在下方。');}
  catch(e){panelNotice=e.message;}
  finally{panelSending='';await refresh(true);}
 }

 // ---- Status bar at the top of the Edits panel ----
 const bar=document.getElementById('suggestions-status');
 // Every job that matters now: running first, then the most recent, at most three.
 function relevantJobs(){
  const now=Date.now(),rank=s=>['designing','checking','publishing'].includes(s.stage)?0:s.stage==='received'?1:2;
  return [...states.entries()].filter(([,s])=>s&&(['received','designing','checking','publishing','waiting','review'].includes(s.stage)
   ||(s.stage==='held'&&now-(s.updated??0)<86400e3)||(s.stage==='published'&&now-(s.updated??0)<6*3600e3)))
   .sort((a,b)=>rank(a[1])-rank(b[1])||(b[1].updated??0)-(a[1].updated??0)).slice(0,3);
 }
 function paintStatus(){
  if(!bar)return;
  const nodes=[],entries=relevantJobs();
  for(const [job,state] of entries){
   const block=el('div',null,'hs-block');nodes.push(block);
   const push=node=>block.append(node);
   statusEntry(job,state,push);
  }
  if(!entries.length&&!submitOnline)nodes.push(el('p',offlineText(),'hs-muted'));
  if(panelNotice)nodes.push(el('p',panelNotice,'hs-notice'));
  bar.replaceChildren(...nodes);
 }
 function statusEntry(job,state,push){
  const nodes={push};
  {
   const running=['received','designing','checking','publishing'].includes(state.stage);
   const head=el('div',null,'hs-bar-head');
   if(running){
    const {index,total,fraction}=progressOf(state);
    head.append(el('strong',state.stage==='received'?statusOf(state,!!owner)[0]:stepText(state.step)||statusOf(state,!!owner)[0]),
     el('small',[state.version||state.stage==='publishing'?label(`Revision ${state.version}`,`版本 ${state.version}`):'',state.stage!=='received'?label(`step ${index} of ${total}`,`第 ${index}/${total} 步`):'',duration(Date.now()-jobStart(state))].filter(Boolean).join(' · '),'hs-muted'));
    nodes.push(head);
    const meter=el('div',null,'hs-bar');const fill=el('i');fill.style.width=Math.round(fraction*100)+'%';meter.append(fill);nodes.push(meter);
    if(state.message)nodes.push(el('p',state.message,'hs-claude'));
   }else if(state.stage==='waiting'){
    head.append(el('strong',owner?label('Claude needs you','Claude 需要你处理'):label('Claude is waiting for the owner','Claude 在等站主')));nodes.push(head);
    if(state.reason)nodes.push(el('p',state.reason));
   }else if(state.stage==='review'){
    const built=(state.outcomes||[]).filter(o=>o.status==='built'),held=(state.outcomes||[]).filter(o=>o.status!=='built');
    head.append(el('strong',label(`Revision ${state.version} is ready`,`版本 ${state.version} 已建好`)),
     el('small',[label(`${built.length} built`,`${built.length} 条已建`),held.length?label(`${held.length} need input`,`${held.length} 条需确认`):''].filter(Boolean).join(' · '),'hs-muted'));
    nodes.push(head);
    if(!owner)nodes.push(el('p',label('It goes live once the website checks pass.','网站检查通过后会自动上线。'),'hs-muted'));
    else{
     if(publishConfirm===job){
      nodes.push(el('p',label(`Publishing pushes commit ${state.commit.slice(0,7)} to bznick98/zbao_portfolio, opens a pull request and merges it once the Vercel preview passes.`,`发布会把提交 ${state.commit.slice(0,7)} 推送到 bznick98/zbao_portfolio，新建 PR，并在 Vercel 预览通过后合并。`)));
      const row=el('div',null,'hs-row');
      row.append(action(label(`Publish ${state.version}`,`发布 ${state.version}`),()=>void publishFromPanel(job,state),'hs-primary'),action(label('Cancel','取消'),()=>{publishConfirm=null;paintStatus();},'hs-secondary'));
      row.dataset.confirm='';
      nodes.push(row);
     }else{
      nodes.push(el('p',label('The workstation publishes it automatically. If it is set to wait for you, publish it here.','工作站会自动发布；若设置为等待站主，可在此发布。'),'hs-muted'));
      const go=action(label(`Publish ${state.version}…`,`发布 ${state.version}…`),()=>{publishConfirm=job;paintStatus();},'hs-secondary');go.disabled=!online;nodes.push(go);
     }
    }
   }else if(state.stage==='published'){
    head.append(el('strong',label(`Revision ${state.version} is live on zbao.art`,`版本 ${state.version} 已在 zbao.art 上线`)),el('small',label('Reload House to see it.','重新打开 House 即可看到。'),'hs-muted'));nodes.push(head);
   }else if(state.stage==='held'){
    head.append(el('strong',label('Nothing could be built yet','暂时没有可以建的修改')));nodes.push(head);
    if(state.reason)nodes.push(el('p',state.reason,'hs-muted'));
   }
   if(owner&&state.session?.url&&['designing','waiting'].includes(state.stage)){
    const open=el('a',state.stage==='waiting'?label('Open in Claude to continue','在 Claude 中打开并继续'):label('Open the Claude session','打开 Claude 会话'),'hs-session');
    open.href=state.session.url;open.target='_blank';open.rel='noopener';open.dataset.tone=state.stage==='waiting'?'attention':'';nodes.push(open);
   }
  }
 }
 function recentlyPublished(){
  return [...states.entries()].filter(([,s])=>s?.stage==='published'&&Date.now()-(s.updated??0)<6*3600e3).sort((a,b)=>b[1].updated-a[1].updated)[0];
 }
 async function publishFromPanel(job,state){
  try{
   await command({op:'publish',epoch,job,version:state.version,commit:state.commit,confirm:true},s=>['publishing','published','failed'].includes(s?.stage),owner.token);
   publishConfirm=null;panelNotice=label('Publishing started. Each step shows here.','开始发布，进度会显示在这里。');
  }catch(e){panelNotice=e.message;}
  await refresh(true);
 }

 // ---- Owner sign-in, remembered on this device encrypted with the House key ----
 const ownerStore='house-owner/'+catalog.projectId;
 async function useOwner(cred){
  if(cred.schema!==1||cred.role!=='owner'||cred.project!==catalog.projectId||![cred.token,cred.key].every(t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t)))throw Error(label('Choose the owner pairing file.','请选择站主配对文件。'));
  await api({op:'status'},cred.token);
  const key=await crypto.subtle.importKey('raw',Uint8Array.from(cred.key.match(/../g),v=>parseInt(v,16)),{name:'AES-GCM'},false,['encrypt','decrypt']);
  owner={token:cred.token,key};
 }
 async function signIn(file){
  if(!file)return;
  try{
   const cred=JSON.parse(await file.text());await useOwner(cred);
   if(privacy?.key){
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const sealed=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encode.encode(ownerStore)},privacy.key,encode.encode(JSON.stringify(cred))));
    try{localStorage.setItem(ownerStore,JSON.stringify({iv:base64(iv),data:base64(sealed)}));}catch{}
   }
   panelNotice=label('Signed in as owner on this device.','已在这台设备上用站主身份登录。');
  }catch(e){panelNotice=e.message;}
  ownerTools.open=false;await refresh(true);
 }
 function signOut(){owner=null;try{localStorage.removeItem(ownerStore);}catch{}panelNotice='';void refresh(true);}
 async function restoreOwner(){
  try{
   const saved=JSON.parse(localStorage.getItem(ownerStore)||'null');if(!saved||!privacy?.key)return;
   const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(saved.iv),additionalData:encode.encode(ownerStore)},privacy.key,bytes(saved.data));
   await useOwner(JSON.parse(new TextDecoder().decode(plain)));
  }catch{}
 }

 function timeline(state){
  const reached=phaseOf(state),stopped=state&&['held','failed'].includes(state.stage);
  const list=el('ol',null,'hs-timeline');
  for(const [i,[en,zh]] of PHASES.entries()){
   const item=el('li',label(en,zh));
   item.dataset.state=i<reached||state?.stage==='published'?'done':i===reached?(stopped?'stopped':'current'):'todo';
   list.append(item);
  }
  return list;
 }
 async function previewImage(state){
  const key=state.access==='submitter'?submission?.key:owner?.key;
  if(!state.preview||!key)return null;
  try{
   const packet=bytes(state.preview);
   const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:packet.slice(0,12),additionalData:encode.encode(state.job+'/preview')},key,packet.slice(12));
   return URL.createObjectURL(new Blob([plain],{type:'image/jpeg'}));
  }catch{return null;}
 }
 const previews=new Map(),expanded=new Set();
 // Expanded sections stay open when the list is rebuilt.
 function disclosure(key,summary,content,className){
  const node=el('details',null,className);node.open=expanded.has(key);
  node.ontoggle=()=>{if(node.open)expanded.add(key);else expanded.delete(key);};
  node.append(el('summary',summary),content);return node;
 }
 // The running job's progress: bar, step N of M, elapsed time and a checklist with durations.
 function progressPanel(state){
  const box=el('div',null,'hs-progress'),{index,total,fraction,steps}=progressOf(state);
  const started=jobStart(state),history=state.history??[];
  const head=el('div',null,'hs-progress-head');
  head.append(el('strong',stepText(state.step)||statusOf(state,!!owner)[0]),
   el('small',label(`Step ${index} of ${total} · ${duration(Date.now()-started)} elapsed`,`第 ${index}/${total} 步 · 已用 ${duration(Date.now()-started)}`),'hs-muted'));
  const bar=el('div',null,'hs-bar'),fill=el('i');fill.style.width=Math.round(fraction*100)+'%';bar.append(fill);
  bar.setAttribute('role','progressbar');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(total));bar.setAttribute('aria-valuenow',String(index));
  const list=el('ol',null,'hs-checklist');
  const at=step=>history.findIndex(h=>h.step===step);
  for(const step of steps){
   const i=at(step),item=el('li'),current=step===state.step;
   const done=i>=0&&!current&&steps.indexOf(step)<steps.indexOf(state.step);
   item.dataset.state=current?'current':done?'done':'todo';
   const end=current?Date.now():history[i+1]?.at;
   item.append(el('span',stepText(step)),el('small',i>=0&&end?duration(end-history[i].at):'','hs-muted'));
   list.append(item);
  }
  box.append(head,bar);
  if(state.message)box.append(el('p',state.message,'hs-claude'));
  box.append(disclosure('steps:'+state.job,label('All steps','全部步骤'),list,'hs-steps'));
  return box;
 }
 function card(job,state,record){
  const article=el('article',null,'hs-job');article.dataset.stage=state?.stage??'sending';
  const top=el('div',null,'hs-job-top'),[text,tone]=statusOf(state,!!owner,true);
  const chip=el('span',text,'hs-chip');chip.dataset.tone=tone;
  const count=state?.outcomes?.length??record?.notes?.length??0;
  const name=el('strong',[count?label(`${count} edit${count>1?'s':''}`,`${count} 条修改`):label('Job','任务'),
   record?.revisionId||state?.version?`${label('rev','版本')} ${record?.revisionId??'?'}${state?.version?' → '+state.version:''}`:''].filter(Boolean).join(' · '));
  const when=el('small',ago(record?.sentAt??state?.receivedAt??state?.updated),'hs-muted');
  top.append(chip,name,when);article.append(top);
  const running=state&&['designing','checking','publishing','waiting'].includes(state.stage);
  if(running)article.append(progressPanel(state));else article.append(timeline(state));
  // The owner can watch or continue the job's Claude session in the Claude app or claude.ai.
  if(owner&&state?.session?.url&&['designing','waiting','held','failed','review'].includes(state.stage)){
   const open=el('a',state.stage==='waiting'?label('Open in Claude to continue','在 Claude 中打开并继续'):label('Open the Claude session','打开 Claude 会话'),'hs-session');
   open.href=state.session.url;open.target='_blank';open.rel='noopener';open.dataset.tone=state.stage==='waiting'?'attention':'';
   article.append(open);
  }
  if(state?.reason)article.append(el('p',state.reason,state.stage==='held'?'hs-reason hs-attention':'hs-reason'));
  // Per-suggestion outcomes, falling back to what this device sent.
  const outcomes=state?.outcomes??(record?.notes??[]).map(n=>({id:n.id,text:n.text,status:null}));
  if(outcomes.length){
   const list=el('ul',null,'hs-outcomes');
   for(const o of outcomes){
    const number=record?.notes?.find(n=>n.id===o.id)?.number??lastNotes.find(n=>n.id===o.id)?.number;
    const item=el('li');item.dataset.status=o.status??'sent';
    const mark=el('span',o.status==='built'?'✓':o.status==='review'?'!':'·','hs-mark');
    const body=el('span',null,'hs-body');body.append(el('span',(number?'#'+number+' ':'')+(o.text||label('Image reference','参考图'))));
    if(o.status==='built')body.append(el('small',label('Built','已建模'),'hs-muted'));
    if(o.status==='review')body.append(el('small',label('Not built — ','未建模——')+(o.note||label('needs your decision.','需要你确认。'))));
    item.append(mark,body);
    // A suggestion saved on this device can be reopened, edited and staged again.
    if(lastNotes.some(n=>n.id===o.id)){
     const editing=action(label('Edit','编辑'),()=>{modal.close();document.dispatchEvent(new CustomEvent('house:edit-suggestion',{detail:{id:o.id}}));},'hs-edit');
     editing.setAttribute('aria-label',label('Change edit','更改修改')+(number?' #'+number:''));item.append(editing);
    }
    list.append(item);
   }
   article.append(list);
  }
  if(state?.preview){
   // Decrypted previews are kept as object URLs for the life of the page.
   const holder=el('div',null,'hs-preview');article.append(holder);
   const show=url=>{const img=el('img');img.alt=label('Candidate render','候选版本实渲');img.src=url;holder.append(img);};
   const key=job+state.preview.length+state.preview.slice(-16);
   if(previews.has(key))show(previews.get(key));
   else previewImage(state).then(url=>{if(url){previews.set(key,url);show(url);}});
  }
  if(state?.detail&&['review','publishing','published','held'].includes(state.stage)&&state.detail.length>40){
   article.append(disclosure(job+':notes',label('Designer notes','设计说明'),el('p',state.detail),'hs-detail'));
  }
  const actions=el('div',null,'hs-actions');
  if(state?.stage==='review'){
   if(owner&&online){
    if(confirming===job){
     const box=el('div',null,'hs-confirm');
     box.append(el('p',label(`Publishing pushes commit ${state.commit.slice(0,7)} to bznick98/zbao_portfolio as house/job-${job.slice(0,8)}…, opens a pull request, and merges it once the Vercel preview passes.`,
      `发布会把提交 ${state.commit.slice(0,7)} 推送到 bznick98/zbao_portfolio 的 house/job-${job.slice(0,8)}… 分支，新建 PR，并在 Vercel 预览通过后合并。`)));
     const yes=action(label('Confirm and publish','确认发布'),()=>guard(async()=>{
      await command({op:'publish',epoch,job,version:state.version,commit:state.commit,confirm:true},s=>['publishing','published','failed'].includes(s?.stage),owner.token);
      confirming=null;say(label('Publishing started.','开始发布。'));lastLoad=0;schedule();
     }),'hs-primary');
     const row=el('div',null,'hs-row');row.append(yes,action(label('Cancel','取消'),()=>{confirming=null;renderDialog();},'hs-secondary'));box.append(row);
     actions.append(box);
    }else actions.append(action(label(`Publish ${state.version} now`,`立即发布 ${state.version}`),()=>{confirming=job;renderDialog();},'hs-primary'));
   }else if(owner)actions.append(el('p',offlineText(),'hs-muted'));
   else actions.append(el('p',label('Each built update goes live after the website checks pass.','每次建好的更新会在网站检查通过后上线。'),'hs-muted'));
  }
  if(state?.stage==='waiting'&&!owner)actions.append(el('p',label('Claude paused for the owner. The job continues once the owner answers.','Claude 暂停了，等站主处理后会继续。'),'hs-muted'));
  if(state?.stage==='held')actions.append(el('p',label('In the Edits panel, choose Send again on the flagged edits, or Change them first, then send.','在修改面板中对标出的修改选择“重新发送”，或先更改再发送。'),'hs-muted'));
  if(state?.pr){const a=el('a',label('View pull request','查看 PR'));a.href=state.pr;a.target='_blank';a.rel='noopener';actions.append(a);}
  if(actions.childNodes.length)article.append(actions);
  if(state?.history?.length>1){
   const list=el('ol');
   for(const h of state.history)list.append(el('li',`${clock(h.at)} · ${statusOf(h,!!owner)[0]}`));
   article.append(disclosure(job+':history',label('History','历史'),list,'hs-history'));
  }
  return article;
 }
 let shown='';
 function renderDialog(){
  // Rebuild only when something visible changed, so reading and focus are not disturbed.
  const signature=JSON.stringify([[...states],owner?1:0,online,submitOnline,pending.notes.map(n=>n.id+n.version),working,confirming,sendStage,document.documentElement.lang,Math.floor(Date.now()/(anyActive()?5000:60000))]);
  if(signature===shown&&jobsBox.childNodes.length)return;
  shown=signature;
  title.textContent=label('Workstation','工作站');
  pill.textContent=submitOnline||online?label('Online','在线'):label('Offline','离线');pill.dataset.tone=submitOnline||online?'done':'error';
  lede.textContent=label('The workstation updates the model from your edits, checks the result and publishes it on zbao.art. Each update is saved as a revision you can go back to.','工作站会根据你的修改更新模型，检查后发布到 zbao.art。每次更新都会保存为一个可回看的版本。');
  ownerHeading.textContent=owner?label('Signed in as owner','已用站主身份登录'):label('Owner sign-in','站主登录');
  upload.setAttribute('aria-label',label('Choose the owner pairing file','选择站主配对文件'));
  upload.hidden=!!owner;
  renderSend();
  const mine=new Map(records().map(r=>[r.job,r]));
  const ids=[...new Set([...mine.keys(),...ownerRecent])].filter(job=>states.get(job)||mine.get(job)?.sentAt);
  const time=job=>mine.get(job)?.sentAt??states.get(job)?.receivedAt??states.get(job)?.updated??0;
  ids.sort((a,b)=>time(b)-time(a));
  const stage=job=>states.get(job)?.stage;
  const sections=[
   [label('Now running','正在运行'),ids.filter(job=>['designing','checking','publishing'].includes(stage(job)))],
   [label('Waiting in queue','排队中'),ids.filter(job=>!states.get(job)||stage(job)==='received')],
   [label('Needs attention','待处理'),ids.filter(job=>['waiting','review','held'].includes(stage(job)))],
   [label('History','历史'),ids.filter(job=>['published','failed'].includes(stage(job)))],
  ];
  const nodes=[];
  if(!ids.length)nodes.push(el('p',label('No jobs yet. Sent edits appear here with their progress.','还没有任务。发送的修改会在这里显示进度。'),'hs-muted'));
  for(const [heading,jobs] of sections){
   if(!jobs.length)continue;
   nodes.push(el('h3',heading));
   for(const job of jobs)nodes.push(card(job,states.get(job),mine.get(job)));
  }
  jobsBox.replaceChildren(...nodes);
  for(const button of modal.querySelectorAll('.hs-actions button'))button.disabled=working;
  if(modal.open&&!modal.contains(document.activeElement))modal.focus({preventScroll:true});
 }
 upload.onchange=()=>void signIn(upload.files[0]).finally(()=>{upload.value='';});
 new MutationObserver(()=>paint()).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 void restoreOwner().finally(()=>refresh(true));
}
