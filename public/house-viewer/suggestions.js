import {capturePin,startSurfaceStroke,captureStroke,captureObject,captureRoomSurface,capturePlacement,captureWholeView,placementBox,displayRegion,displayRegions,noteRegions,modelIdentity,sameModel,pinMarkers} from './suggestion-region.js';
import {openSuggestions,exportSuggestions} from './suggestion-store.js';
import {roomText} from './i18n.js';

const copy={
  title:['Edits','修改'],add:['New edit','新增修改'],close:['Close','关闭'],cancel:['Cancel','取消'],
  empty:['No edits yet.','还没有修改。'],save:['Save','保存'],del:['Delete','删除'],confirmDelete:['Delete this edit and its reference images?','删除这条修改及其附图？'],text:['Comment','评论'],photos:['Reference images','参考图'],
  drop:['Drop images or choose files','拖入图片或点击选取文件'],remove:['Remove','移除'],change:['Change location','重选位置'],
  object:['Object','构件'],objectHint:['Tap a cabinet, bed or other model object.','点击柜子、床等模型构件。'],area:['Area','框选'],
  new:['New edit','新增修改'],imageNote:['Image reference','参考图'],walk:['Walkthrough','漫游'],model:['Model','模型'],
  miss:['Select a visible model surface.','请选择模型上可见的表面。'],shortStroke:['Draw a line on a visible surface.','请在可见表面画一段线。'],
  content:['Add a comment or a reference image.','请填写评论或添加参考图。'],storage:['Could not access saved edits.','无法读写已存的修改。'],
  file:['Choose a PNG, JPEG, WebP, GIF or AVIF image.','请选择 PNG、JPEG、WebP、GIF 或 AVIF 图片。'],
  captureError:['Could not capture the location. Try again.','未能记录位置，请重试。'],
  unavailable:['Open the original build to change this location.','请打开原模型版本后再修改位置。'],
  conflict:['Reopen this edit to see changes from another tab.','这条修改已在其他标签页更新，请重新打开。'],
  discard:['Discard unsaved changes?','放弃未保存的修改？'],
  loading:['Loading…','正在读取…'],retry:['Retry','重试'],export:['Export JSON','导出 JSON'],newComment:['New comment','新评论'],
  intro:['Mark an object, a spot, an area or a place for something new, and describe the change. Edits are saved on this device until you send them; the workstation updates the model and publishes it here.','在模型上标出构件、位置、区域或要新增物品的地方，写下想怎么改。修改先保存在这台设备上，发送后工作站会更新模型并发布到这里。'],
  step1:['Choose New edit, then mark the model.','点“新增修改”，再在模型上标出位置。'],
  step2:['Choose the kind of change and describe it. Sizes and reference images help.','选择改动类型并写下要求，尺寸和参考图会更准确。'],
  step3:['Send. The updated model appears here when it is live.','发送。模型更新上线后会显示在这里。'],
  current:['This revision','当前版本'],other:['Other revisions','其他版本'],
  where:['Where should it change?','要改哪里？'],
  objectSub:['A cabinet, bed or fixture','柜子、床或固定家具'],pointSub:['One spot on any surface','任意表面上的一点'],drawSub:['Trace an area','圈出一片区域'],
  location:['Location','位置'],what:['What should change?','想怎么改？'],
  placeholder:['For example: make the island 20 cm longer with an oak top.','例如：岛台加长 20 cm，台面换成橡木。'],
  optional:['optional','可选'],saveNote:['Save edit','保存修改'],
  places:['Places','位置'],show:['Show','查看'],addPlace:['+ Add another place','+ 再加一个位置'],addWhere:['Add another place','再加一个位置'],
  staged:['To send','待发送'],sent:['Sent','已发送'],editTitle:['Change this edit','更改这条修改'],
  attention:['Needs you','需要你处理'],progress:['Working','进行中'],draft:['Drafts','草稿'],done:['Live','已上线'],
  doneHint:['Built into the live model. Nothing more to do.','已建入线上模型，无需再处理。'],
  allDone:['All your edits are in the live model.','你的修改都已建入线上模型。'],
  openCount:['{n} open edits','{n} 条待处理修改'],
  update:['Change','更改'],showModel:['Show in model','在模型中查看'],enlarge:['Enlarge preview','放大预览'],previewAlt:['Before and after','修改前后对比'],
  point:['Point','点'],pointSub:['One spot on any surface','任意表面上的一点'],pointHint:['Tap the spot you want to change. You can still orbit.','点要修改的位置，仍可拖动旋转视角。'],
  draw:['Trace','描画'],drawSub:['Draw along surfaces','沿表面描出范围'],drawHint:['Drag along a surface to trace the area. Lift to comment.','按住表面拖动描出范围，松开后填写。'],
  room:['Room surface','房间界面'],roomSub:['A whole floor, wall or ceiling','整片地面、墙面或吊顶'],
  roomHint:['Tap the floor, a wall or the ceiling of a room.','点房间的地面、某面墙或吊顶。'],
  placement:['New item','新增物品'],placementSub:['Where something should be added','标出要添加物品的位置'],
  placementHint:['Tap the floor, a counter or a wall where it should go. You can set its size next.','点要放置的位置（地面、台面或墙面），下一步可填尺寸。'],
  view:['Whole view','整个画面'],viewSub:['Style, light or anything you see','风格、光线或画面里的任何内容'],
  viewHint:['Move to the view you want to comment on, then choose Use this view.','先移动到要评论的画面，再点“使用当前画面”。'],
  useView:['Use this view','使用当前画面'],
  floor:['floor','地面'],wall:['wall','墙面'],ceiling:['ceiling','吊顶'],
  changeKind:['What kind of change?','改动类型'],
  act_finish:['Material / colour','材质 / 颜色'],act_resize:['Size','尺寸'],act_move:['Position','位置'],act_replace:['Replace','替换'],
  act_add:['Add new','新增'],act_remove:['Remove','移除'],act_style:['Style / light','风格 / 光线'],act_other:['Other','其他'],
  size:['Size (mm)','尺寸（毫米）'],width:['Width','宽'],depth:['Depth','深'],height:['Height','高'],
  sizeNote:['Leave blank if you are not sure.','不确定可以留空。'],
  ph_finish:['For example: light oak veneer, matte white lacquer doors.','例如：浅色橡木饰面，柜门哑光白。'],
  ph_resize:['For example: 20 cm longer, keep the height.','例如：加长 20 cm，高度不变。'],
  ph_move:['For example: move it 50 cm toward the window.','例如：往窗边移 50 cm。'],
  ph_replace:['For example: replace with a round dining table for six.','例如：换成六人圆餐桌。'],
  ph_add:['For example: a three-seat sofa in grey fabric, facing the TV.','例如：灰色布艺三人沙发，面向电视。'],
  ph_remove:['For example: remove this shelf, keep the wall paint.','例如：拆掉这层隔板，墙面保持原样。'],
  ph_style:['For example: warmer, softer light; Japanese wood style.','例如：光线更暖更柔和，日式木质风格。'],
  sentNote:['This edit was sent ({status}). Saving makes the new version a draft to send again; the workstation keeps the version it received.','这条修改已发送（{status}）。保存后新版本会成为草稿，可再次发送；工作站仍使用它收到的版本。']
};
const tr=key=>copy[key][document.documentElement.lang.startsWith('zh')?1:0];
// An integration (the website's workstation) may classify saved suggestions:
// window.__HOUSE_SUGGESTION_STATUS(summary) -> {group:'attention'|'progress'|'draft'|'done', text, tone,
//   note?, preview?:()=>Promise<url>, actions?:[{id,label,primary,pressed}]}, and
// window.__HOUSE_SUGGESTION_ACTION(summary, actionId) runs an action.
const statusOf=note=>{try{return window.__HOUSE_SUGGESTION_STATUS?.(note)||null;}catch{return null;}};
const GROUP={staged:'draft',sent:'progress'};
// Edits already built into the live model are finished: they leave the count, the markers and the open list.
const isDone=note=>{const s=statusOf(note);return !!s&&(GROUP[s.group]||s.group)==='done';};
let showDone=false;
try{showDone=sessionStorage.getItem('house-edits-show-done')==='1';}catch{}
const ACTIONS=['finish','resize','move','replace','add','remove','style','other'];
const SIZED=new Set(['resize','replace','add']);
const DEFAULT_SIZE_MM={width:600,depth:600,height:750};
// The picker's target for a saved region.
function targetOf(region){
  if(region.kind==='model-object')return 'object';
  if(region.kind==='room-surface')return 'room';
  if(region.kind==='placement')return 'placement';
  if(region.kind==='view')return 'view';
  return region.kind==='surface-stroke'?'draw':'point';
}

