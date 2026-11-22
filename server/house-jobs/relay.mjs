import {createHash,timingSafeEqual} from 'node:crypto';

const fingerprint = value => createHash('sha256').update(value).digest();
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);
const integer = (n,max) => Number.isInteger(n) && n>=0 && n<max;
const stages = new Set(['received','designing','checking','review','publishing','published','failed']);
const sha = value => typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
const envelope = value => typeof value === 'string' && value.length>20 && value.length<=850000 && /^[A-Za-z0-9+/=]+$/.test(value);
const problem = (code,message) => Object.assign(new Error(message),{status:code});
const ensure = (ok,code,message) => { if(!ok)throw problem(code,message); };
const lane = id => parseInt(id.slice(0,2),16)%8;
const ttl = 180;

export function makeRelay({cache,keys,now=Date.now}) {
  return async function relay(token,body) {
    ensure(typeof token==='string' && token.length===64,401,'Pair this device.');
    const actual=fingerprint(token);
    const role=['owner','worker'].find(k=>keys[k]?.length===64 && timingSafeEqual(actual,Buffer.from(keys[k],'hex')));
    ensure(role,403,'Unknown device.');
    const {op,job}=body??{};
    const session=await cache.get('station');
    const online=session && now()-session.at<75000;
    const set=(name,value,duration=ttl)=>cache.set(name,value,{ttl:duration});
    if(op==='heartbeat') {
      ensure(role==='worker' && uuid(body.epoch),403,'Workstation required.');
      await set('station',{epoch:body.epoch,at:now()},80);
      if(!await cache.get('demand'))return {commands:[]};
      const slots=await Promise.all(Array.from({length:8},(_,i)=>cache.get('slot-'+i)));
      return {commands:slots.filter(c=>c && c.epoch===body.epoch && c.expires>now())};
    }
    if(op==='status')return {online:!!online,epoch:online?session.epoch:null,recent:await cache.get('recent')??[]};
    ensure(uuid(job),400,'Invalid job.');
    if(op==='read')return {online:!!online,state:await cache.get('job-'+job)};
    if(op==='state') {
      ensure(role==='worker' && stages.has(body.stage),403,'Workstation required.');
      const state={job,stage:body.stage,updated:now(),detail:String(body.detail??'').slice(0,2400)};
      if(body.stage==='review'||body.stage==='publishing'||body.stage==='published'){
        ensure(sha(body.commit) && /^\d+\.\d+$/.test(body.version),400,'Candidate identity required.');
        Object.assign(state,{commit:body.commit,version:body.version});
      }
      if(body.preview){ensure(envelope(body.preview),400,'Invalid preview.');state.preview=body.preview;}
      if(body.pr){ensure(/^https:\/\/github\.com\/bznick98\/zbao_portfolio\/pull\/\d+$/.test(body.pr),400,'Invalid PR.');state.pr=body.pr;}
      await set('job-'+job,state,86400);
      const recent=await cache.get('recent')??[];
      await set('recent',[job,...recent.filter(x=>x!==job)].slice(0,8),86400);
      return {ok:true};
    }
    ensure(online && session.epoch===body.epoch,503,'Workstation offline.');
    if(op==='getChunk') {
      ensure(role==='worker' && integer(body.index,96),403,'Workstation required.');
      return {data:await cache.get(job+'-'+body.index)};
    }
    ensure(role==='owner',403,'Owner required.');
    if(op==='chunk') {
      ensure(integer(body.index,96) && envelope(body.data),400,'Invalid attachment part.');
      await set(job+'-'+body.index,body.data,600);
      return {ok:true};
    }
    ensure(op==='submit'||op==='publish',400,'Invalid command.');
    const cmd={job,op,epoch:session.epoch,expires:now()+90000};
    if(op==='submit'){
      ensure(Number.isInteger(body.count)&&body.count>=1&&body.count<=96&&/^[0-9a-f]{64}$/.test(body.digest),400,'Invalid submission.');
      Object.assign(cmd,{count:body.count,digest:body.digest});
    }else{
      const state=await cache.get('job-'+job);
      ensure(state?.stage==='review' && sha(body.commit) && state.commit===body.commit && body.version===state.version && body.confirm===true,409,'Review the current commit before publishing.');
      Object.assign(cmd,{commit:state.commit,version:state.version});
    }
    // A slot is only a notification. The browser retries until the workstation's disk acknowledgement.
    await set('slot-'+lane(job),cmd,95);
    await set('demand',true,95);
    return {delivered:false};
  };
}
