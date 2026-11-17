import {createHash, randomBytes, webcrypto} from 'node:crypto';
import {readFile, writeFile, mkdir, rename, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deriveHouseKey, decryptHouseFile} from '../lib/house-crypto.mjs';
globalThis.crypto ??= webcrypto;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const scriptJson=value=>JSON.stringify(value).replaceAll('<','\\u003c');

// Each document is self-contained and encrypted. No source/reference tree is public.
export async function packageHouseDocuments(sourceRoot) {
  const source=await realpath(sourceRoot), provenance={};
  async function read(relative) {
    const file=await realpath(path.resolve(source,relative));
    if(!file.startsWith(source+path.sep))throw Error('Document dependency escapes source');
    const bytes=await readFile(file);provenance[path.relative(source,file).split(path.sep).join('/')]=hash(bytes);return bytes;
  }
  const documents=[];
  {
    const dir='projects/zhijiang/reference/interior/concepts/tuscan-materials-v2';
    const manifest=JSON.parse(await read(`${dir}/manifest.json`));
    const names=['living-stone-target-v2.png','living-teak-target-v2.png','kitchen-target-v2.png','dining-target-v2.png','living-wide-base.png','kitchen-base.png','dining-base.png'];
    const images={};
    for(const name of names) {
      const bytes=await read(`${dir}/${name}`);
      if(hash(bytes)!==manifest.files[name])throw Error('Concept checksum mismatch: '+name);
      images[name]=`data:image/png;base64,${bytes.toString('base64')}`;
    }
    const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>之江门 · 室内设计提案</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f5f2eb;color:#34382e;font:16px/1.7 system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:24px clamp(16px,4vw,48px) 40px}h1{font-size:clamp(25px,4vw,38px);font-weight:500;margin:4px 0}p{color:#6e7165}.eyebrow{font-size:12px;letter-spacing:.12em}nav,.materials,.controls{display:flex;gap:7px;flex-wrap:wrap;margin:16px 0}button{font:inherit;color:inherit;border:1px solid #d6d5c9;border-radius:22px;background:transparent;padding:7px 15px;cursor:pointer}button[aria-pressed=true]{background:#5a6549;color:white;border-color:#5a6549}button:focus-visible{outline:3px solid #a3693f;outline-offset:3px}.hero{width:100%;height:auto;aspect-ratio:3/2;object-fit:contain;border-radius:10px;display:block}.note{font-size:13px}h2{font-weight:500;font-size:21px}[hidden]{display:none!important}</style>
<main><div class="eyebrow">ZHIJIANG · INTERIOR STUDY 02</div><h1>自然托斯卡纳</h1><p>原始参考照片 + 设计文字 + 模型机位，共同生成的视觉提案。</p>
<nav aria-label="房间"><button data-room="living" aria-pressed="true">客厅</button><button data-room="dining" aria-pressed="false">餐厅</button><button data-room="kitchen" aria-pressed="false">厨房</button></nav>
<div class="materials"><button data-floor="stone" aria-pressed="true">A · 石灰岩质感</button><button data-floor="teak" aria-pressed="false">B · 柚木</button></div>
<div class="controls"><button data-mode="target" aria-pressed="true">设计效果</button><button data-mode="base" aria-pressed="false">原模型对照</button></div>
<img class="hero" id="hero" width="1536" height="1024" alt="客厅设计提案"><p class="note" id="caption" aria-live="polite"></p><h2 id="title"></h2><p id="description"></p>
<p class="note">这组图片是 GPT 设计目标，尚未精细建模或定稿。厨房和餐厅有少量轮廓投影偏移，后续仍以原模型尺寸为准。石材实物、家具净距与最终地面选择待确认。窗外为未定位的氛围示意。</p></main>
<script>const images=${scriptJson(images)};const views={living:{base:'living-wide',title:'客厅 · 石材、亚麻与绿意',description:'比较石灰岩质感地面与柚木直铺；松软亚麻、木茶几、编织单椅和少量植物。'},dining:{base:'dining',title:'餐厅 · 实木与亚麻',description:'四人木桌、细木椅、亚麻桌旗和小灯罩，与厨房共用材料语言。'},kitchen:{base:'kitchen',title:'厨房 · 木柜与手作方砖',description:'细框木柜、奶白小方砖防溅墙、连续浅石台面和古铜小五金。'}};let room='living',floor='stone',mode='target';function update(){const v=views[room],name=mode==='base'?v.base+'-base.png':room==='living'?'living-'+floor+'-target-v2.png':room+'-target-v2.png';document.getElementById('hero').src=images[name];document.getElementById('hero').alt=v.title+(mode==='base'?' · 原模型':' · GPT 设计提案');document.getElementById('caption').textContent=mode==='base'?'原模型 Blender 渲染 · 对照机位':'GPT 设计目标图 · 待反馈，尚未精细建模';document.getElementById('title').textContent=v.title;document.getElementById('description').textContent=v.description;document.querySelector('.materials').hidden=room!=='living'||mode!=='target';for(const [k,val]of [['room',room],['floor',floor],['mode',mode]])document.querySelectorAll('[data-'+k+']').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[k]===val)));}for(const k of ['room','floor','mode'])document.querySelectorAll('[data-'+k+']').forEach(b=>b.onclick=()=>{if(k==='room')room=b.dataset.room;if(k==='floor')floor=b.dataset.floor;if(k==='mode')mode=b.dataset.mode;update()});update();</script></html>`;
    documents.push({id:'interior-study',title:'室内设计提案',kind:'concept-study',html});
  }
  return {documents,provenance};
}

export async function importHouseDocuments(source,password,destination=path.join(root,'public/house-viewer'),options={}) {
  if(!password)throw Error('Provide existing password on stdin');
  const release=JSON.parse(await readFile(path.join(destination,'release.json'),'utf8'));
  if(release.schema!==2)throw Error('A schema 2 House release is required');
  const key=await deriveHouseKey(password,release.salt,['encrypt','decrypt']);password='';
  const f=release.files.catalog;
  const catalog=JSON.parse(new TextDecoder().decode(await decryptHouseFile(key,await readFile(path.join(destination,f.file)),f.iv,release.buildId,'catalog')));
  const {documents,provenance}=await packageHouseDocuments(source);
  const entries=[];
  async function encrypt(name,bytes) {
    const iv=randomBytes(12),file=`${release.buildId}/${name}.bin`;
    const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(`${release.buildId}/${name}`)},key,bytes);
    const temporary=path.join(destination,file+'.tmp');await writeFile(temporary,Buffer.from(cipher));await rename(temporary,path.join(destination,file));
    release.files[name]={file,iv:[...iv],bytes:cipher.byteLength};
  }
  // Stage all content before writing catalog/manifest. Existing encrypted model bytes are reused.
  for(const doc of documents) {
    const bytes=Buffer.from(doc.html),sha256=hash(bytes),assetId='asset-'+sha256;
    await encrypt(assetId,bytes);entries.push({id:doc.id,title:doc.title,kind:doc.kind,assetId,sha256,mime:'text/html'});
  }
  catalog.documents={schema:1,updatedAt:'2026-11-16',items:entries};
  await encrypt('catalog',Buffer.from(JSON.stringify(catalog)));
  await writeFile(path.join(destination,'release.json'),JSON.stringify(release,null,2)+'\n');
  const reportDirectory=options.reportDirectory||path.join(root,'artifacts/house-documents');
  await mkdir(reportDirectory,{recursive:true});
  await writeFile(path.join(reportDirectory,'import.json'),JSON.stringify({documents:entries,sourceFiles:provenance,selectedBuildIds:catalog.revisions.map(r=>r.selectedBuildId),modelsReused:true},null,2));
  return {documents:entries.map(({id,title})=>({id,title})),modelsReused:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(!process.argv[2])throw Error('Usage: node scripts/import-house-documents.mjs <layout2house root>; password on stdin');
  let password='';for await(const chunk of process.stdin)password+=chunk;
  const result=await importHouseDocuments(process.argv[2],password.replace(/\r?\n$/,''));password='';console.log(JSON.stringify(result));
}
