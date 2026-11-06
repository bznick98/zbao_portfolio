import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, Coffee as Cup, MapPin, Video, Clock, CalendarDays } from 'lucide-react';
import { CoffeeMap } from '../components/CoffeeMap';
import { cafes, formatCoffeeDate, type Slot } from '../data/coffee';
import './coffee.css';

export function Coffee() {
  const [mode, setMode] = useState<'cafe' | 'virtual'>('cafe');
  const [selected, setSelected] = useState<string>(cafes[0].id);
  const [filter, setFilter] = useState('All spots');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState<{ start: string; location: string } | null>(null);
  const success = useRef<HTMLDivElement>(null);
  const cafe = cafes.find(c => c.id === selected)!;
  const dateKey = (s: string) => formatCoffeeDate(s, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const days = [...new Set(slots.map(s => dateKey(s.start)))];
  async function refresh(signal?: AbortSignal) {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/coffee', { signal }); const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to check availability.');
      setSlots(data.slots); setConnected(data.connected); setDay(data.slots[0] ? dateKey(data.slots[0].start) : ''); setTime('');
    } catch (e) { if ((e as Error).name !== 'AbortError') setError('I couldn’t load my calendar. Try again, or email me below.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); document.title = 'Coffee & conversation — Zongnan Bao'; return () => { controller.abort(); document.title = 'Zongnan Bao'; }; }, []);
  useEffect(() => { if (confirmed) success.current?.focus(); }, [confirmed]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!time || !connected || sending) return;
    const form = new FormData(e.currentTarget); setSending(true); setError('');
    try {
      const res = await fetch('/api/coffee', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, cafeId: selected, start: time, name: form.get('name'), email: form.get('email'), note: form.get('note'), website: form.get('website') }) });
      const data = await res.json();
      if (!res.ok) { if (res.status === 409) await refresh(); throw new Error(data.error || 'Your booking could not be confirmed.'); }
      setConfirmed(data);
    } catch (e) { setError((e as Error).message); } finally { setSending(false); }
  }
  return <div className="coffee-page">
    <header className="coffee-nav"><a href="#work" className="coffee-wordmark">zb<span> / </span></a><a href="#work"><ArrowLeft size={14}/> Back to my world</a><span className="coffee-nav-note">A SMALL INVITATION TO CONNECT</span><a href="mailto:zongnan.bao@gmail.com">Say hello <ArrowUpRight size={14}/></a></header>
    <section className="coffee-hero">
      <div className="coffee-eyebrow"><span/> GOOD COMPANY, NO AGENDA REQUIRED</div>
      <h1>Let’s get <em>coffee.</em><span className="hero-asterisk" aria-hidden="true">✳</span></h1>
      <div className="hero-bottom"><p>A fresh perspective, a half-formed idea, or just a hello.<br/>I’m Zongnan. There’s always room at the table.</p><a href="#coffee-plan" onClick={e => { e.preventDefault(); document.getElementById('coffee-plan')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }}>Find a little time <ArrowDown size={17}/></a></div>
      <div className="coffee-handnote" aria-hidden="true">come as you are. <svg viewBox="0 0 120 35"><path d="M3 8Q66 36 110 9M98 7L113 8 105 20"/></svg></div>
    </section>
    <div className="coffee-strip"><span><Clock size={15}/> 30 unhurried minutes</span><span><Cup size={15}/> Coffee, tea, or whatever you like</span><span><Check size={15}/> No pitch. No prep. Just a conversation.</span></div>
    <section className="coffee-plan" id="coffee-plan">
      <div className="coffee-section-heading"><div><span className="coffee-eyebrow">01 / THE MEETING PLACE</span><h2>Somewhere <em>nice.</em></h2></div><div className="coffee-mode" role="group" aria-label="Meeting format"><button aria-pressed={mode === 'cafe'} onClick={() => setMode('cafe')}><Cup size={16}/> In person</button><button aria-pressed={mode === 'virtual'} onClick={() => setMode('virtual')}><Video size={16}/> Virtual</button></div></div>
      {mode === 'cafe' ? <>
        <p className="coffee-section-intro">A few lovely places around the Bay. Pick the one that feels close to you.</p>
        <div className="coffee-places"><CoffeeMap selected={selected} onSelect={id => { setSelected(id); setFilter('All spots'); }}/><div className="coffee-cafe-list"><div className="coffee-filters" role="group" aria-label="Filter cafés by region">{['All spots', 'San Francisco', 'East Bay', 'Peninsula', 'South Bay'].map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}</div>
          {cafes.filter(c => filter === 'All spots' || c.area === filter).map(c => <div key={c.id} className={`coffee-cafe ${selected === c.id ? 'selected' : ''}`}><button onClick={() => setSelected(c.id)} aria-pressed={selected === c.id}><span className="cafe-index">0{cafes.indexOf(c) + 1}</span><span className="cafe-info"><small>{c.neighborhood}</small><strong>{c.name}</strong><span>{c.note}</span><span className="cafe-tag">{c.tag}</span></span><span className="cafe-check">{selected === c.id ? <Check size={15}/> : <ArrowUpRight size={17}/>}</span></button><a href={c.url} target="_blank" rel="noreferrer">Café details & hours <ArrowUpRight size={11}/></a></div>)}
          <p className="coffee-list-note">A curated starting point, not a ranking.<br/>A chat booking doesn’t reserve a café table.</p>
        </div></div>
      </> : <div className="coffee-virtual"><div className="virtual-art"><Cup size={64} strokeWidth={1}/><span>↔</span><Video size={64} strokeWidth={1}/></div><div><span className="coffee-eyebrow">SAME CONVERSATION, ANYWHERE</span><h3>Your favorite mug.<br/><em>Your own little corner.</em></h3><p>Bring a drink and settle in. We’ll meet on Google Meet;<br/>the link will be in your calendar invitation.</p></div></div>}
    </section>
    <section className="coffee-booking">
      <div className="coffee-section-heading"><div><span className="coffee-eyebrow">02 / A LITTLE TIME TOGETHER</span><h2>Make a little <em>space.</em></h2></div><span className="coffee-timezone"><Clock size={14}/> All times in Pacific time · 30 min</span></div>
      {confirmed ? <div className="coffee-success" tabIndex={-1} ref={success}><Check size={32}/><h3>See you soon.</h3><p>{formatCoffeeDate(confirmed.start, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</p><p>{confirmed.location}</p><p>Your calendar invitation is on its way. For a virtual chat, look there for your Meet link.</p><a href="mailto:zongnan.bao@gmail.com">Need to change plans? Just say hello <ArrowUpRight size={14}/></a></div> : <>
        {!loading && !connected && !error && <p className="coffee-preview-note">Online booking is opening soon. Explore sample times below, or <a href="mailto:zongnan.bao@gmail.com?subject=Let%E2%80%99s%20have%20a%20coffee%20chat">email me to arrange a chat</a>. These times aren’t live availability.</p>}
        <div className="coffee-booking-grid"><div className="coffee-time-picker" aria-busy={loading}>
          <h3><CalendarDays size={18}/> Pick a day</h3>{loading ? <p role="status">Finding a little breathing room…</p> : days.length ? <><div className="coffee-days" role="group" aria-label="Available dates">{days.map(d => { const s = slots.find(s => dateKey(s.start) === d)!; return <button key={d} aria-pressed={day === d} onClick={() => { setDay(d); setTime(''); }}><small>{formatCoffeeDate(s.start, { weekday: 'short' })}</small><strong>{formatCoffeeDate(s.start, { day: 'numeric' })}</strong><small>{formatCoffeeDate(s.start, { month: 'short' })}</small></button>; })}</div><h3>A time that works for you</h3><div className="coffee-times" role="group" aria-label="Available times">{slots.filter(s => dateKey(s.start) === day).map(s => <button key={s.start} aria-pressed={time === s.start} onClick={() => setTime(s.start)}>{formatCoffeeDate(s.start, { hour: 'numeric', minute: '2-digit' })}</button>)}</div></> : <p>No open times in the next two weeks. <a href="mailto:zongnan.bao@gmail.com">Let’s find a time by email.</a></p>}
          <div className="coffee-selected-place">{mode === 'cafe' ? <MapPin size={19}/> : <Video size={19}/>}<div><strong>{mode === 'cafe' ? `${cafe.name} · ${cafe.neighborhood}` : 'A virtual coffee on Google Meet'}</strong><p>{mode === 'cafe' ? cafe.address : 'Your invitation will include the meeting link.'}</p>{mode === 'cafe' && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cafe.name + ' ' + cafe.address)}`} target="_blank" rel="noreferrer">See on Google Maps <ArrowUpRight size={12}/></a>}</div></div>
        </div><form onSubmit={submit} className="coffee-form"><span className="coffee-eyebrow">03 / JUST BRING YOURSELF</span><h3>A quick hello.</h3><div className="coffee-form-row"><label>Your name<input name="name" autoComplete="name" required maxLength={100} placeholder="What should I call you?" disabled={sending}/></label><label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="For your calendar invite" disabled={sending}/></label></div><label>Anything on your mind? <span>(optional)</span><textarea name="note" maxLength={1000} rows={2} placeholder="An idea, a question, or we’ll see where it goes…" disabled={sending}/></label><div className="coffee-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
          <p className="coffee-summary">{time ? `${formatCoffeeDate(time, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })} · ${mode === 'cafe' ? cafe.name + ', ' + cafe.neighborhood : 'Google Meet'}` : 'Choose a day and time above to make it a plan.'}</p>
          <button className="coffee-submit" type="submit" disabled={!time || !connected || sending}>{sending ? 'Saving our little plan…' : connected ? 'Let’s have coffee' : 'Reservations opening soon'}<ArrowRight size={18}/></button><p className="coffee-privacy">Just for our chat. Your details go into the calendar invitation.<br/>Plans change — reply to the invite anytime.</p>
        </form></div>
        {error && <div className="coffee-error" role="alert">{error} <button onClick={() => void refresh()}>Refresh availability</button></div>}
      </>}
    </section>
    <section className="coffee-closing"><span aria-hidden="true">✳</span><p>You don’t need a reason.<br/><em>Curiosity is plenty.</em></p><span>Work, art, life, the thing you’re figuring out.<br/>It’s all welcome here.</span></section>
    <footer className="coffee-footer"><span>© {new Date().getFullYear()} Zongnan Bao</span><span>MADE FOR A LITTLE HUMAN CONNECTION</span><a href="mailto:zongnan.bao@gmail.com">Prefer email? That works too. <ArrowUpRight size={13}/></a></footer>
  </div>;
}
