import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {makeRelay} from '../server/house-jobs/relay.mjs';

test('only a paired, live workstation acknowledges jobs and only the reviewed commit can be published',async()=>{
 const data=new Map(),time={now:10};
 const cache={get:k=>data.get(k)?.expires>time.now?data.get(k).v:null,set:(k,v,o)=>data.set(k,{v,expires:time.now+o.ttl*1000})};
 const creds=Object.fromEntries(['owner','worker'].map(k=>[k,randomBytes(32).toString('hex')]));
 const keys=Object.fromEntries(Object.entries(creds).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));
 const relay=makeRelay({cache,keys,now:()=>time.now});
 const owner=b=>relay(creds.owner,b),worker=b=>relay(creds.worker,b);
 const job=randomUUID(),epoch=randomUUID(),commit='e'.repeat(40),version='0.9';
 const submission={op:'submit',epoch,job,count:2,digest:'a'.repeat(64)};
 assert.equal((await owner({op:'status'})).online,false);
 await assert.rejects(owner(submission),{status:503});
 await assert.rejects(relay('bogus',submission),{status:401});
 await assert.rejects(owner({op:'heartbeat',epoch}),{status:403});
 await worker({op:'heartbeat',epoch});
 await assert.rejects(worker(submission),{status:403});
 await assert.rejects(owner({...submission,epoch:randomUUID()}),{status:503});
 await assert.rejects(owner({...submission,op:'chunk',index:0,data:'too-short'}),{status:400});
 await owner({op:'chunk',job,epoch,index:0,data:'a'.repeat(48)});
 assert.equal((await worker({op:'getChunk',job,epoch,index:0})).data,'a'.repeat(48));
 assert.deepEqual(await owner(submission),{delivered:false});
 assert.equal((await owner({op:'read',job})).state,null);
 assert.equal((await worker({op:'heartbeat',epoch})).commands[0].job,job);
 await worker({op:'state',job,stage:'review',version,commit,detail:'tests passed'});
 const pub={op:'publish',job,version,commit,epoch,confirm:true};
 await assert.rejects(owner({...pub,commit:'a'.repeat(40)}),{status:409});
 await assert.rejects(owner({...pub,confirm:false}),{status:409});
 await owner(pub);
 assert.equal((await worker({op:'heartbeat',epoch})).commands[0].commit,commit);
 time.now+=80000;
 assert.equal((await owner({op:'status'})).online,false);
 await assert.rejects(owner(submission),{status:503});
 assert.equal((await worker({op:'heartbeat',epoch:randomUUID()})).commands.length,0);
});

test('unlocking House grants submission for this project and reserves publishing for the owner',async()=>{
 const cache=new Map();
 const credentials=Object.fromEntries(['owner','worker','submitter'].map(role=>[role,randomBytes(32).toString('hex')]));
 const keys=Object.fromEntries(Object.entries(credentials).map(([role,token])=>[role,createHash('sha256').update(token).digest('hex')]));
 const relay=makeRelay({cache:{get:k=>cache.get(k)??null,set:(k,v)=>cache.set(k,v)},keys});
 const owner=body=>relay(credentials.owner,body),worker=body=>relay(credentials.worker,body),submit=body=>relay(credentials.submitter,body);
 const job=randomUUID(),epoch=randomUUID(),commit='e'.repeat(40),version='0.9';
 await worker({op:'heartbeat',epoch});
 assert.equal((await submit({op:'status'})).online,false);
 await worker({op:'heartbeat',epoch,submitAccess:true});
 await submit({op:'chunk',job,epoch,index:0,data:'a'.repeat(48),access:'owner'});
 assert.equal((await worker({op:'getChunk',job,epoch,index:0})).data,null);
 assert.equal((await worker({op:'getChunk',job,epoch,index:0,access:'submitter'})).data,'a'.repeat(48));
 await submit({op:'submit',job,epoch,count:1,digest:'a'.repeat(64),access:'owner'});
 assert.equal((await worker({op:'heartbeat',epoch,submitAccess:true})).commands[0].access,'submitter');
 await assert.rejects(submit({op:'heartbeat',epoch}),{status:403});
 await assert.rejects(submit({op:'state',job,stage:'review',commit,version}),{status:403});
 await assert.rejects(submit({op:'getChunk',job,epoch,index:0}),{status:403});
 const legacy=randomUUID();
 await worker({op:'state',job:legacy,stage:'received'});
 assert.equal((await submit({op:'read',job:legacy})).state,null);
 await worker({op:'state',job,stage:'review',access:'submitter',commit,version,preview:'b'.repeat(48)});
 assert.deepEqual((await submit({op:'status'})).recent,[]);
 assert.equal((await submit({op:'read',job})).state.stage,'review');
 assert.equal((await owner({op:'read',job})).state.preview,undefined);
 assert.equal((await owner({op:'read',job,submissionPreviews:true})).state.preview,'b'.repeat(48));
 const publish={op:'publish',job,epoch,commit,version,confirm:true};
 await assert.rejects(submit({...publish,role:'owner'}),{status:403});
 await assert.rejects(owner({...publish,commit:'a'.repeat(40)}),{status:409});
 await owner(publish);
 assert.equal((await worker({op:'heartbeat',epoch,submitAccess:true})).commands[0].op,'publish');
});

