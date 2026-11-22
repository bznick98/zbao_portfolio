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

export function installWorkstation(catalog,privacy){
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
 const unlock=document.createElement('input');unlock.type='password';unlock.autocomplete='off';
 unlock.placeholder=label('House password for this build','本次构建的 House 密码');unlock.setAttribute('aria-label',unlock.placeholder);
 const send=document.createElement('button');send.textContent=label('Submit current revision’s suggestions','提交当前版本的建议');send.disabled=true;
 modal.append(title,status,upload,unlock,send,jobs,close);
 let credentials,key,working=false,timer=0;
 const say=t=>{status.textContent=t;};
 const offline=()=>label('Workstation offline. Your suggestions are saved on this device.','工作站离线。建议已保存在这台设备上。');
 const api=async body=>{
  const r=await fetch('/api/house-jobs',{method:'POST',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json',Authorization:'Bearer '+credentials.token},body:JSON.stringify(body),signal:AbortSignal.timeout(17000)});
  if(!r.ok)throw Error(r.status===503?offline():r.status===403||r.status===401?label('Device pairing failed.','设备配对失败。'):label('Request failed. Please retry.','请求失败，请重试。'));return r.json();
 };
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function command(cmd,accepted){
  for(let attempt=0;attempt<18;attempt++){
   const {online,state}=await api({op:'read',job:cmd.job});
   if(accepted(state))return;
   if(!online)throw Error(offline());
   if(attempt%3===0)await api(cmd);
   await sleep(2800);
  }
  throw Error(label('No workstation receipt yet. You can reopen to check status; your local suggestions are saved.','尚未收到工作站回执。可重新查看状态，本机建议仍然保留。'));
 }
 async function guard(work){
  if(working)return;working=true;send.disabled=true;
  try{await work();}catch(e){say(e.message);}finally{working=false;}
 }
 async function refresh(){
  if(!credentials||!modal.open||working)return;
  try{
   const info=await api({op:'status'});send.disabled=!info.online;
   say(info.online?label('Workstation online','工作站在线'):offline());
   const states=await Promise.all(info.recent.map(job=>api({op:'read',job})));
   jobs.replaceChildren();
   for(const {state:s} of states){
    if(!s)continue;
    const item=document.createElement('article'),detail=document.createElement('p');
    detail.textContent=(s.version?'v'+s.version+' · ':'')+s.stage+' — '+s.detail;item.append(detail);
    if(s.preview){const packet=bytes(s.preview),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:packet.slice(0,12),additionalData:encode.encode(s.job+'/preview')},key,packet.slice(12));const img=document.createElement('img'),url=URL.createObjectURL(new Blob([plain],{type:'image/jpeg'}));img.onload=img.onerror=()=>URL.revokeObjectURL(url);img.alt=label('Candidate render','候选版本实渲');img.src=url;item.append(img);}
    if(s.pr){const a=document.createElement('a');a.href=s.pr;a.textContent=label('View pull request','查看 PR');a.target='_blank';a.rel='noopener';item.append(a);}
    if(s.stage==='review'&&info.online){
     const approve=document.createElement('button');approve.textContent=label('Publish this revision','发布这个版本');
     approve.onclick=()=>guard(async()=>{
      const branch='house/job-'+s.job;
      const question='bznick98/zbao_portfolio · '+branch+' → main\n'+s.commit+'\n'+label('Push this commit, open a PR and merge once the Vercel preview passes?','确认推送此提交、新建 PR，并在 Vercel 预览通过后合并？');
      if(!window.confirm(question))return;
      await command({op:'publish',epoch:info.epoch,job:s.job,version:s.version,commit:s.commit,confirm:true},state=>['publishing','published','failed'].includes(state?.stage));
      say(label('Publishing request received.','工作站已收到发布请求。'));
     });item.append(approve);
    }
    jobs.append(item);
   }
  }catch(e){send.disabled=true;say(e.message);}
 }
 upload.onchange=()=>guard(async()=>{
  const cred=JSON.parse(await upload.files[0].text());
  if(cred.schema!==1||cred.role!=='owner'||cred.project!==catalog.projectId||![cred.token,cred.key].every(t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t)))throw Error(label('Choose the owner pairing file.','请选择站主配对文件。'));
  credentials=cred;key=await crypto.subtle.importKey('raw',Uint8Array.from(cred.key.match(/../g),v=>parseInt(v,16)),{name:'AES-GCM'},false,['encrypt','decrypt']);
  upload.value='';setTimeout(refresh,0);
 });
 send.onclick=()=>guard(async()=>{
  const current=window.__walkthrough?.revisions?.getState();
  const revision=catalog.revisions.find(r=>r.revisionId===current?.revisionId);
  const list=await openSuggestions(catalog.projectId,privacy).all();
  const notes=list.filter(n=>n.model.revisionDigest===revision?.revisionDigest && n.model.buildId===current.buildId);
  if(!notes.length)throw Error(label('No saved suggestions on this build.','这个模型版本还没有保存的建议。'));
  const {online,epoch}=await api({op:'status'});if(!online)throw Error(offline());
  const bundle=exportSuggestions(catalog.projectId,notes);delete bundle.exportedAt;
  const secret=unlock.value;
  if(!secret)throw Error(label('Enter the House password to encrypt this candidate.','请输入 House 密码，用于加密本次候选版本。'));
  const bare=encode.encode(JSON.stringify(bundle));
  const raw=encode.encode(JSON.stringify({bundle,password:secret}));
  if(raw.length>48*1024*1024)throw Error(label('Send fewer reference images per submission.','请分批提交参考图。'));
  const digest=hex(await crypto.subtle.digest('SHA-256',raw));
  const idKey='house-station-id/'+hex(await crypto.subtle.digest('SHA-256',bare));
  let job=localStorage.getItem(idKey)||crypto.randomUUID();
  if((await api({op:'read',job})).state?.stage==='failed')job=crypto.randomUUID();
  localStorage.setItem(idKey,job);
  const old=(await api({op:'read',job})).state;if(old){say(label('This submission already has a workstation receipt.','这批建议已收到工作站回执。'));return;}
  const step=555000,count=Math.ceil(raw.length/step);
  for(let i=0;i<count;i++){
   say(label('Sending attachments ','正在传送附件 ')+(i+1)+' / '+count);
   await api({op:'chunk',job,epoch,index:i,data:await seal(key,raw.slice(i*step,(i+1)*step),job+'/'+i)});
  }
  say(label('Waiting for workstation receipt…','等待工作站回执…'));
  await command({op:'submit',job,epoch,count,digest},s=>!!s);
  unlock.value='';say(label('Saved on workstation.','工作站已保存。'));
 });
 control.onclick=()=>{modal.showModal();say(credentials?'…':label('Choose the private owner pairing file from your workstation.','请选择工作站的站主配对文件。'));void refresh();timer=setInterval(refresh,10000);};
 modal.onclose=()=>{clearInterval(timer);unlock.value='';};
}
