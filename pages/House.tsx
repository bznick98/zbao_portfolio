import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react';
import { HousePasswordError, unlockHouse, type HouseAssets } from '../lib/house-release';
import './house.css';

export function House({ isDarkMode }: { isDarkMode: boolean }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [assets, setAssets] = useState<HouseAssets | null>(null);
  const currentAssets = useRef<HouseAssets | null>(null);
  const request = useRef<AbortController | null>(null);
  const resourceRequests = useRef(new Map<number,AbortController>());
  const frame = useRef<HTMLIFrameElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const theme = isDarkMode ? 'dark' : 'light';

  useEffect(() => {
    const title = document.title;
    document.title = 'House — Zongnan Bao';
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.title = title; document.documentElement.style.overflow = overflow; request.current?.abort(); currentAssets.current?.dispose(); };
  }, []);

  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: 'house:theme', theme }, window.location.origin);
  }, [theme]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'house:cancel-asset') {resourceRequests.current.get(event.data.id)?.abort();return;}
      if (event.data?.type === 'house:asset') {
        const owner=currentAssets.current, id=event.data.id, assetId=event.data.assetId;
        if (!owner?.readAsset || !Number.isSafeInteger(id) || id<1 || typeof assetId!=='string' || resourceRequests.current.has(id) || resourceRequests.current.size>=16) return;
        const controller=new AbortController();resourceRequests.current.set(id,controller);
        owner.readAsset(assetId,controller.signal).then(bytes=>{
          if (owner===currentAssets.current&&!controller.signal.aborted) frame.current?.contentWindow?.postMessage({type:'house:asset-result',id,bytes},window.location.origin,[bytes]);
        }).catch(err=>{
          if (owner===currentAssets.current&&!controller.signal.aborted) frame.current?.contentWindow?.postMessage({type:'house:asset-result',id,error:err instanceof Error?err.message:'Unable to load house resource.'},window.location.origin);
        }).finally(()=>{if(resourceRequests.current.get(id)===controller)resourceRequests.current.delete(id);});
        return;
      }
      if (event.data?.type === 'house:lock') { lock(); return; }
      if (event.data?.type === 'house:ready') {
        setStatus('');
        frame.current?.focus();
      }
      if (event.data?.type === 'house:error') setError('The 3D view could not start. Try again with WebGL enabled in a current browser.');
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);

  // A stalled frame should not leave the user at an indefinite loading message.
  useEffect(() => {
    if (!assets || !status) return;
    const timer = window.setTimeout(() => setError('The 3D view is taking too long. Lock the page and try again.'), 90_000);
    return () => window.clearTimeout(timer);
  }, [assets, status]);

  async function enter(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !password) return;
    const controller = new AbortController();
    request.current?.abort(); request.current = controller;
    setBusy(true); setError(''); setPasswordError(false);
    try {
      const unlocked = await unlockHouse(password, controller.signal, setStatus);
      if (controller.signal.aborted) { unlocked.dispose(); return; }
      currentAssets.current = unlocked;
      setPassword(''); setAssets(unlocked); setStatus('Preparing your view…');
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Unable to open the house. Please try again.');
      setPasswordError(err instanceof HousePasswordError);
      setStatus('');
      input.current?.focus(); input.current?.select();
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  function lock() {
    request.current?.abort();
    for(const controller of resourceRequests.current.values())controller.abort();resourceRequests.current.clear();
    setAssets(null); setPassword(''); setError(''); setStatus(''); setBusy(false); setPasswordError(false);
    currentAssets.current?.dispose(); currentAssets.current = null;
    window.setTimeout(() => input.current?.focus(), 0);
  }

  return (
    <section className="house-page" aria-label="House">
      {!assets ? (
        <>
          <a className="house-back" href="#work" aria-label="Back to work"><ArrowLeft size={20} aria-hidden="true" /></a>
          <form className="house-form" onSubmit={enter} aria-busy={busy}>
            <label htmlFor="house-password" className="house-sr-only">Password / 访问密码</label>
            <div className="house-password-row">
              <input id="house-password" ref={input} type="password" inputMode="numeric" autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)} required maxLength={128} disabled={busy}
                aria-invalid={passwordError || undefined} aria-describedby={error ? 'house-error' : undefined} placeholder="Password" />
              <button type="submit" className="house-enter" disabled={busy || !password} aria-label="Enter the house">
                {busy ? <LoaderCircle className="house-spinner" size={20} aria-hidden="true" /> : <ArrowRight size={20} aria-hidden="true" />}
              </button>
            </div>
            <p className="house-sr-only" role="status">{status}</p>
            {error && <p id="house-error" className="house-error" role="alert">{error}</p>}
          </form>
        </>
      ) : (
        <>
          <iframe ref={frame} className="house-frame" src="/house-viewer/index.html" title="House — interactive 3D walkthrough"
            allow="fullscreen" allowFullScreen onLoad={() => frame.current?.contentWindow?.postMessage({ type: 'house:open', scene: assets.scene, model: assets.model, catalog: assets.catalog, theme }, window.location.origin)} />
          {error && <div className="house-viewer-error"><p role="alert">{error}</p><button type="button" onClick={lock}>Try again</button></div>}
        </>
      )}
    </section>
  );
}
