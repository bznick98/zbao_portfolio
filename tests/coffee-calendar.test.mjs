import { test, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Load real compiled ESM files so tests catch imports that fail in Vercel's Node runtime.
const sources = ['data/coffee', 'server/coffee-calendar', 'api/coffee'];
const buildDir = await mkdtemp(join(tmpdir(), 'coffee-calendar-test-'));
after(async () => {
  for (const source of sources) await rm(join(buildDir, `${source}.js`), { force: true });
  await rm(join(buildDir, 'package.json'), { force: true });
  for (const directory of ['data', 'server', 'api']) await rmdir(join(buildDir, directory));
  await rmdir(buildDir);
});
await writeFile(join(buildDir, 'package.json'), JSON.stringify({ type: 'module' }));
for (const source of sources) {
  await mkdir(join(buildDir, source.split('/')[0]), { recursive: true });
  const compiled = ts.transpileModule(await readFile(new URL(`../${source}.ts`, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  await writeFile(join(buildDir, `${source}.js`), compiled);
}
const { candidateSlots, withoutConflicts, configured, validateBooking, getAvailability, reserve } = await import(pathToFileURL(join(buildDir, 'server/coffee-calendar.js')).href);
const { default: handler } = await import(pathToFileURL(join(buildDir, 'api/coffee.js')).href);
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
afterEach(() => { globalThis.fetch = originalFetch; for (const key of Object.keys(process.env)) if (/^(GOOGLE_|COFFEE_)/.test(key)) delete process.env[key]; Object.assign(process.env, originalEnv); });
const ready = () => Object.assign(process.env, { COFFEE_BOOKING_ENABLED: 'true', GOOGLE_CLIENT_ID: 'test', GOOGLE_CLIENT_SECRET: 'test', GOOGLE_REFRESH_TOKEN: 'test', GOOGLE_CALENDAR_ID: 'primary', GOOGLE_BUSY_CALENDAR_IDS: '' });
const input = (extra = {}) => ({ name: 'Guest', email: 'guest@example.com', mode: 'cafe', cafeId: 'saint-frank-sf', start: candidateSlots()[0].start, ...extra });
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('slots stay at 10am Pacific across the fall DST transition and skip weekends', () => {
  const slots = candidateSlots(new Date('2026-10-29T00:00:00Z'), {});
  assert.ok(slots.some(s => s.start === '2026-10-30T17:00:00.000Z'));
  assert.ok(slots.some(s => s.start === '2026-11-02T18:00:00.000Z'));
  assert.ok(slots.every(s => !['Sat', 'Sun'].includes(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short' }).format(new Date(s.start)))));
  assert.ok(slots.every(s => Date.parse(s.end) - Date.parse(s.start) === 1800000));
});
test('slots stay at 10am Pacific across the spring DST transition', () => {
  const slots = candidateSlots(new Date('2027-03-11T00:00:00Z'), {});
  assert.ok(slots.some(s => s.start === '2027-03-12T18:00:00.000Z'));
  assert.ok(slots.some(s => s.start === '2027-03-15T17:00:00.000Z'));
});
test('30 minute buffers exclude collisions and all-day events', () => {
  const slots = [{ start: '2026-11-05T18:00:00Z', end: '2026-11-05T18:30:00Z' }];
  assert.equal(withoutConflicts(slots, [{ start: '2026-11-05T18:55:00Z', end: '2026-11-05T20:00:00Z' }]).length, 0);
  assert.equal(withoutConflicts(slots, [{ start: '2026-11-05T17:00:00Z', end: '2026-11-05T17:31:00Z' }]).length, 0);
  assert.equal(withoutConflicts(slots, [{ start: '2026-11-05T19:00:00Z', end: '2026-11-05T20:00:00Z' }]).length, 1);
  assert.equal(withoutConflicts(slots, [{ start: '2026-11-05T00:00:00Z', end: '2026-11-06T00:00:00Z' }]).length, 0);
});
test('requires opt-in and credentials; preview never confirms a booking', async () => {
  process.env.COFFEE_BOOKING_ENABLED = 'false';
  assert.equal(configured(), false);
  assert.equal((await getAvailability()).connected, false);
  await assert.rejects(reserve(input()), e => e.status === 503);
});
test('rejects forged times, locations, malformed guests and honeypot', () => {
  for (const extra of [{ start: '2000-01-01T10:00:00Z' }, { cafeId: 'unknown' }, { email: 'invalid' }, { name: ' ' }, { mode: 'other' }, { note: 'x'.repeat(1001) }, { website: 'spam' }]) assert.throws(() => validateBooking(input(extra)), e => e.status === 400);
});
test('free/busy errors fail closed', async () => {
  ready(); globalThis.fetch = async url => String(url).includes('oauth2') ? response({ access_token: 'test' }) : response({ calendars: { primary: { errors: [{ reason: 'notFound' }] } } });
  await assert.rejects(getAvailability(), e => e.status === 503);
});
test('café bookings insert exact address and notify guest only after checking availability', async () => {
  ready(); const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url: String(url), body: String(options.body) }); return String(url).includes('oauth2') ? response({ access_token: 'test' }) : String(url).includes('freeBusy') ? response({ calendars: { primary: { busy: [] } } }) : response({ id: 'test' }); };
  const result = await reserve(input()); assert.equal(result.confirmed, true);
  assert.equal(calls.length, 3); assert.ok(calls[1].url.includes('freeBusy'));
  const event = JSON.parse(calls[2].body); assert.match(event.location, /2340 Polk Street/); assert.equal(event.attendees[0].email, 'guest@example.com'); assert.equal(event.conferenceData, undefined); assert.match(calls[2].url, /sendUpdates=all/); assert.match(event.id, /^[0-9a-f]{64}$/);
});
test('virtual booking requests Meet without a café address', async () => {
  ready(); let event;
  globalThis.fetch = async (url, options) => { if (String(url).includes('oauth2')) return response({ access_token: 'test' }); if (String(url).includes('freeBusy')) return response({ calendars: { primary: { busy: [] } } }); event = JSON.parse(options.body); return response({ id: 'test' }); };
  await reserve(input({ mode: 'virtual', cafeId: null }));
  assert.equal(event.location, 'Google Meet'); assert.equal(event.conferenceData.createRequest.conferenceSolutionKey.type, 'hangoutsMeet');
});
test('calendar collision is reported as 409, not success', async () => {
  ready(); globalThis.fetch = async url => String(url).includes('oauth2') ? response({ access_token: 'test' }) : String(url).includes('freeBusy') ? response({ calendars: { primary: { busy: [] } } }) : response({}, 409);
  await assert.rejects(reserve(input()), e => e.status === 409);
});
test('newly busy slots are rejected before insertion', async () => {
  ready(); const booking = input(); let count = 0;
  globalThis.fetch = async url => { count++; return String(url).includes('oauth2') ? response({ access_token: 'test' }) : response({ calendars: { primary: { busy: [{ start: booking.start, end: new Date(Date.parse(booking.start) + 1800000).toISOString() }] } } }); };
  await assert.rejects(reserve(booking), e => e.status === 409); assert.equal(count, 2);
});
test('API rejects unsupported methods, invalid JSON and oversized payloads', async () => {
  for (const [request, expected] of [[{ method: 'DELETE' }, 405], [{ method: 'POST', body: '{' }, 400], [{ method: 'POST', body: 'x'.repeat(9000) }, 413]]) {
    let code; const res = { status(s) { code = s; return res; }, setHeader() {}, json() {} }; await handler(request, res); assert.equal(code, expected);
  }
});
