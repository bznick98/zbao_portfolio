import {displayRegions,noteRegions} from './suggestion-region.js';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const request = req => new Promise((resolve,reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

export function openSuggestions(projectId, privacy) {
  if (!projectId) throw Error('Missing project identity');
  if (privacy && !privacy.key) throw Error('Private storage unavailable');
  let connection;
  function open() {
    if (!connection) {
      const req = indexedDB.open('layout2house-suggestions-v1',1);
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore('suggestions',{keyPath:['scope','id']});
        store.createIndex('scope','scope');
      };
      connection = request(req).catch(error => {connection=null;throw error;});
    }
    return connection;
  }
  const scope = [privacy?'private':'local',projectId].join('/');
  const listScope = 'list/'+scope;
  const aad = (bucket,id) => encoder.encode(JSON.stringify([bucket,id]));
  async function encode(bucket,id,version,value) {
    const row={scope:bucket,id,version};
    if (!privacy) {row.note=value;return row;}
    row.iv=crypto.getRandomValues(new Uint8Array(12));
    row.ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv:row.iv,additionalData:aad(bucket,id)},privacy.key,encoder.encode(JSON.stringify(value)));
    return row;
  }
  async function decode(row) {
    if (!privacy) return row.note;
    const bytes = await crypto.subtle.decrypt({name:'AES-GCM',iv:row.iv,additionalData:aad(row.scope,row.id)},privacy.key,row.ciphertext);
    return JSON.parse(decoder.decode(bytes));
  }
  async function rows(bucket) {
    const db=await open();
    return request(db.transaction('suggestions').objectStore('suggestions').index('scope').getAll(bucket));
  }
  async function read(id) {
    const db=await open();
    const row=await request(db.transaction('suggestions').objectStore('suggestions').get([scope,id]));
    if(!row)throw Error('Missing suggestion');
    return decode(row);
  }
  const recentFirst=(a,b)=>b.updatedAt.localeCompare(a.updatedAt);
  function summary(note){
    return {id:note.id,version:note.version,createdAt:note.createdAt,updatedAt:note.updatedAt,model:note.model,
      title:note.text.slice(0,180)||note.referenceImages[0]?.name,shape:displayRegions(noteRegions(note)),places:noteRegions(note).length,
      region:{roomIds:[...new Set(noteRegions(note).flatMap(r=>r.roomIds||[]))],view:{mode:note.region.view.mode}}};
  }
  const legacy=new Map();
  async function change(id,expectedVersion,apply){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('suggestions','readwrite'),store=tx.objectStore('suggestions');
      const read=store.get([scope,id]);
      let conflict=false;
      read.onsuccess=()=>{
        if((read.result?.version || 0)!==expectedVersion){conflict=true;tx.abort();return;}
        apply(store);
      };
      tx.oncomplete=resolve;
      tx.onabort=()=>reject(conflict?Error('conflict'):tx.error || Error('Storage unavailable'));
    });
  }
  return {
    async list() {
      const summaries=await Promise.all((await rows(listScope)).map(decode));
      // Earlier indexes only included text. Derive their geometry once per edit without rewriting private records.
      const complete=await Promise.all(summaries.map(async row=>{
        if(row.shape && row.version)return row;
        const cached=legacy.get(row.id);
        if(cached?.updatedAt===row.updatedAt)return cached;
        const hydrated=summary(await read(row.id));legacy.set(row.id,hydrated);return hydrated;
      }));
      return complete.sort(recentFirst);
    },
    read,
    async all() {
      const notes=await Promise.all((await rows(scope)).map(decode));
      return notes.sort(recentFirst);
    },
    async save(note, expectedVersion) {
      const saved=summary(note);
      const [row,index]=await Promise.all([encode(scope,note.id,note.version,note),encode(listScope,note.id,note.version,saved)]);
      await change(note.id,expectedVersion,store=>{store.put(row);store.put(index);});
      return saved;
    },
    async remove(id,expectedVersion){
      if(!(expectedVersion>0))throw Error('Missing saved version');
      await change(id,expectedVersion,store=>{store.delete([scope,id]);store.delete([listScope,id]);});
      legacy.delete(id);
    }
  };
}

export function exportSuggestions(projectId,suggestions) {
  return {
    schema:'layout2house.suggestions',schemaVersion:5,projectId,exportedAt:new Date().toISOString(),
    coordinates:{unit:'metre',world:'Three.js Y-up',blender:'Z-up; [world.x, -world.z, world.y]',
      uv:'normalized canvas; top-left origin',quaternion:'Three.js [x,y,z,w]',matrices:'Three.js column-major'},
    interpretation:'Match the model identity before applying. For surface-pins, each region.points entry is a user tap on the visible surface. Match its number to its markedView image and its camera. world and blender are the hit in metres; local is in the intersected mesh or instance space. object identifies its CAD source or node path. Several pins can address different parts of one object. The text specifies the extent of the change. For surface-stroke, follow segments in order. Each segment identifies one mesh and instance. Each ordered point has its Blender position, mesh-local position and exported triangle. Barycentric weights follow the exported triangle vertex order when available. The brush width is visual. A stroke locates the request; a loop does not by itself specify a filled region. For model-object, anchor is the tapped surface, members lists every selected mesh path and optional instanceId, and boundsWorld is its world-space bounding box in metres. The marked view shows the whole selected object. For surface-area or legacy rectangle notes, use the marked rectangle, camera and visible surface samples; the region may cover parts of multiple objects. Object identifiers locate the sampled surfaces. GLB paths, triangle indices and local coordinates belong to this build. Resolve the CAD or stable identifier in the source Blender scene, then verify the position and original viewpoint. Use the comment to determine the intended modification. Read the original text and referenceImages for design intent. extraRegions, when present, lists more places for the same suggestion; read each like region, with its own camera and markedView.',
    scopeResolution: {
      anchors: 'Use the region and targetObjectKeys to find the location on the matching source model.',
      intent: 'Read the full comment and attached references to decide whether the request concerns a surface, part, entire assembly, or a relationship across fixtures.',
      assembly: 'Resolve the requested assembly through fixture records, assembly IDs and joins. A whole-island request on its top includes the body, base, supports and fittings. A top-only finish request stays on the top.',
      review: 'Record the suggested scope, actual changed source IDs, constraints and before/after views per suggestion UUID. Treat incidental hits as context.',
    },
    suggestions
  };
}