test('a station behind Tailscale Funnel is rung instead of polled',async()=>{
 const data=new Map(),time={now:10};
 const cache={get:k=>data.get(k)?.expires>time.now?data.get(k).v:null,set:(k,v,o)=>data.set(k,{v,expires:time.now+o.ttl*1000})};
 const creds=Object.fromEntries(['owner','worker'].map(k=>[k,randomBytes(32).toString('hex')]));
 const keys=Object.fromEntries(Object.entries(creds).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));
 const rings=[],bell={up:true};
 const relay=makeRelay({cache,keys,now:()=>time.now,ring:async(url,action)=>{rings.push([url,action]);return bell.up;}});
 const owner=b=>relay(creds.owner,b),worker=b=>relay(creds.worker,b);
 const epoch=randomUUID(),job=randomUUID(),push='https://ppw.tail0000.ts.net/house-station/'+'c'.repeat(64);
 for(const bad of ['http://ppw.tail0000.ts.net/'+'c'.repeat(64),'https://example.com/'+'c'.repeat(64),'https://ppw.tail0000.ts.net/short',
  'https://ppw.tail0000.ts.net:22/'+'c'.repeat(64),'https://ppw.tail0000.ts.net/'+'c'.repeat(64)+'?x=1','https://u:p@ppw.tail0000.ts.net/'+'c'.repeat(64)])
  await assert.rejects(worker({op:'heartbeat',epoch,push:bad}),{status:400},bad);
 assert.equal((await worker({op:'heartbeat',epoch,push})).doorbell,true);
 // Online is the doorbell's answer, checked once per 20 s and never shown to browsers.
 const status=await owner({op:'status'});
 assert.equal(status.online,true);assert.equal(JSON.stringify(status).includes('ts.net'),false);
 await owner({op:'read',job});
 assert.deepEqual(rings,[[push,'ping']]);
 // A submission rings the doorbell; the command waits in its slot for the station's heartbeat.
 await owner({op:'chunk',job,epoch,index:0,data:'a'.repeat(48)});
 await owner({op:'submit',epoch,job,count:1,digest:'a'.repeat(64)});
 assert.deepEqual(rings.at(-1),[push,'wake']);
 // Five minutes later a lost ring is still collected by the fallback heartbeat.
 time.now+=300000;
 assert.equal((await worker({op:'heartbeat',epoch,push})).commands[0].job,job);
 assert.equal((await worker({op:'getChunk',job,epoch,index:0})).data,'a'.repeat(48));
 // A doorbell that stops answering makes the station offline within 20 s.
 bell.up=false;time.now+=21000;
 assert.equal((await owner({op:'status'})).online,false);
 await assert.rejects(owner({op:'submit',epoch,job,count:1,digest:'a'.repeat(64)}),{status:503});
 // Without a fallback heartbeat for 12 minutes the record expires.
 bell.up=true;time.now+=700000;
 assert.equal((await owner({op:'status'})).online,false);
 // A station that heartbeats without a doorbell is polled as before.
 assert.equal((await worker({op:'heartbeat',epoch})).doorbell,false);
 const before=rings.length;
 assert.equal((await owner({op:'status'})).online,true);
 assert.equal(rings.length,before);
 time.now+=80000;
 assert.equal((await owner({op:'status'})).online,false);
});

