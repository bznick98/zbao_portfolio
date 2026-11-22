import {openSuggestions,exportSuggestions} from './suggestion-store.js';

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

export function installWorkstation(catalog,privacy,submission){
 const panel=document.getElementById('suggestions-panel');
 if(!panel||!catalog?.projectId)return;
 const control=document.createElement('button');control.type='button';control.id='house-station-button';
 control.textContent=label('Send to workstation','提交到工作站');
 function attach(){const list=panel.querySelector('.sg-list');if(list&&!panel.contains(control))list.after(control);}
 new MutationObserver(attach).observe(panel,{childList:true,subtree:true});attach();
 const modal=document.createElement('dialog');modal.className='house-station';document.body.append(modal);
 const title=document.createElement('h2'),status=document.createElement('p'),jobs=document.createElement('section'),close=document.createElement('button');
 title.textContent=label('Model revisions','模型修订');close.textContent=label('Close','关闭');close.onclick=()=>modal.close();status.role='status';
 const upload=document.createElement('input');upload.type='file';upload.accept='.json,application/json';
 upload.setAttribute('aria-label',label('Pair with your owner file','选择站主配对文件'));
 const ownerTools=document.createElement('details'),ownerHeading=document.createElement('summary');
 ownerHeading.textContent=label('Owner publishing access','站主发布权限');ownerTools.append(ownerHeading,upload);
 const send=document.createElement('button');send.textContent=label('Submit current revision’s suggestions','提交当前版本的建议');send.disabled=true;
 modal.append(title,status,send,jobs,ownerTools,close);
 const historyKey='house-station-recent/'+catalog.projectId;
 function history(){
  try{return JSON.parse(localStorage.getItem(historyKey)||'[]').filter(id=>typeof id==='string').slice(0,8);}catch{return [];}
 }
 function remember(id){localStorage.setItem(historyKey,JSON.stringify([id,...history().filter(old=>old!==id)].slice(0,8)));}
 let owner,working=false,timer=0,sequence=0,canSend=false;
 const say=t=>{status.textContent=t;};
 const offline=()=>label('Workstation offline. Your suggestions are saved on this device.','工作站离线。建议已保存在这台设备上。');
 const unavailable=()=>label('Submission access unavailable. Reopen House and try again.','提交权限暂不可用，请重新进入 House 后重试。');
 const api=async (body,token=submission?.token)=>{
  if(!token)throw Error(unavailable());
  const r=await fetch('/api/house-jobs',{method:'POST',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:AbortSignal.timeout(17000)});
  if(!r.ok)throw Error(r.status===503?offline():r.status===403||r.status===401?label('Access denied.','访问被拒绝。'):label('Request failed. Please retry.','请求失败，请重试。'));return r.json();
 };
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function command(cmd,accepted,token){
  for(let attempt=0;attempt<18;attempt++){
   const {online,state}=await api({op:'read',job:cmd.job},token);
   if(accepted(state))return;
   if(!online)throw Error(offline());
   if(attempt%3===0)await api(cmd,token);
   await sleep(2800);
  }
  throw Error(label('No workstation receipt yet. You can reopen to check status; your local suggestions are saved.','尚未收到工作站回执。可重新查看状态，本机建议仍然保留。'));
 }
 async function guard(work){
  if(working)return;working=true;sequence++;send.disabled=true;
  try{await work();}catch(e){say(e.message);}finally{working=false;send.disabled=!canSend;}
 }
 async function refresh(){
  if(!modal.open||working)return;
  const current=++sequence;
  try{
   const statusToken=owner?.token||submission?.token;
   const info=await api({op:'status'},statusToken);
   const submitOnline=submission && (owner?(await api({op:'status'})).online:info.online);
   const ids=owner?info.recent:history();
   const states=await Promise.all(ids.map(job=>api({op:'read',job,submissionPreviews:!!submission},statusToken)));
   if(current!==sequence||!modal.open)return;
   canSend=!!submitOnline;send.disabled=!canSend;
   say(!submission?unavailable():canSend?label('Workstation online','工作站在线'):offline());
   const fragment=document.createDocumentFragment();
   for(const {state:s} of states){
    if(!s)continue;
    const item=document.createElement('article'),detail=document.createElement('p');
    detail.textContent=(s.version?'v'+s.version+' · ':'')+s.stage+' — '+s.detail;item.append(detail);
    const previewKey=s.access==='submitter'?submission?.key:owner?.key;
    if(s.preview&&previewKey){const packet=bytes(s.preview),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:packet.slice(0,12),additionalData:encode.encode(s.job+'/preview')},previewKey,packet.slice(12));const img=document.createElement('img'),url=URL.createObjectURL(new Blob([plain],{type:'image/jpeg'}));img.onload=img.onerror=()=>URL.revokeObjectURL(url);img.alt=label('Candidate render','候选版本实渲');img.src=url;item.append(img);}
    if(s.pr){const a=document.createElement('a');a.href=s.pr;a.textContent=label('View pull request','查看 PR');a.target='_blank';a.rel='noopener';item.append(a);}
    if(owner&&s.stage==='review'&&info.online){
     const approve=document.createElement('button');approve.textContent=label('Publish this revision','发布这个版本');
     approve.onclick=()=>guard(async()=>{
      const branch='house/job-'+s.job;
      const question='bznick98/zbao_portfolio · '+branch+' → main\n'+s.commit+'\n'+label('Push this commit, open a PR and merge once the Vercel preview passes?','确认推送此提交、新建 PR，并在 Vercel 预览通过后合并？');
      if(!window.confirm(question))return;
      await command({op:'publish',epoch:info.epoch,job:s.job,version:s.version,commit:s.commit,confirm:true},state=>['publishing','published','failed'].includes(state?.stage),owner.token);
      say(label('Publishing request received.','工作站已收到发布请求。'));
     });item.append(approve);
    }
    fragment.append(item);
   }
   if(current===sequence&&modal.open)jobs.replaceChildren(fragment);
  }catch(e){if(current===sequence){canSend=false;send.disabled=true;say(e.message);}}
 }
 upload.onchange=()=>guard(async()=>{
  const file=upload.files[0];if(!file)return;upload.value='';
  const cred=JSON.parse(await file.text());
  if(cred.schema!==1||cred.role!=='owner'||cred.project!==catalog.projectId||![cred.token,cred.key].every(t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t)))throw Error(label('Choose the owner pairing file.','请选择站主配对文件。'));
  await api({op:'status'},cred.token);
  const key=await crypto.subtle.importKey('raw',Uint8Array.from(cred.key.match(/../g),v=>parseInt(v,16)),{name:'AES-GCM'},false,['encrypt','decrypt']);
  owner={token:cred.token,key};ownerTools.open=false;setTimeout(refresh,0);
 });
 send.onclick=()=>guard(async()=>{
  const current=window.__walkthrough?.revisions?.getState();
  const revision=catalog.revisions.find(r=>r.revisionId===current?.revisionId);
  const list=await openSuggestions(catalog.projectId,privacy).all();
  const notes=list.filter(n=>n.model.revisionDigest===revision?.revisionDigest && n.model.buildId===current.buildId);
  if(!notes.length)throw Error(label('No saved suggestions on this build.','这个模型版本还没有保存的建议。'));
  const {online,epoch}=await api({op:'status'});if(!online)throw Error(offline());
  const bundle=exportSuggestions(catalog.projectId,notes);delete bundle.exportedAt;
  if(!submission)throw Error(unavailable());
  const bare=encode.encode(JSON.stringify(bundle));
  const raw=encode.encode(JSON.stringify({bundle,buildAccess:submission.buildAccess}));
  if(raw.length>48*1024*1024)throw Error(label('Send fewer reference images per submission.','请分批提交参考图。'));
  const digest=hex(await crypto.subtle.digest('SHA-256',raw));
  const idKey='house-submission-id/'+hex(await crypto.subtle.digest('SHA-256',bare));
  let job=localStorage.getItem(idKey)||crypto.randomUUID();
  if((await api({op:'read',job})).state?.stage==='failed')job=crypto.randomUUID();
  localStorage.setItem(idKey,job);remember(job);
  const old=(await api({op:'read',job})).state;if(old){say(label('This submission already has a workstation receipt.','这批建议已收到工作站回执。'));return;}
  const step=555000,count=Math.ceil(raw.length/step);
  for(let i=0;i<count;i++){
   say(label('Sending attachments ','正在传送附件 ')+(i+1)+' / '+count);
   await api({op:'chunk',job,epoch,index:i,data:await seal(submission.key,raw.slice(i*step,(i+1)*step),job+'/'+i)});
  }
  say(label('Waiting for workstation receipt…','等待工作站回执…'));
  await command({op:'submit',job,epoch,count,digest},s=>!!s);
  say(label('Saved on workstation.','工作站已保存。'));
 });
 control.onclick=()=>{modal.showModal();say(label('Checking workstation…','正在连接工作站…'));void refresh();timer=setInterval(refresh,10000);};
 modal.onclose=()=>{clearInterval(timer);sequence++;};
}
