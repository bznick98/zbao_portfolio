import React, {useEffect, useRef, useState} from 'react';
import {ArrowLeft, Lock} from 'lucide-react';
import {type HouseAssets} from '../lib/house-release';
import {getHouseDocuments, isolateHouseDocument} from '../lib/house-documents.mjs';

export function HouseDocuments({assets,onClose,onLock}:{assets:HouseAssets;onClose:()=>void;onLock:()=>void}) {
  const documents=getHouseDocuments(assets.catalog);
  const selected=documents[0]?.id||'';
  const [html,setHtml]=useState(''),[error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  const frame=useRef<HTMLIFrameElement>(null),back=useRef<HTMLButtonElement>(null);
  useEffect(()=>{back.current?.focus()},[]);
  useEffect(()=>{
    const controller=new AbortController();setHtml('');setError('');
    const item=getHouseDocuments(assets.catalog).find(d=>d.id===selected);
    if(!item||!assets.readAsset){setError('此内容暂不可用。');return;}
    assets.readAsset(item.assetId,controller.signal).then(bytes=>{
      if(!controller.signal.aborted)setHtml(isolateHouseDocument(new TextDecoder().decode(bytes)));
    }).catch(err=>{if(!controller.signal.aborted)setError(err instanceof Error?err.message:'内容加载失败，请重试。')});
    return ()=>controller.abort();
  },[assets,selected,retry]);
  return <section className="house-documents" aria-label="设计效果图">
    <header className="house-documents-bar">
      <button ref={back} type="button" onClick={onClose} className="house-documents-back"><ArrowLeft size={18}/><span>返回 3D</span></button>
      <h1>设计效果图 <small>提案 02</small></h1>
      <button type="button" onClick={onLock} aria-label="Lock house / 锁定" className="house-documents-lock"><Lock size={18}/></button>
    </header>
    {error?<div className="house-documents-status"><p role="alert">{error}</p><button onClick={()=>setRetry(n=>n+1)}>重试</button></div>:html?
      <iframe ref={frame} key={selected} className="house-document-frame" title={documents.find(d=>d.id===selected)?.title} sandbox="allow-scripts allow-downloads" srcDoc={html}/>:
      <p className="house-documents-status" role="status">正在打开…</p>}
  </section>;
}