test('job state carries its step, queue place, outcomes and a timed history',async()=>{
 const data=new Map(),time={now:1000};
 const cache={get:k=>data.get(k)?.expires>time.now?data.get(k).v:null,set:(k,v,o)=>data.set(k,{v,expires:time.now+o.ttl*1000})};
 const creds=Object.fromEntries(['owner','worker','submitter'].map(k=>[k,randomBytes(32).toString('hex')]));
 const keys=Object.fromEntries(Object.entries(creds).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));
 const relay=makeRelay({cache,keys,now:()=>time.now});
 const worker=b=>relay(creds.worker,b),submit=b=>relay(creds.submitter,b);
 const job=randomUUID(),note=randomUUID();
 await worker({op:'state',job,access:'submitter',stage:'received',queue:1,receivedAt:900});
 time.now+=5000;await worker({op:'state',job,access:'submitter',stage:'designing',step:'planning',queue:null});
 time.now+=5000;await worker({op:'state',job,access:'submitter',stage:'designing',step:'planning'});
 time.now+=5000;
 await worker({op:'state',job,access:'submitter',stage:'held',reason:'Choose the board size.',
  outcomes:[{id:note,status:'review',text:'Larger teak boards','note':'Floor is not editable yet.'}]});
 const {state}=await submit({op:'read',job});
 assert.equal(state.stage,'held');assert.equal(state.reason,'Choose the board size.');
 assert.equal(state.queue,undefined);assert.equal(state.receivedAt,undefined);
 assert.deepEqual(state.outcomes,[{id:note,status:'review',text:'Larger teak boards',note:'Floor is not editable yet.'}]);
 assert.deepEqual(state.history.map(h=>[h.stage,h.step,h.at]),[['received',null,1000],['designing','planning',6000],['held',null,16000]]);
 await assert.rejects(worker({op:'state',job,stage:'held',step:'Bad Step'}),{status:400});
 await assert.rejects(worker({op:'state',job,stage:'held',queue:-1}),{status:400});
 await assert.rejects(worker({op:'state',job,stage:'held',outcomes:[{id:'x',status:'maybe'}]}),{status:400});
 await assert.rejects(worker({op:'state',job,stage:'unknown'}),{status:403});
});

test('a waiting Claude session shows its status to everyone and its link only to the owner',async()=>{
 const cache=new Map();
 const credentials=Object.fromEntries(['owner','worker','submitter'].map(role=>[role,randomBytes(32).toString('hex')]));
 const keys=Object.fromEntries(Object.entries(credentials).map(([role,token])=>[role,createHash('sha256').update(token).digest('hex')]));
 const relay=makeRelay({cache:{get:k=>cache.get(k)??null,set:(k,v)=>cache.set(k,v)},keys});
 const owner=b=>relay(credentials.owner,b),worker=b=>relay(credentials.worker,b),submit=b=>relay(credentials.submitter,b);
 const job=randomUUID(),url='https://claude.ai/code/session_018pP5iyfG6piHahgjxf5s22';
 await worker({op:'state',job,access:'submitter',stage:'waiting',step:'trying',message:'Rebuilding the island legs.',reason:'Claude needs a decision on the floor.',session:{url,name:'House job 1234abcd'}});
 const seen=(await submit({op:'read',job})).state;
 assert.equal(seen.stage,'waiting');assert.equal(seen.message,'Rebuilding the island legs.');assert.equal(seen.session,undefined);
 assert.deepEqual((await owner({op:'read',job})).state.session,{url,name:'House job 1234abcd'});
 for(const bad of ['https://example.com/code/session_abc12345','http://claude.ai/code/session_018pP5iyfG6piHah','https://claude.ai/code/session_x'])
  await assert.rejects(worker({op:'state',job,stage:'waiting',session:{url:bad}}),{status:400},bad);
});

test('each suggestion has its own encrypted preview, readable by the job viewers only',async()=>{
 const cache=new Map();
 const credentials=Object.fromEntries(['owner','worker','submitter'].map(role=>[role,randomBytes(32).toString('hex')]));
 const keys=Object.fromEntries(Object.entries(credentials).map(([role,token])=>[role,createHash('sha256').update(token).digest('hex')]));
 const relay=makeRelay({cache:{get:k=>cache.get(k)??null,set:(k,v)=>cache.set(k,v)},keys});
 const owner=b=>relay(credentials.owner,b),worker=b=>relay(credentials.worker,b),submit=b=>relay(credentials.submitter,b);
 const job=randomUUID(),ownerJob=randomUUID(),note=randomUUID();
 await worker({op:'state',job,access:'submitter',stage:'review',commit:'e'.repeat(40),version:'0.9',previewIds:[note]});
 await worker({op:'putPreview',job,id:note,data:'p'.repeat(48)});
 assert.deepEqual((await submit({op:'read',job})).state.previewIds,[note]);
 assert.equal((await submit({op:'getPreview',job,id:note})).data,'p'.repeat(48));
 assert.equal((await owner({op:'getPreview',job,id:note})).data,'p'.repeat(48));
 await worker({op:'state',job:ownerJob,stage:'review',commit:'e'.repeat(40),version:'0.9'});
 await assert.rejects(submit({op:'getPreview',job:ownerJob,id:note}),{status:404});
 await assert.rejects(submit({op:'putPreview',job,id:note,data:'p'.repeat(48)}),{status:403});
 await assert.rejects(worker({op:'putPreview',job,id:'../x',data:'p'.repeat(48)}),{status:400});
 await assert.rejects(worker({op:'state',job,stage:'review',commit:'e'.repeat(40),version:'0.9',previewIds:['bad id']}),{status:400});
});
