import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { CoffeeMap } from '../components/CoffeeMap';
import { cafes, formatCoffeeDate, type Slot } from '../data/coffee';
import './coffee.css';

const dateKey = (date: string) => formatCoffeeDate(date, {
  year: 'numeric', month: '2-digit', day: '2-digit',
});

export function Coffee() {
  const [place, setPlace] = useState<string>(cafes[0].id);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState<{ start: string; location: string } | null>(null);
  const success = useRef<HTMLDivElement>(null);
  const cafe = cafes.find(c => c.id === place);
  const days = [...new Set(slots.map(s => dateKey(s.start)))];
  const isVirtual = place === 'virtual';
  const availabilityReady = connected && !loading;

  async function refresh(signal?: AbortSignal) {
    setLoading(true);
    setConnected(false);
    setTime('');
    setError('');
    try {
      const res = await fetch('/api/coffee', { signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to check availability.');
      setSlots(data.slots);
      setConnected(data.connected);
      setDay(data.slots[0] ? dateKey(data.slots[0].start) : '');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setSlots([]);
        setDay('');
        setError('I couldn’t load my calendar. Try again, or email me below.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    document.title = 'Coffee — Zongnan Bao';
    return () => {
      controller.abort();
      document.title = 'Zongnan Bao';
    };
  }, []);

  useEffect(() => { if (confirmed) success.current?.focus(); }, [confirmed]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!time || !availabilityReady || sending) return;
    const form = new FormData(e.currentTarget);
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/coffee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: isVirtual ? 'virtual' : 'cafe',
          cafeId: cafe?.id,
          start: time,
          name: form.get('name'),
          email: form.get('email'),
          website: form.get('website'),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) await refresh();
        throw new Error(data.error || 'Your booking could not be confirmed.');
      }
      setConfirmed(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="coffee-page">
      <div className="coffee-content">
        <header className="coffee-intro">
          <h1>Coffee</h1>
          <div className="coffee-intro-line">
            <p>Let’s grab a coffee. Anything’s welcome.</p>
            <span>30 minutes · Bay Area or online</span>
          </div>
        </header>

        {confirmed ? (
          <div className="coffee-confirmed" tabIndex={-1} ref={success}>
            <h2>See you soon.</h2>
            <p>{formatCoffeeDate(confirmed.start, {
              weekday: 'long', month: 'long', day: 'numeric',
              hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
            })}</p>
            <p>{confirmed.location}</p>
            <p>Your calendar invitation is on its way, with the details for our chat.</p>
            <p>Plans change. Just reply to the invite.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <fieldset className="coffee-fields" disabled={sending}>
              <legend className="coffee-sr-only">Arrange a coffee chat</legend>

              <section className="coffee-place">
                <label className="coffee-label" htmlFor="coffee-place">Where</label>
                <select id="coffee-place" value={place} onChange={e => setPlace(e.target.value)}>
                  {cafes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} · {c.area}</option>
                  ))}
                  <option value="virtual">Online · Google Meet</option>
                </select>

                {cafe ? (
                  <>
                    <CoffeeMap selected={place} onSelect={setPlace} disabled={sending}/>
                    <div className="coffee-address">
                      <p>{cafe.address}</p>
                      <div>
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cafe.name + ' ' + cafe.address)}`} target="_blank" rel="noreferrer">
                          Directions <ArrowUpRight size={13}/>
                        </a>
                        <a href={cafe.url} target="_blank" rel="noreferrer">Café hours <ArrowUpRight size={13}/></a>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="coffee-virtual-note">We’ll meet on Google Meet.<br/>The link comes with your calendar invitation.</p>
                )}
              </section>

              <section className="coffee-booking" aria-busy={loading}>
                <div className="coffee-label-row">
                  <label className="coffee-label" htmlFor="coffee-day">When</label>
                  <span>Pacific time · 30 min</span>
                </div>
                {loading ? <p role="status">Checking availability…</p> : days.length ? (
                  <>
                    {!connected && <p className="coffee-status">Sample times only. <a href="mailto:zongnan.bao@gmail.com?subject=Coffee%20chat">Email me to arrange a chat</a> for now.</p>}
                    <select id="coffee-day" value={day} onChange={e => { setDay(e.target.value); setTime(''); }}>
                      {days.map(d => {
                        const slot = slots.find(s => dateKey(s.start) === d)!;
                        return <option key={d} value={d}>{formatCoffeeDate(slot.start, {
                          weekday: 'long', month: 'short', day: 'numeric',
                        })}</option>;
                      })}
                    </select>
                    <div className="coffee-times" role="group" aria-label="Available times">
                      {slots.filter(s => dateKey(s.start) === day).map(s => (
                        <button type="button" key={s.start} aria-pressed={time === s.start} onClick={() => setTime(s.start)}>
                          {formatCoffeeDate(s.start, { hour: 'numeric', minute: '2-digit' })}
                        </button>
                      ))}
                    </div>
                  </>
                ) : !error && <p className="coffee-status">No open times in the next two weeks. <a href="mailto:zongnan.bao@gmail.com">Let’s find a time by email.</a></p>}

                <div className="coffee-guest">
                  <label htmlFor="coffee-name">Name
                    <input id="coffee-name" name="name" autoComplete="name" required maxLength={100}/>
                  </label>
                  <label htmlFor="coffee-email">Email
                    <input id="coffee-email" name="email" type="email" autoComplete="email" required maxLength={254}/>
                  </label>
                </div>
                <div className="coffee-honeypot" aria-hidden="true">
                  <label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
                </div>
                <p className="coffee-summary" aria-live="polite">
                  {time ? <>
                    {formatCoffeeDate(time, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}<br/>
                    {cafe ? `${cafe.name} · ${cafe.neighborhood}` : 'Google Meet'}
                  </> : 'Pick a time that works for you.'}
                </p>
                <button className="coffee-submit" type="submit" disabled={!time || !availabilityReady || sending}>
                  {sending ? 'Booking…' : connected ? 'Book a coffee chat' : 'Booking opens soon'}
                  <ArrowUpRight size={19}/>
                </button>
                <p className="coffee-small">Your email is just for the invitation. Reschedule by replying.</p>
                {error && <div className="coffee-error" role="alert">
                  {error} <button type="button" onClick={() => void refresh()}>Try again</button>
                </div>}
              </section>
            </fieldset>
          </form>
        )}

        <footer className="coffee-footer">
          <a href="mailto:zongnan.bao@gmail.com">Or just email me <ArrowUpRight size={15}/></a>
          <span>© {new Date().getFullYear()} Zongnan Bao</span>
        </footer>
      </div>
    </div>
  );
}