// A full-screen view of one preview image. Escape closes it without closing the panel.
function lightbox(url,caption){
  const shade=el('div');shade.className='sg-lightbox';shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');shade.tabIndex=-1;
  const img=el('img');img.src=url;img.alt=caption;
  const close=el('button','×');close.type='button';close.setAttribute('aria-label',tr('close'));
  const text=el('p',caption);
  const done=()=>{document.removeEventListener('keydown',key,true);shade.remove();};
  const key=e=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();done();}};
  close.onclick=done;shade.onclick=e=>{if(e.target===shade)done();};
  document.addEventListener('keydown',key,true);
  shade.append(close,img,text);document.body.append(shade);close.focus();
}
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
  // The status bar and footer survive re-renders; integrations such as the workstation fill them.
  const statusBar=el('div');statusBar.className='sg-statusbar';statusBar.id='suggestions-status';
  const footer=el('div');footer.className='sg-footer';footer.id='suggestions-footer';
  header.append(title,close);panel.append(header,statusBar,body,message,footer);dock.append(panel,bar);document.body.append(dock);
  const canvas=getContext().canvas,markers=pinMarkers(getContext().scene);canvas.tabIndex=-1;
  const ink=pinMarkers(getContext().scene,'Suggestion brush');
  let store,project,notes=[],ready=false,draft=null,dirty=false,busy=false,page='closed',active=null,kind='object',adding=false;
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
  // `add` picks one more place for the open suggestion instead of replacing its first place.
  function beginPick(isNew,add=false){
    if(busy||!ready)return;
    adding=!isNew&&add;
    if(isNew){if(!clean())return;draft=null;dirty=false;active=null;}
    if(document.pointerLockElement)document.exitPointerLock();
    kind=isNew || adding?'object':targetOf(draft.region);
    stopPick();fingers.clear();clearInput();getContext().tools?.setMeasuring(false);
    sourceModel=model();page='pick';render();
  }
  function cancelPick(){stopPick();adding=false;page=draft?'edit':'list';render();}
  function cancelEdit(){if(busy||!clean())return;draft=null;dirty=false;page='list';render();}
  function number(id){const i=notes.findIndex(n=>n.id===id);return i<0?notes.length+1:i+1;}
  function syncMarkers(){
    const current=model();
    const entries=notes.filter(n=>sameModel(n.model,current)&&n.id!==draft?.id&&(showDone||!isDone(n)))
      .map(n=>({id:n.id,number:number(n.id),active:n.id===active,shape:n.shape}));
    if(located())entries.push({id:draft.id,number:number(draft.id),active:true,shape:displayRegions(noteRegions(draft))});
    markers.set(entries);markers.update(getContext());
    getContext().wake?.(300);  // Rendering is on demand: show the changed markers.
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
    if(!draft)draft={id:crypto.randomUUID(),createdAt:new Date().toISOString(),version:0,model:sourceModel,text:'',referenceImages:[],
      change:{action:{placement:'add',view:'style',room:'finish'}[targetOf(region)]||null}};
    draft.change??={action:null};
    if(adding){draft.extraRegions=[...(draft.extraRegions||[]),region];draft.targetObjectKeys=[...new Set([...(draft.targetObjectKeys||[]),...keys])];}
    else{draft.region=region;draft.targetObjectKeys=[...new Set([...keys,...(draft.extraRegions||[]).flatMap(regionKeys)])];}
    adding=false;active=draft.id;dirty=true;page='edit';render();
    body.querySelector('textarea')?.focus({preventScroll:true});
  }
  function sizeM(){
    const mm={...DEFAULT_SIZE_MM,...Object.fromEntries(Object.entries(draft?.change?.dimensionsMm||{}).filter(([,v])=>v>0))};
    return [mm.width/1000,mm.depth/1000,mm.height/1000];
  }
  function selectAt(uv){
    if(kind==='draw'||kind==='view')return;
    if(!sameModel(sourceModel,model())){cancelPick();return;}
    const ctx=getContext(),n=number(draft?.id);
    try{
      if(kind==='object'){
        const region=markers.withoutMarkers(()=>captureObject(ctx,uv,n));
        useRegion(region,region?[region.object.key]:[]);
      }else if(kind==='room'){
        const region=markers.withoutMarkers(()=>captureRoomSurface(ctx,uv,n));
        useRegion(region,region?.object?[region.object.key]:[]);
      }else if(kind==='placement'){
        const region=markers.withoutMarkers(()=>capturePlacement(ctx,uv,n,sizeM()));
        useRegion(region,[]);
      }else{
        const pin=markers.withoutMarkers(()=>capturePin(ctx,uv,n));
        useRegion(pin && {kind:'surface-pins',points:[pin],view:pin.view,roomIds:pin.roomId?[pin.roomId]:[]},pin?[pin.object.key]:[]);
      }
    }catch{setMessage('captureError');}
  }
  function useView(){
    if(!sameModel(sourceModel,model())){cancelPick();return;}
    try{useRegion(markers.withoutMarkers(()=>captureWholeView(getContext(),number(draft?.id))),[]);}catch{setMessage('captureError');}
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
      if(stroke.count<2){
        // A tap while tracing marks one spot.
        stopPick();
        const pin=markers.withoutMarkers(()=>capturePin(getContext(),uvAt(e),number(draft?.id)));
        useRegion(pin && {kind:'surface-pins',points:[pin],view:pin.view,roomIds:pin.roomId?[pin.roomId]:[]},pin?[pin.object.key]:[]);
        return;
      }
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
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && page!=='closed'&&!busy&&!document.querySelector('dialog:modal')){if(page==='pick')cancelPick();else if(page==='edit')cancelEdit();else dismiss();}});
  function roomNames(ids){return (ids||[]).map(id=>getContext().data.rooms?.find(r=>r.id===id)?.name).filter(Boolean).map(roomText);}
  function describe(note){
    const places=note.places>1?tr('places').toLowerCase()+' '+note.places:'';
    const action=note.action&&ACTIONS.includes(note.action)?tr('act_'+note.action):'';
    return [action,note.model.revisionId && 'rev '+note.model.revisionId,...roomNames(note.region.roomIds),places].filter(Boolean).join(' · ');
  }
  function regionKeys(region){
    return [region.object?.key,...(region.segments||[]).map(s=>s.object?.key),...(region.points||[]).map(p=>p.object?.key)].filter(Boolean);
  }
  function kindName(region){
    if(region.kind==='room-surface')return tr('room')+' · '+tr(region.surface);
    if(region.kind==='surface-area')return tr('area');
    return tr(targetOf(region));
  }
  // New-item boxes follow the size typed in the editor.
  function resizePlacements(){
    if(!draft)return;
    const size=sizeM(),fit=r=>r.kind==='placement'?{...r,...placementBox(r.anchor,size)}:r;
    draft.region=fit(draft.region);if(draft.extraRegions)draft.extraRegions=draft.extraRegions.map(fit);
  }
  async function save(){
    if(busy||!draft)return;
    if(!draft.text.trim()&&!draft.referenceImages.length){setMessage('content');return;}
    busy=true;resizePlacements();render();
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
      const link=el('a');link.href=url;link.download=project+'-edits-'+bundle.exportedAt.slice(0,10)+'.json';
      document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
      busy=false;render();
    } catch {busy=false;render();setMessage('storage');}
  }

  function picker(){
    const choices=el('div');choices.className='sg-kinds';choices.setAttribute('role','group');choices.setAttribute('aria-label',tr('where'));
    for(const key of ['object','point','draw','room','placement','view']){
      const choice=button(key,()=>{kind=key;stopPick();render();},'suggestion-'+key);
      choice.replaceChildren(el('strong',tr(key)),el('small',tr(key+'Sub')));
      choice.setAttribute('aria-pressed',String(kind===key));choices.append(choice);
    }
    const hint=el('p',tr(kind+'Hint'));hint.className='sg-hint';
    body.append(choices,hint);
    if(kind==='view'){const use=button('useView',useView,'suggestion-use-view');use.className='sg-primary';body.append(use);}
  }
  function editor(parent){
    const form=el('div');form.className='sg-editor';parent.append(form);
    const status=draft.version?statusOf(draft):null;
    if(status?.group==='sent'){const note=el('p',tr('sentNote').replace('{status}',status.text));note.className='sg-note';form.append(note);}
    const places=el('div');places.className='sg-places';
    const heading=el('p',tr('places'));heading.className='sg-label';places.append(heading);
    const list=el('ol');
    for(const [i,region] of noteRegions(draft).entries()){
      const row=el('li'),name=el('span');
      name.append(el('strong',kindName(region)),el('small',roomNames(region.roomIds).join(' · ')||(draft.model.revisionId?'rev '+draft.model.revisionId:'')));
      const show=button('show',()=>{if(located())goView(region.view);});show.disabled=!located();
      row.append(name,show);
      if(i===0){const change=button('change',()=>beginPick(false),'suggestion-redraw');change.disabled=!located();row.append(change);}
      else row.append(button('remove',()=>{draft.extraRegions.splice(i-1,1);draft.targetObjectKeys=[...new Set(noteRegions(draft).flatMap(regionKeys))];dirty=true;render();}));
      list.append(row);
    }
    const add=button('addPlace',()=>beginPick(false,true),'suggestion-add-place');add.className='sg-link';add.disabled=!located();
    places.append(list,add);form.append(places);
    draft.change??={action:null};
    const change=el('div');change.className='sg-change';change.setAttribute('role','group');change.setAttribute('aria-label',tr('changeKind'));
    const changeLabel=el('p',tr('changeKind'));changeLabel.className='sg-label';
    const chips=el('div');chips.className='sg-chips';
    for(const key of ACTIONS){
      const chip=button('act_'+key,()=>{draft.change.action=draft.change.action===key?null:key;dirty=true;render();});
      chip.className='sg-chip';chip.dataset.action=key;chip.setAttribute('aria-pressed',String(draft.change.action===key));chips.append(chip);
    }
    change.append(changeLabel,chips);form.append(change);
    if(SIZED.has(draft.change.action)||noteRegions(draft).some(r=>r.kind==='placement')){
      const size=el('fieldset');size.className='sg-size';size.append(el('legend',tr('size')));
      for(const key of ['width','depth','height']){
        const field=el('label',tr(key)),value=el('input');value.type='number';value.min='10';value.max='8000';value.step='10';value.inputMode='numeric';
        value.id='suggestion-size-'+key;value.value=draft.change.dimensionsMm?.[key]||'';
        value.placeholder=noteRegions(draft).some(r=>r.kind==='placement')?String(DEFAULT_SIZE_MM[key]):'';
        value.oninput=()=>{
          const n=Math.round(+value.value);draft.change.dimensionsMm={...draft.change.dimensionsMm};
          if(n>0)draft.change.dimensionsMm[key]=n;else delete draft.change.dimensionsMm[key];
          dirty=true;resizePlacements();syncMarkers();
        };
        field.append(value);size.append(field);
      }
      const hint=el('small',tr('sizeNote'));size.append(hint);form.append(size);
    }
    const label=el('label',tr('what')),input=el('textarea');input.id='suggestion-text';input.rows=3;input.value=draft.text;
    input.placeholder=tr(draft.change.action&&copy['ph_'+draft.change.action]?'ph_'+draft.change.action:'placeholder');
    input.oninput=()=>{draft.text=input.value;dirty=true;};label.append(input);form.append(label);
    const photos=el('p');photos.className='sg-label';photos.append(tr('photos')+' ',el('small','('+tr('optional')+')'));form.append(photos);
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
    const actions=el('div');actions.className='sg-actions';actions.append(button('saveNote',save,'suggestion-save'),button('cancel',cancelEdit));form.append(actions);
    if(draft.version)actions.append(button('del',()=>deleteSuggestion(draft),'suggestion-delete'));
  }
  function renderList(){
    if(!ready){body.append(button('retry',refresh));return;}
    const create=button('add',()=>beginPick(true),'suggestion-create');create.className='sg-primary';create.textContent='+ '+tr('add');
    if(!notes.length){
      const steps=el('ol');steps.className='sg-steps';
      for(const key of ['step1','step2','step3'])steps.append(el('li',tr(key)));
      const empty=el('ol');empty.className='sg-list';
      body.append(create,el('p',tr('intro')),steps,empty);return;
    }
    const here=model(),entries=[...notes].reverse();
    const current=entries.filter(n=>sameModel(n.model,here)),other=entries.filter(n=>!sameModel(n.model,here));
    let groups;
    if(window.__HOUSE_SUGGESTION_STATUS){
      // What needs the viewer first, then work in progress, drafts, and finished suggestions.
      // Edits drawn on an earlier revision still apply: the workstation places them on the current model.
      const sorted={attention:[],progress:[],draft:[],done:[]};
      for(const n of entries){const s=statusOf(n);sorted[GROUP[s?.group]||s?.group||'draft']?.push(n)??sorted.draft.push(n);}
      groups=Object.entries(sorted);
    }else groups=[['current',current],['other',other]];
    for(const [key,group] of groups){
      if(!group.length)continue;
      const list=el('ol');list.className='sg-list';list.dataset.group=key;
      if(key==='done'){
        // Finished edits stay available but folded away, so the open list shows only what is left to do.
        if(groups.every(([k,g])=>k==='done'||!g.length)){const all=el('p',tr('allDone'));all.className='sg-note sg-all-done';body.append(all);}
        const fold=el('details');fold.className='sg-done';fold.open=showDone;
        fold.ontoggle=()=>{showDone=fold.open;try{sessionStorage.setItem('house-edits-show-done',showDone?'1':'0');}catch{}syncMarkers();};
        const summary=el('summary');summary.className='sg-group';summary.dataset.group=key;summary.append(tr(key)+' ',el('span',String(group.length)));
        const hint=el('p',tr('doneHint'));hint.className='sg-note';
        fold.append(summary,hint,list);body.append(fold);
      }else{
        const heading=el('h3');heading.className='sg-group';heading.dataset.group=key;heading.append(tr(key)+' ',el('span',String(group.length)));body.append(heading,list);
      }
      renderItems(list,group);
    }
    body.append(create);
    const exportButton=button('export',download,'suggestions-export');exportButton.className='sg-link';body.append(exportButton);
  }
  async function showInModel(n){
    if(busy)return;
    try{
      const note=await ensureStore().read(n.id);
      if(!sameModel(note.model,model()) && note.model.revisionId)await selectRevision(note.model.revisionId,note.model.buildId);
      if(sameModel(note.model,model())){active=n.id;goView(note.region.view);render();}
    }catch{setMessage('storage');}
  }
  // One card per suggestion: what it says, where it stands, what was built, and what to do next.
  function renderItems(list,entries){
    for(const n of entries){
      const s=statusOf(n);
      const item=el('li'),row=el('button');row.type='button';row.className='sg-item';item.className='sg-card';item.dataset.suggestionId=n.id;
      if(s?.tone)item.dataset.tone=s.tone;
      row.classList.toggle('selected',n.id===active);row.setAttribute('aria-expanded',String(n.id===draft?.id));
      const badge=el('span',String(number(n.id)));badge.className='sg-badge';
      const status=el('span');status.className='sg-status';
      if(s?.text){status.textContent=s.text;if(s.tone)status.dataset.tone=s.tone;}
      const name=el('span');name.append(el('strong',n.title || n.text || tr(n.version?'imageNote':'newComment')),el('small',describe(n)),status);
      row.append(badge,name);row.onclick=()=>{if(draft?.id===n.id){cancelEdit();return;}edit(n);};
      item.append(row);
      if(s?.note){const note=el('p',s.note);note.className='sg-card-note';item.append(note);}
      if(s?.preview){
        const frame=button('enlarge',()=>{},'');frame.removeAttribute('id');frame.className='sg-preview';frame.textContent='';frame.setAttribute('aria-label',tr('enlarge')+' #'+number(n.id));frame.disabled=true;
        item.append(frame);
        s.preview().then(url=>{
          if(!url){frame.remove();return;}
          const img=el('img');img.src=url;img.alt=tr('previewAlt')+' #'+number(n.id);frame.append(img);frame.disabled=false;
          frame.onclick=()=>lightbox(url,'#'+number(n.id)+' '+(n.title||''));
        }).catch(()=>frame.remove());
      }
      const actions=el('div');actions.className='sg-card-actions';
      for(const a of s?.actions||[]){
        const b=el('button',a.label);b.type='button';b.className=a.primary?'sg-act sg-act-primary':'sg-act';
        if(a.pressed!==undefined)b.setAttribute('aria-pressed',String(a.pressed));
        b.onclick=()=>window.__HOUSE_SUGGESTION_ACTION?.(n,a.id);actions.append(b);
      }
      const update=button('update',()=>edit(n));update.className='sg-act';
      const show=button('showModel',()=>showInModel(n));show.className='sg-act sg-quiet';
      actions.append(update,show);
      if(!s||(GROUP[s.group]||s.group)==='draft'){const del=button('del',()=>deleteSuggestion(n));del.className='sg-act sg-delete';del.setAttribute('aria-label',tr('del')+' #'+number(n.id));actions.append(del);}
      item.append(actions);list.append(item);
    }
  }
  function render(){
    const open=page!=='closed',picking=page==='pick';
    panel.hidden=!open;panel.classList.toggle('sg-picking',picking);canvas.classList.toggle('sg-aim',picking);
    const openEdits=ready?notes.filter(n=>!isDone(n)).length:0;
    caption.textContent=tr('title');count.textContent=ready?String(openEdits):'…';
    count.title=ready?tr('openCount').replace('{n}',openEdits):'';count.dataset.open=String(openEdits);
    plus.title=tr('add');plus.setAttribute('aria-label',tr('add'));plus.disabled=!ready||busy;
    dock.dataset.page=page;
    trigger.setAttribute('aria-expanded',String(open));trigger.setAttribute('aria-pressed',String(open));
    title.textContent=picking?tr(adding?'addWhere':'where'):page==='edit'?'#'+number(draft.id)+' · '+tr(draft.version?'editTitle':'new'):tr('title');
    close.onclick=picking?cancelPick:page==='edit'?cancelEdit:dismiss;
    close.textContent='×';close.setAttribute('aria-label',tr('close'));close.disabled=busy;
    body.replaceChildren();setMessage('');
    if(picking)picker();else if(page==='edit')editor(body);else if(open)renderList();
    if(busy)for(const c of body.querySelectorAll('button,textarea,input'))c.disabled=true;
    footer.hidden=page!=='list';statusBar.hidden=page!=='list';
    syncMarkers();
    // Integrations read saved suggestions and decorate list items through this event.
    document.dispatchEvent(new CustomEvent('house:suggestions',{detail:{page,ready,model:model(),notes:notes.map(n=>({id:n.id,version:n.version,number:number(n.id),model:n.model,text:n.title||''}))}}));
  }
  // The workstation asks to reopen a suggestion, or to redraw statuses after its jobs change.
  document.addEventListener('house:edit-suggestion',event=>{
    const note=notes.find(n=>n.id===event.detail?.id);if(!note||busy)return;
    if(page==='closed'){if(document.pointerLockElement)document.exitPointerLock();page='list';}
    edit(note);
  });
  document.addEventListener('house:suggestions-refresh',()=>{if(page==='list')render();});
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
