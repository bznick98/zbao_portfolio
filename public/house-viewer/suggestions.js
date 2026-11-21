import {capturePin,startSurfaceStroke,captureStroke,captureObject,displayRegion,modelIdentity,sameModel,pinMarkers} from './suggestion-region.js';
import {openSuggestions,exportSuggestions} from './suggestion-store.js';
import {roomText} from './i18n.js';

const copy={
  title:['Suggestions','建议'],add:['New suggestion','新增建议'],close:['Close','关闭'],cancel:['Cancel','取消'],
  empty:['No suggestions yet.','还没有建议。'],save:['Save','保存'],del:['Delete','删除'],confirmDelete:['Delete this suggestion and its reference images?','删除这条建议及其附图？'],text:['Comment','评论'],photos:['Reference images','参考图'],
  drop:['Drop images or choose files','拖入图片或点击选取文件'],remove:['Remove','移除'],change:['Change location','重选位置'],
  object:['Object','构件'],objectHint:['Tap a cabinet, bed or other model object.','点击柜子、床等模型构件。'],point:['Point','点'],area:['Area','框选'],draw:['Draw','手绘'],pointHint:['Tap the surface you want to comment on.','点选要评论的模型表面。'],
  drawHint:['Draw on a model surface. Lift to comment.','按住模型表面画线，松开后填写建议。'],
  new:['New suggestion','新增建议'],imageNote:['Image reference','图片建议'],walk:['Walkthrough','漫游'],model:['Model','模型'],
  miss:['Select a visible model surface.','请选择模型上可见的表面。'],shortStroke:['Draw a line on a visible surface.','请在可见表面画一段线。'],
  content:['Add a comment or a reference image.','请填写评论或添加参考图。'],storage:['Could not access saved suggestions.','无法读写已存建议。'],
  file:['Choose a PNG, JPEG, WebP, GIF or AVIF image.','请选择 PNG、JPEG、WebP、GIF 或 AVIF 图片。'],
  captureError:['Could not capture the location. Try again.','未能记录位置，请重试。'],
  unavailable:['Open the original build to change this location.','请打开原模型版本后再修改位置。'],
  conflict:['Reopen this suggestion to see edits from another tab.','此建议已在其他标签页修改，请重新打开。'],
  discard:['Discard unsaved changes?','放弃未保存的修改？'],
  loading:['Loading…','正在读取…'],retry:['Retry','重试'],export:['Export JSON','导出 JSON'],newComment:['New comment','新评论']
};
const tr=key=>copy[key][document.documentElement.lang.startsWith('zh')?1:0];
const allowed = /^image\/(jpeg|png|webp|gif|avif)$/;
const stylesheet = document.createElement('link');
stylesheet.rel='stylesheet'; stylesheet.href=new URL('./suggestions.css',import.meta.url);
document.head.append(stylesheet);

async function readImage(file) {
  if (!allowed.test(file.type)) throw Error('file');
  const dataUrl = await new Promise((resolve,reject) => {
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(file);
  });
  const test=new Image(); test.src=dataUrl; await test.decode();
  return {name:file.name,mimeType:file.type,bytes:file.size,width:test.naturalWidth,height:test.naturalHeight,dataUrl};
}
function el(tag,text) {
  const node = document.createElement(tag);
  if (text!==undefined) node.textContent=text;
  return node;
}
function button(key,action,id) {
  const node=el('button',tr(key));node.type='button';node.onclick=action;
  if (id) node.id=id;
  return node;
}

