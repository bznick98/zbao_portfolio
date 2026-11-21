import React, {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ChevronLeft, ChevronRight, Download, Lock} from 'lucide-react';
import {type HouseAssets} from '../lib/house-release';
import {getHouseDocuments, isolateHouseDocument} from '../lib/house-documents.mjs';

type Report = {id:string; title:string; mime:string; assetId:string; pages?:{assetId:string; title:string}[]};

export function HouseDocuments({assets,revisionId,onClose,onLock}:{assets:HouseAssets;revisionId:string;onClose:()=>void;onLock:()=>void}) {
  const documents:Report[]=getHouseDocuments(assets.catalog,revisionId);
  const [selection,setSelection]=useState(documents[0]?.id);
  const report=documents.find(item=>item.id===selection);
  const [index,setIndex]=useState(0),[retry,setRetry]=useState(0);
  const [content,setContent]=useState({id:'',url:''}),[error,setError]=useState('');
  const [downloading,setDownloading]=useState(false);
  const back=useRef<HTMLButtonElement>(null);
  const downloadRequest=useRef<AbortController|null>(null);
  const page=report?.pages?.[index];
  const id=page?.assetId||report?.assetId;
  useEffect(()=>{back.current?.focus();return ()=>downloadRequest.current?.abort()},[]);
  useEffect(()=>{
    if (!id || !assets.readAsset) return;
    const controller=new AbortController();let blobUrl='';
    setError('');setContent({id:'',url:''});
    assets.readAsset(id,controller.signal).then(bytes=>{
      if(controller.signal.aborted)return;
      if(page)blobUrl=URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'}));
      setContent({id,url:page?blobUrl:isolateHouseDocument(new TextDecoder().decode(bytes))});
    }).catch(()=>{if(!controller.signal.aborted)setError('这一页未能加载。')});
    return ()=>{controller.abort();if(blobUrl)URL.revokeObjectURL(blobUrl)};
  },[assets,id,retry]);
  async function download() {
    if (!report || !assets.readAsset || downloading) return;
    const controller=new AbortController();downloadRequest.current=controller;setDownloading(true);
    try{
      const bytes=await assets.readAsset(report.assetId,controller.signal);
      if(controller.signal.aborted)return;
      const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
      const link=document.createElement('a');link.href=url;link.download='之江门-'+revisionId+'-室内设计.pdf';link.click();
      window.setTimeout(()=>URL.revokeObjectURL(url),1500);
    }catch{if(!controller.signal.aborted)setError('PDF 下载失败，请重试。')}
    finally{if(!controller.signal.aborted)setDownloading(false)}
  }
  return <section className="house-documents" aria-label="设计效果图">
    <header className="house-documents-bar">
      <button ref={back} type="button" onClick={onClose} className="house-documents-back"><ArrowLeft size={18}/><span>返回 3D</span></button>
      <h1>设计报告 <small>{revisionId}</small></h1>
      <button type="button" onClick={onLock} aria-label="Lock house / 锁定" className="house-documents-lock"><Lock size={18}/></button>
    </header>
    {documents.length>1&&<select aria-label="报告" value={selection} onChange={e=>{setIndex(0);setSelection(e.target.value)}}>{documents.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select>}
    {!report?<p className="house-documents-status">此版本尚未发布设计报告。</p>:<>
      {page&&<nav className="house-report-nav" aria-label="报告翻页">
        <button onClick={()=>setIndex(index-1)} disabled={!index} aria-label="上一页"><ChevronLeft size={18}/></button>
        <span aria-live="polite">{index+1} / {report.pages!.length}</span>
        <button onClick={()=>setIndex(index+1)} disabled={index===report.pages!.length-1} aria-label="下一页"><ChevronRight size={18}/></button>
        <button onClick={download} disabled={downloading}><Download size={17}/> PDF</button>
      </nav>}
      {error?<div className="house-documents-status"><p role="alert">{error}</p><button onClick={()=>setRetry(n=>n+1)}>重试</button></div>:content.id!==id?
        <p className="house-documents-status" role="status">正在打开…</p>:page?
        <div className="house-report-page"><img src={content.url} alt={page.title}/></div>:
        <iframe className="house-document-frame" title={report.title} sandbox="allow-scripts allow-downloads" srcDoc={content.url}/>}
    </>}
  </section>;
}
