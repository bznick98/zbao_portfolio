import { createHash } from 'node:crypto';
import { cafes, COFFEE_TIME_ZONE, type Slot } from '../data/coffee';

export class BookingError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
type Busy = { start: string; end: string };
const minute = 60_000;
export function configured(env = process.env) {
  return env.COFFEE_BOOKING_ENABLED === 'true' && !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN);
}
/** One slot per hour leaves a 30 minute gap; evaluating UTC instants handles DST. */
export function candidateSlots(now = new Date(), env = process.env): Slot[] {
  const first = Number(env.COFFEE_START_HOUR ?? 10);
  const last = Number(env.COFFEE_END_HOUR ?? 15);
  if (!Number.isInteger(first) || !Number.isInteger(last) || first < 8 || last > 15 || first >= last) throw new BookingError(503, 'Booking hours need attention. Please email me for now.');
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: COFFEE_TIME_ZONE, weekday: 'short', hour: 'numeric', hourCycle: 'h23' });
  const start = Math.ceil((now.getTime() + 24 * 60 * minute) / (60 * minute)) * 60 * minute;
  const slots: Slot[] = [];
  for (let t = start; t < now.getTime() + 14 * 24 * 60 * minute; t += 60 * minute) {
    const parts = formatter.formatToParts(t);
    const day = parts.find(p => p.type === 'weekday')?.value;
    const hour = Number(parts.find(p => p.type === 'hour')?.value);
    if (day !== 'Sat' && day !== 'Sun' && hour >= first && hour < last) slots.push({ start: new Date(t).toISOString(), end: new Date(t + 30 * minute).toISOString() });
  }
  return slots;
}
export function withoutConflicts(slots: Slot[], busy: Busy[]) {
  return slots.filter(slot => !busy.some(b => Date.parse(b.start) < Date.parse(slot.end) + 30 * minute && Date.parse(b.end) > Date.parse(slot.start) - 30 * minute));
}
async function google(path: string, token: string, body: unknown) {
  const result = await fetch(`https://www.googleapis.com/calendar/v3/${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(12_000),
  });
  if (result.status === 409) throw new BookingError(409, 'That time was just reserved. Please choose another.');
  if (!result.ok) throw new BookingError(503, 'My calendar is temporarily unavailable. Please try again shortly.');
  return result.json();
}
async function accessToken() {
  const result = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, refresh_token: process.env.GOOGLE_REFRESH_TOKEN!, grant_type: 'refresh_token' }), signal: AbortSignal.timeout(12_000),
  });
  if (!result.ok) throw new BookingError(503, 'My calendar connection needs attention. Please email me for now.');
  const data = await result.json();
  if (!data.access_token) throw new BookingError(503, 'Calendar connection unavailable.');
  return data.access_token as string;
}
async function available(token: string, now = new Date()) {
  const slots = candidateSlots(now);
  const ids = [...new Set([process.env.GOOGLE_CALENDAR_ID || 'primary', ...(process.env.GOOGLE_BUSY_CALENDAR_IDS || '').split(',').map(s => s.trim()).filter(Boolean)])];
  const data = await google('freeBusy', token, { timeMin: now.toISOString(), timeMax: new Date(now.getTime() + 15 * 86400000).toISOString(), items: ids.map(id => ({ id })) });
  const busy: Busy[] = [];
  for (const id of ids) {
    const calendar = data.calendars?.[id];
    if (!calendar || calendar.errors?.length || !Array.isArray(calendar.busy)) throw new BookingError(503, 'I couldn’t check my availability. Please try again shortly.');
    busy.push(...calendar.busy);
  }
  return withoutConflicts(slots, busy);
}
export async function getAvailability() {
  if (!configured()) return { connected: false, slots: candidateSlots(), timeZone: COFFEE_TIME_ZONE };
  return { connected: true, slots: await available(await accessToken()), timeZone: COFFEE_TIME_ZONE };
}
export function validateBooking(input: unknown) {
  if (!input || typeof input !== 'object') throw new BookingError(400, 'Please complete your booking details.');
  const b = input as Record<string, unknown>;
  if (typeof b.name !== 'string' || !b.name.trim() || b.name.length > 100 || /[\r\n]/.test(b.name)) throw new BookingError(400, 'Please enter your name.');
  if (typeof b.email !== 'string' || b.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) throw new BookingError(400, 'Please enter a valid email.');
  if (b.mode !== 'cafe' && b.mode !== 'virtual') throw new BookingError(400, 'Please choose a café or virtual chat.');
  const cafe = cafes.find(c => c.id === b.cafeId);
  if (b.mode === 'cafe' && !cafe) throw new BookingError(400, 'Please choose a coffee shop.');
  if (typeof b.start !== 'string' || !candidateSlots().some(s => s.start === b.start)) throw new BookingError(400, 'Please choose an available future time.');
  if (b.note !== undefined && (typeof b.note !== 'string' || b.note.length > 1000)) throw new BookingError(400, 'Please keep your note under 1,000 characters.');
  if (b.website) throw new BookingError(400, 'Unable to accept this request.');
  return { name: b.name.trim(), email: b.email.trim(), mode: b.mode, cafe, start: b.start, note: String(b.note || '').trim() };
}
export async function reserve(input: unknown) {
  const b = validateBooking(input);
  if (!configured()) throw new BookingError(503, 'Online booking is opening soon. Please email me to arrange a chat.');
  const token = await accessToken();
  const slot = (await available(token)).find(s => s.start === b.start);
  if (!slot) throw new BookingError(409, 'That time is no longer available. Please choose another.');
  // Stable, Google-compatible ID makes concurrent requests for this slot collide.
  const id = createHash('sha256').update(`coffee:${slot.start}`).digest('hex');
  const location = b.mode === 'virtual' ? 'Google Meet' : `${b.cafe!.name}, ${b.cafe!.address}`;
  await google(`calendars/${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || 'primary')}/events?sendUpdates=all&conferenceDataVersion=1`, token, {
    id, summary: `Coffee chat · ${b.name} + Zongnan`, location,
    description: `A relaxed, 30-minute conversation. No preparation needed.\n${b.note ? `\nGuest note: ${b.note}\n` : ''}\nNeed to change plans? Reply to the calendar invitation or email zongnan.bao@gmail.com.`,
    start: { dateTime: slot.start, timeZone: COFFEE_TIME_ZONE }, end: { dateTime: slot.end, timeZone: COFFEE_TIME_ZONE },
    attendees: [{ email: b.email, displayName: b.name }], guestsCanInviteOthers: false, guestsCanModify: false,
    ...(b.mode === 'virtual' ? { conferenceData: { createRequest: { requestId: id, conferenceSolutionKey: { type: 'hangoutsMeet' } } } } : {}),
  });
  return { confirmed: true, ...slot, location };
}