export function installSuggestions({getContext,selectRevision,restorePose,clearInput}) {
  const dock=el('div');dock.className='sg-dock';
  const bar=el('div');bar.className='sg-bar';
  const trigger=button('title',togglePanel,'suggestions-open');
  trigger.setAttribute('aria-controls','suggestions-panel');
  const caption=el('span'),count=el('span');count.className='sg-count';count.setAttribute('aria-live','polite');trigger.replaceChildren(caption,count);
  const plus=button('add',()=>beginPick(true),'suggestion-new');plus.textContent='+';
  bar.append(trigger,plus);
  const panel=el('section');panel.id='suggestions-panel';panel.className='sg-panel';panel.setAttribute('aria-labelledby','suggestions-title');
  const header=el('header'),title=el('h2'),body=el('div'),message=el('p');
  title.id='suggestions-title';body.className='sg-body';message.className='sg-message';message.setAttribute('role','status');
  const close=button('close',dismiss,'suggestions-close');
  header.append(title,close);panel.append(header,body,message);dock.append(panel,bar);document.body.append(dock);
  const canvas=getContext().canvas,markers=pinMarkers(getContext().scene);canvas.tabIndex=-1;
  const ink=pinMarkers(getContext().scene,'Suggestion brush');
  let store,project,notes=[],ready=false,draft=null,dirty=false,busy=false,page='closed',active=null,kind='point';
  let sourceModel,gesture=null,drawing=null,loadId=0,teleportUntil=0;
  const fingers=new Set();
  const byCreation=(a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id);
  function model(){return modelIdentity(getContext().data);}
  function located(){return draft && sameModel(draft.model,model());}
  function ensureStore(){
    const id=model().projectId;
    if(!store||id!==project){store=openSuggestions(id,window.__HOUSE_SUGGESTION_PRIVACY);project=id;}
    return store;
  }
  function setMessage(key){message.hidden=!key;message.textContent=key?tr(key):'';}
  function clean(){return !dirty || window.confirm(tr('discard'));}
  function stopPick(){
    const pointer=drawing?.id;drawing=null;ink.set([]);
    if(pointer!=null && canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);
    gesture=null;
  }
  function dismiss(){
    if(busy||!clean())return;
    stopPick();draft=null;if(!notes.some(n=>n.id===active))active=null;dirty=false;page='closed';render();trigger.focus();
  }
  async function refresh(){
    const generation=++loadId;
    try{
      const result=await ensureStore().list();
      if(generation!==loadId)return;
      notes=result.sort(byCreation);
      ready=true;render();
    }catch{if(generation===loadId && page!=='closed')setMessage('storage');}
  }
  function togglePanel(){
    if(page!=='closed'){dismiss();return;}
    if(document.pointerLockElement)document.exitPointerLock();
    page='list';render();refresh();
  }
  function beginPick(isNew){
    if(busy||!ready)return;
    if(isNew){if(!clean())return;draft=null;dirty=false;active=null;}
    if(document.pointerLockElement)document.exitPointerLock();
    kind=isNew || draft.region.kind==='model-object'?'object':draft.region.points?'point':'draw';
    stopPick();fingers.clear();clearInput();getContext().tools?.setMeasuring(false);
    sourceModel=model();page='pick';render();
  }
  function cancelPick(){stopPick();page=draft?'edit':'list';render();}
  function cancelEdit(){if(busy||!clean())return;draft=null;dirty=false;page='list';render();}
  function number(id){const i=notes.findIndex(n=>n.id===id);return i<0?notes.length+1:i+1;}
  function syncMarkers(){
    const current=model();
    const entries=notes.filter(n=>sameModel(n.model,current)&&n.id!==draft?.id)
      .map(n=>({id:n.id,number:number(n.id),active:n.id===active,shape:n.shape}));
    if(located())entries.push({id:draft.id,number:number(draft.id),active:true,shape:displayRegion(draft.region)});
    markers.set(entries);markers.update(getContext());
  }
  function goView(view){
    const {modes}=getContext();clearInput();modes.setMode('walk');
    if(modes.mode==='walk')restorePose(view.walkPose);
    modes.setMode(view.mode);if(view.mode==='model')modes.restoreModelView(view.modelView);
    modes.camera.updateMatrixWorld(true);
  }
  async function edit(summary,restore=true){
    if(busy||!clean())return;
    busy=true;stopPick();dirty=false;draft=null;active=summary.id;page='list';render();
    try{
      const note=await ensureStore().read(summary.id);
      if(!sameModel(note.model,model()) && note.model.revisionId)await selectRevision(note.model.revisionId,note.model.buildId);
      draft=note;page='edit';if(restore&&located())goView(note.region.view);
    }catch{active=null;}
    busy=false;render();if(!draft)setMessage('storage');else if(!located())setMessage('unavailable');
    panel.querySelector('.sg-item.selected')?.scrollIntoView({block:'nearest'});
  }
  function useRegion(region,keys){
    stopPick();
    if(!region){setMessage('miss');return;}
    if(!draft)draft={id:crypto.randomUUID(),createdAt:new Date().toISOString(),version:0,model:sourceModel,text:'',referenceImages:[]};
    draft.region=region;draft.targetObjectKeys=keys;active=draft.id;dirty=true;page='edit';render();
    body.querySelector('textarea')?.focus({preventScroll:true});
  }
  function selectAt(uv){
    if(kind==='draw')return;
    if(!sameModel(sourceModel,model())){cancelPick();return;}
    const ctx=getContext(),n=number(draft?.id);
    try{
      if(kind==='object'){
        const region=markers.withoutMarkers(()=>captureObject(ctx,uv,n));
        useRegion(region,region?[region.object.key]:[]);
      }else{
        const pin=markers.withoutMarkers(()=>capturePin(ctx,uv,n));
        useRegion(pin && {kind:'surface-pins',points:[pin],view:pin.view,roomIds:pin.roomId?[pin.roomId]:[]},pin?[pin.object.key]:[]);
      }
    }catch{setMessage('captureError');}
  }
  function paintStroke(){
    if(!drawing)return;
    const {stroke}=drawing;
    if(!stroke.matches(getContext())){stopPick();return;}
    if(stroke.count===drawing.painted)return;
    drawing.painted=stroke.count;
    const shape=displayRegion(stroke.region);
    ink.set([{id:'brush',active:true,number:0,shape:{pins:[],patches:shape.patches}}]);
  }
  function uvAt(e){
    const box=canvas.getBoundingClientRect();
    return document.pointerLockElement===canvas?[.5,.5]:[(e.clientX-box.left)/box.width,(e.clientY-box.top)/box.height];
  }
  // Only the brush takes ownership of a primary drag before the navigation controls.
  const stage=canvas.parentElement;
  stage.addEventListener('pointerdown',e=>{
    if(e.target!==canvas || page!=='pick' || kind!=='draw')return;
    if(drawing && !e.isPrimary){e.preventDefault();e.stopPropagation();stopPick();return;}
    if(!e.isPrimary || e.button!==0 || e.altKey)return;
    e.preventDefault();e.stopPropagation();canvas.focus({preventScroll:true});
    setMessage('');clearInput();
    drawing={id:e.pointerId,stroke:startSurfaceStroke(getContext()),painted:0};
    canvas.setPointerCapture(e.pointerId);
    drawing.stroke.add(uvAt(e));
  },true);
  stage.addEventListener('pointermove',e=>{
    if(drawing?.id!==e.pointerId)return;
    e.stopPropagation();
    if(!drawing.stroke.matches(getContext())){stopPick();return;}
    const samples=e.getCoalescedEvents?.();
    for(const sample of samples?.length?samples:[e])drawing.stroke.add(uvAt(sample));
  },true);
  stage.addEventListener('pointerup',e=>{
    if(drawing?.id!==e.pointerId)return;
    e.preventDefault();e.stopPropagation();teleportUntil=performance.now()+450;
    const {stroke}=drawing;
    try{
      if(!stroke.matches(getContext()) || !sameModel(sourceModel,model())){stopPick();return;}
      stroke.add(uvAt(e),true);
      if(stroke.count<2){stopPick();setMessage('shortStroke');return;}
      paintStroke();
      const region=markers.withoutMarkers(()=>captureStroke(getContext(),stroke,number(draft?.id)));
      useRegion(region,[...new Set(stroke.region.segments.map(s=>s.object.key))]);
    }catch{stopPick();setMessage('captureError');}
  },true);
  canvas.addEventListener('pointerdown',e=>{
    if(page!=='closed')canvas.focus({preventScroll:true});
    fingers.add(e.pointerId);
    gesture=fingers.size===1 && e.isPrimary && e.button===0?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;
  },true);
  canvas.addEventListener('pointermove',e=>{
    if(gesture?.id===e.pointerId && Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>5)gesture=null;
  },true);
  canvas.addEventListener('pointerup',e=>{
    const tap=gesture?.id===e.pointerId && Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<=5;
    fingers.delete(e.pointerId);gesture=null;
    if(!tap||busy||getContext().tools?.isMeasuring)return;
    const uv=uvAt(e);
    if(page==='pick'){selectAt(uv);teleportUntil=performance.now()+450;return;}
    const id=markers.hit(getContext(),uv);
    if(id){
      teleportUntil=performance.now()+450;
      if(draft?.id===id)return;
      const note=notes.find(n=>n.id===id);if(note)edit(note,false);
    }
  },true);
  function cancelPointer(e){fingers.delete(e.pointerId);gesture=null;if(drawing?.id===e.pointerId)stopPick();}
  canvas.addEventListener('pointercancel',cancelPointer,true);canvas.addEventListener('lostpointercapture',cancelPointer);
  window.addEventListener('blur',()=>{fingers.clear();stopPick();});
  document.getElementById('measure-toggle').addEventListener('click',()=>{if(page==='pick')cancelPick();},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && page!=='closed'&&!busy){if(page==='pick')cancelPick();else if(page==='edit')cancelEdit();else dismiss();}});
  function describe(note){
    const rooms=note.region.roomIds.map(id=>getContext().data.rooms?.find(r=>r.id===id)?.name).filter(Boolean).map(roomText);
    return [note.model.revisionId && 'rev '+note.model.revisionId,...rooms].filter(Boolean).join(' · ');
  }
  async function save(){
    if(busy||!draft)return;
    if(!draft.text.trim()&&!draft.referenceImages.length){setMessage('content');return;}
    busy=true;render();
    try{
      const note={...draft,updatedAt:new Date().toISOString(),version:draft.version+1};
      const summary=await ensureStore().save(note,draft.version);
      ++loadId;notes=[...notes.filter(n=>n.id!==summary.id),summary].sort(byCreation);
      dirty=false;draft=null;page='list';
    }catch(e){busy=false;render();setMessage(e.message==='conflict'?'conflict':'storage');return;}
    busy=false;render();
  }
  async function deleteSuggestion(note){
    if(busy||!note.version||!window.confirm(tr('confirmDelete')))return;
    busy=true;render();
    try{
      await ensureStore().remove(note.id,note.version);
      ++loadId;notes=notes.filter(n=>n.id!==note.id);
      if(active===note.id)active=null;
      draft=null;dirty=false;page='list';
    }catch(e){
      busy=false;await refresh();setMessage(e.message==='conflict'?'conflict':'storage');return;
    }
    busy=false;render();
  }
  async function attach(files) {
    if(!files.length || busy)return;
    busy=true;render();
    let failed=false;
    try {
      const images=await Promise.all(Array.from(files,readImage));
      draft.referenceImages.push(...images);dirty=true;
    } catch {failed=true;}
    busy=false;render();if(failed)setMessage('file');
  }
  async function download() {
    if(busy)return;
    busy=true;render();
    try {
      const bundle=exportSuggestions(project,await ensureStore().all());
      const url=URL.createObjectURL(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}));
      const link=el('a');link.href=url;link.download=project+'-suggestions-'+bundle.exportedAt.slice(0,10)+'.json';
      document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
      busy=false;render();
    } catch {busy=false;render();setMessage('storage');}
  }

  function picker(){
    const choices=el('div');choices.className='sg-kinds';choices.setAttribute('role','group');
    for(const key of ['point','draw','object']){
      const choice=button(key,()=>{kind=key;stopPick();render();},'suggestion-'+key);
      choice.setAttribute('aria-pressed',String(kind===key));choices.append(choice);
    }
    body.append(choices,el('p',tr(kind==='object'?'objectHint':kind==='point'?'pointHint':'drawHint')));
  }
  function editor(parent){
    const form=el('div');form.className='sg-editor';parent.append(form);
    const label=el('label',tr('text')),input=el('textarea');input.id='suggestion-text';input.rows=3;input.value=draft.text;
    input.oninput=()=>{draft.text=input.value;dirty=true;};label.append(input);form.append(label);
    const file=el('input');file.type='file';file.multiple=true;file.id='suggestion-files';file.hidden=true;
    file.accept='image/jpeg,image/png,image/webp,image/gif,image/avif';file.onchange=()=>attach(file.files);
    const drop=button('drop',()=>file.click(),'suggestion-drop');drop.className='sg-drop';
    drop.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';drop.classList.add('sg-over');};
    drop.ondragleave=()=>drop.classList.remove('sg-over');
    drop.ondrop=e=>{e.preventDefault();drop.classList.remove('sg-over');attach(e.dataTransfer.files);};
    form.append(drop,file);
    for(const [i,image] of draft.referenceImages.entries()){
      const row=el('div'),thumb=el('img');row.className='sg-photo';thumb.src=image.dataUrl;thumb.alt=image.name;
      row.append(thumb,el('span',image.name),button('remove',()=>{draft.referenceImages.splice(i,1);dirty=true;render();}));form.append(row);
    }
    const actions=el('div');actions.className='sg-actions';actions.append(button('save',save,'suggestion-save'));
    const change=button('change',()=>beginPick(false),'suggestion-redraw');change.disabled=!located();actions.append(change);form.append(actions);
    if(draft.version)actions.append(button('del',()=>deleteSuggestion(draft),'suggestion-delete'));
  }
  function renderList(){
    if(!ready){body.append(button('retry',refresh));return;}
    const entries=[...notes].reverse();
    if(!entries.length)body.append(el('p',tr('empty')));
    const list=el('ol');list.className='sg-list';body.append(list);
    for(const n of entries){
      const item=el('li'),row=el('button');row.type='button';row.className='sg-item';
      row.classList.toggle('selected',n.id===active);row.setAttribute('aria-expanded',String(n.id===draft?.id));
      const badge=el('span',String(number(n.id)));badge.className='sg-badge';
      const name=el('span');name.append(el('strong',n.title || n.text || tr(n.version?'imageNote':'newComment')),el('small',describe(n)));
      row.append(badge,name);row.onclick=()=>{if(draft?.id===n.id){cancelEdit();return;}edit(n);};
      const del=button('del',()=>deleteSuggestion(n));del.className='sg-delete';del.setAttribute('aria-label',tr('del')+' #'+number(n.id));
      item.append(row,del);list.append(item);
    }
    if(notes.length)body.append(button('export',download,'suggestions-export'));
  }
  function render(){
    const open=page!=='closed',picking=page==='pick';
    panel.hidden=!open;panel.classList.toggle('sg-picking',picking);canvas.classList.toggle('sg-aim',picking);
    caption.textContent=tr('title');count.textContent=ready?String(notes.length):'…';
    plus.title=tr('add');plus.setAttribute('aria-label',tr('add'));plus.disabled=!ready||busy;
    dock.dataset.page=page;
    trigger.setAttribute('aria-expanded',String(open));trigger.setAttribute('aria-pressed',String(open));
    title.textContent=picking?tr('add'):page==='edit'?'#'+number(draft.id)+' · '+tr(draft.region.kind==='model-object'?'object':draft.region.points?'point':draft.region.kind==='surface-stroke'?'draw':'area'):tr('title');
    close.onclick=picking?cancelPick:page==='edit'?cancelEdit:dismiss;
    close.textContent='×';close.setAttribute('aria-label',tr('close'));close.disabled=busy;
    body.replaceChildren();setMessage('');
    if(picking)picker();else if(page==='edit')editor(body);else if(open)renderList();
    if(busy)for(const c of body.querySelectorAll('button,textarea,input'))c.disabled=true;
    syncMarkers();
  }
  new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  render();refresh();
  return {
    get isPicking(){return page==='pick'||performance.now()<teleportUntil;},
    update(){
      paintStroke();
      markers.update(getContext());
    },
    modelChanged(){
      if(page==='pick')cancelPick();
      render();if(page==='edit'&&!located())setMessage('unavailable');
    }
  };
}
