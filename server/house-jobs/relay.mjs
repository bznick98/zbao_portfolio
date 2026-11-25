import {createHash,timingSafeEqual} from 'node:crypto';

const fingerprint = value => createHash('sha256').update(value).digest();
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);
const integer = (n,max) => Number.isInteger(n) && n>=0 && n<max;
// `held` means nothing could be built without the owner's input; the reason says what to decide.
const stages = new Set(['received','designing','checking','review','publishing','published','held','failed']);
const text = (value,max) => String(value??'').slice(0,max);
function outcomes(value) {
  if(value===undefined || value===null)return undefined;
  ensure(Array.isArray(value) && value.length<=32,400,'Invalid outcomes.');
  return value.map(o=>{
    ensure(o && typeof o.id==='string' && /^[A-Za-z0-9_-]{1,64}$/.test(o.id) && ['built','review'].includes(o.status),400,'Invalid outcome.');
    return {id:o.id,status:o.status,text:text(o.text,160),note:text(o.note,600)};
  });
}
const sha = value => typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
const envelope = value => typeof value === 'string' && value.length>20 && value.length<=850000 && /^[A-Za-z0-9+/=]+$/.test(value);
const problem = (code,message) => Object.assign(new Error(message),{status:code});
const ensure = (ok,code,message) => { if(!ok)throw problem(code,message); };
const lane = id => parseInt(id.slice(0,2),16)%8;
const ttl = 180;
// A station behind Tailscale Funnel gives a doorbell URL and heartbeats every
// five minutes; the relay rings it instead of waiting for the next poll.
const POLLING = {fresh:75000, ttl:80, command:90000, slot:95};
const PUSHED = {fresh:700000, ttl:720, command:590000, slot:600};
export function doorbell(value) {
  if(typeof value!=='string' || value.length>300)return null;
  let url;try{url=new URL(value);}catch{return null;}
  const ok=url.protocol==='https:' && /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.ts\.net$/.test(url.hostname) && ['','8443','10000'].includes(url.port)
    && !url.username && !url.password && !url.search && !url.hash && /^(?:\/[A-Za-z0-9_-]+)*\/[a-f0-9]{64}$/.test(url.pathname);
  return ok ? url.href : null;
}
async function fetchRing(url,action) {
  try{
    const r=await fetch(url+'/'+action,{method:action==='wake'?'POST':'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(2500)});
    return r.ok;
  }catch{return false;}
}

export function makeRelay({cache,keys,now=Date.now,ring=fetchRing}) {
  return async function relay(token,body) {
    ensure(typeof token==='string' && token.length===64,401,'House access required.');
    const actual=fingerprint(token);
    const role=['owner','worker','submitter'].find(k=>keys[k]?.length===64 && timingSafeEqual(actual,Buffer.from(keys[k],'hex')));
    ensure(role,403,'Unknown access credential.');
    const {op,job}=body??{};
    const session=await cache.get('station');
    const mode=session?.push?PUSHED:POLLING;
    const set=(name,value,duration=ttl)=>cache.set(name,value,{ttl:duration});
    // A pushed station is online while its doorbell answers; the answer is reused for 20 s.
    async function reachable() {
      if(!session || now()-session.at>=mode.fresh)return false;
      if(!session.push)return true;
      const seen=await cache.get('reach');
      if(seen?.epoch===session.epoch)return seen.ok;
      const ok=await ring(session.push,'ping');
      await set('reach',{epoch:session.epoch,ok},20);
      return ok;
    }
    const online=op!=='heartbeat' && op!=='state' && op!=='getChunk' && await reachable() && (role!=='submitter' || session.submitAccess===true);
    if(op==='heartbeat') {
      ensure(role==='worker' && uuid(body.epoch),403,'Workstation required.');
      const push=body.push===undefined?null:doorbell(body.push);
      ensure(body.push===undefined || push,400,'Invalid doorbell.');
      const next=push?PUSHED:POLLING;
      await set('station',{epoch:body.epoch,at:now(),submitAccess:body.submitAccess===true,...(push?{push}:{})},next.ttl);
      // `doorbell` tells the station it may slow its heartbeat to the fallback interval.
      if(!await cache.get('demand'))return {commands:[],doorbell:!!push};
      const slots=await Promise.all(Array.from({length:8},(_,i)=>cache.get('slot-'+i)));
      return {commands:slots.filter(c=>c && c.epoch===body.epoch && c.expires>now()),doorbell:!!push};
    }
    if(op==='status')return {online:!!online,epoch:online?session.epoch:null,recent:role==='submitter'?[]:await cache.get('recent')??[]};
    ensure(uuid(job),400,'Invalid job.');
    if(op==='read'){
      let state=await cache.get('job-'+job);
      if(role==='submitter' && state?.access!=='submitter')state=null;
      if(role==='owner' && state?.access==='submitter' && !body.submissionPreviews){
        const {preview,...metadata}=state;
        state=metadata;
      }
      return {online:!!online,state};
    }
    if(op==='state') {
      ensure(role==='worker' && stages.has(body.stage),403,'Workstation required.');
      ensure(body.step===undefined || body.step===null || /^[a-z-]{1,24}$/.test(body.step),400,'Invalid step.');
      ensure(body.queue===undefined || body.queue===null || integer(body.queue,100),400,'Invalid queue.');
      const previous=await cache.get('job-'+job);
      const step=body.step??null;
      const state={job,access:body.access==='submitter'?'submitter':'owner',stage:body.stage,step,updated:now(),detail:String(body.detail??'').slice(0,2400)};
      if(Number.isInteger(body.queue))state.queue=body.queue;
      if(body.reason)state.reason=text(body.reason,1200);
      const results=outcomes(body.outcomes);if(results)state.outcomes=results;
      if(Number.isFinite(body.receivedAt))state.receivedAt=body.receivedAt;
      // Each stage or step change is kept with its time so viewers can follow the job.
      const history=previous?.history??[];
      if(previous?.stage!==state.stage || previous?.step!==step)history.push({stage:state.stage,step,at:now()});
      state.history=history.slice(-30);
      if(body.stage==='review'||body.stage==='publishing'||body.stage==='published'){
        ensure(sha(body.commit) && /^\d+\.\d+$/.test(body.version),400,'Candidate identity required.');
        Object.assign(state,{commit:body.commit,version:body.version});
      }
      if(body.preview){ensure(envelope(body.preview),400,'Invalid preview.');state.preview=body.preview;}
      if(body.pr){ensure(/^https:\/\/github\.com\/bznick98\/zbao_portfolio\/pull\/\d+$/.test(body.pr),400,'Invalid PR.');state.pr=body.pr;}
      await set('job-'+job,state,86400*7);
      const recent=await cache.get('recent')??[];
      await set('recent',[job,...recent.filter(x=>x!==job)].slice(0,20),86400*7);
      return {ok:true};
    }
    if(op==='getChunk') {
      ensure(session && now()-session.at<mode.fresh && session.epoch===body.epoch,503,'Workstation offline.');
      ensure(role==='worker' && integer(body.index,96),403,'Workstation required.');
      return {data:await cache.get((body.access==='submitter'?'submission-':'')+job+'-'+body.index)};
    }
    ensure(online && session.epoch===body.epoch,503,'Workstation offline.');
    ensure(role==='owner' || role==='submitter',403,'Submission access required.');
    if(op==='chunk') {
      ensure(integer(body.index,96) && envelope(body.data),400,'Invalid attachment part.');
      await set((role==='submitter'?'submission-':'')+job+'-'+body.index,body.data,600);
      return {ok:true};
    }
    ensure(op==='submit'||op==='publish',400,'Invalid command.');
    const cmd={job,op,epoch:session.epoch,expires:now()+mode.command};
    if(op==='submit'){
      ensure(Number.isInteger(body.count)&&body.count>=1&&body.count<=96&&/^[0-9a-f]{64}$/.test(body.digest),400,'Invalid submission.');
      Object.assign(cmd,{access:role,count:body.count,digest:body.digest});
    }else{
      ensure(role==='owner',403,'Owner required.');
      const state=await cache.get('job-'+job);
      ensure(state?.stage==='review' && sha(body.commit) && state.commit===body.commit && body.version===state.version && body.confirm===true,409,'Review the current commit before publishing.');
      Object.assign(cmd,{commit:state.commit,version:state.version});
    }
    // A slot is only a notification. The browser retries until the workstation's disk acknowledgement.
    await set('slot-'+lane(job),cmd,mode.slot);
    await set('demand',true,mode.slot);
    if(session.push && !await ring(session.push,'wake'))await set('reach',{epoch:session.epoch,ok:false},20);
    return {delivered:false};
  };
}
