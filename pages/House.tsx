import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, LockKeyhole } from 'lucide-react';
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
  const frame = useRef<HTMLIFrameElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const theme = isDarkMode ? 'dark' : 'light';

  useEffect(() => {
    const title = document.title;
    document.title = 'House — Zongnan Bao';
    return () => { document.title = title; request.current?.abort(); currentAssets.current?.dispose(); };
  }, []);

  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: 'house:theme', theme }, window.location.origin);
  }, [theme]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
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
    setAssets(null); setPassword(''); setError(''); setStatus(''); setBusy(false); setPasswordError(false);
    currentAssets.current?.dispose(); currentAssets.current = null;
    window.setTimeout(() => input.current?.focus(), 0);
  }

  return (
    <article className={`house-page${assets ? ' house-open' : ''}`}>
      <div className="house-content">
        <header className="house-intro">
          <div className="house-kicker"><span>A place in progress</span><span>Hangzhou, CN</span></div>
          <h1>House<span aria-hidden="true">.</span></h1>
          <div className="house-intro-line">
            <p>走进这个家。<span>A space to make our own.</span></p>
            <span className="house-edition">01 / A living study</span>
          </div>
        </header>

        {!assets ? (
          <div className="house-entry">
            <section className="house-invitation" aria-label="About this space">
              <ArrowDownRight size={48} strokeWidth={1} aria-hidden="true" />
              <h2>Come on in.</h2>
              <p>A quiet look around a home taking shape.<br />Enter the password to explore, room by room.</p>
              <span className="house-small">私人空间 · 凭密码进入</span>
            </section>
            <form className="house-form" onSubmit={enter} aria-busy={busy}>
              <label htmlFor="house-password">Password / 访问密码</label>
              <input id="house-password" ref={input} type="password" inputMode="numeric" autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)} required maxLength={128} disabled={busy}
                aria-invalid={passwordError || undefined} aria-describedby={error ? 'house-error' : 'house-privacy'} placeholder="Your invitation in four digits" />
              <button type="submit" className="house-enter" disabled={busy || !password}>
                <span>{busy ? 'Opening…' : 'Enter the house'}</span><ArrowUpRight size={20} aria-hidden="true" />
              </button>
              <p id="house-privacy" className="house-small"><LockKeyhole size={12} aria-hidden="true" /> Just for this visit. The page locks when you leave.</p>
              <p className="house-status" role="status">{status}</p>
            </form>
          </div>
        ) : (
          <section className="house-experience" aria-label="Interactive house walkthrough">
            <div className="house-viewer-bar"><span>自由漫游 / Walk through</span><button type="button" onClick={lock}><LockKeyhole size={14} aria-hidden="true" /> Lock / 锁定</button></div>
            <iframe ref={frame} src="/house-viewer/index.html" title="House — interactive 3D walkthrough"
              allow="fullscreen" allowFullScreen onLoad={() => frame.current?.contentWindow?.postMessage({ type: 'house:open', scene: assets.scene, model: assets.model, theme }, window.location.origin)} />
            <div className="house-viewer-caption"><span>拖动看向 · 方向键 / WASD 移动 · 手机使用摇杆</span><span role="status">{status || 'Make yourself at home.'}</span></div>
          </section>
        )}
        {error && <p id="house-error" className="house-error" role="alert">{error}</p>}
        <footer className="house-footer"><a href="#work">Back to work <ArrowUpRight size={14} aria-hidden="true" /></a><span>设计推敲中的家 · 实时光照 · 窗外为天空示意</span></footer>
      </div>
    </article>
  );
}
