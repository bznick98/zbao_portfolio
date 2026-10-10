import test from 'node:test';
import assert from 'node:assert/strict';
import { createCaptionHandler } from '../api/generate-captions.ts';
import { fallbackTitles, formatPhotoCaption, withWisdom } from '../data/editorial.ts';
import type { CaptionResponse } from '../api/generate-captions.ts';
import type { ContentBlock } from '../types.ts';

const invoke = async (handler: ReturnType<typeof createCaptionHandler>, body: unknown, method = 'POST') => {
  let status = 200;
  let result: CaptionResponse | undefined;
  const headers: Record<string, string> = {};
  const response = {
    status(code: number) { status = code; return response; },
    json(value: CaptionResponse) { result = value; },
    setHeader(name: string, value: string) { headers[name] = value; },
  };
  await handler({ method, body }, response);
  return { status, result: result!, headers };
};

test('missing AI credentials still returns one useful caption per photo', async () => {
  const descriptions = ['snow over mountains. Late afternoon.', '', 'a quiet street'];
  const response = await invoke(createCaptionHandler(), { descriptions });
  assert.equal(response.status, 200);
  assert.deepEqual(response.result, { titles: fallbackTitles(descriptions), reflections: [], source: 'fallback' });
  assert.ok(response.result.titles.every(Boolean));
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(formatPhotoCaption(response.result.titles[0], '2024-01-01'), 'Snow over mountains (2024)');
  assert.equal(formatPhotoCaption('Quiet light', 'invalid'), 'Quiet light');
});

test('the endpoint rejects malformed requests without contacting the provider', async () => {
  const handler = createCaptionHandler({ apiKey: 'test-only-key', request: async () => { throw new Error('Unexpected request'); } });
  const get = await invoke(handler, undefined, 'GET');
  assert.equal(get.status, 405);
  assert.equal(get.headers.Allow, 'POST');
  for (const body of ['{', null, {}, { descriptions: [] }, { descriptions: [42] }, { descriptions: Array(31).fill('photo') }]) {
    assert.equal((await invoke(handler, body)).status, 400);
  }
});

test('structured AI output preserves photo order and fills missing titles', async () => {
  let calls = 0;
  const request: typeof fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    const payload = JSON.parse(String(options?.body));
    assert.equal(payload.model, 'gpt-4o-mini');
    assert.equal(payload.response_format.type, 'json_schema');
    assert.equal(payload.response_format.json_schema.strict, true);
    assert.ok(options?.signal);
    return Response.json({ choices: [{ message: { content: JSON.stringify({
      titles: ['  Blue\n silence  ', '', 42],
      reflections: ['  Make room for wonder. ', null, 'Look closely.'],
    }) } }] });
  };
  const { result, status } = await invoke(createCaptionHandler({ apiKey: 'test-only-key', request }),
    JSON.stringify({ descriptions: ['lake', 'forest path', 'clouds'] }));
  assert.equal(calls, 1);
  assert.equal(status, 200);
  assert.deepEqual(result.titles, ['Blue silence', 'Forest path', 'Clouds']);
  assert.deepEqual(result.reflections, ['Make room for wonder.', 'Look closely.']);
  assert.equal(result.source, 'generated');
});

test('provider failures and unusable responses retain fallback captions', async () => {
  const requests: typeof fetch[] = [
    async () => new Response('', { status: 401 }),
    async () => { throw new DOMException('Timed out', 'TimeoutError'); },
    async () => Response.json({ choices: [{ message: { content: 'invalid JSON' } }] }),
    async () => Response.json({ choices: [{ message: { content: '{"titles":"bad"}' } }] }),
  ];
  for (const request of requests) {
    const { result, status } = await invoke(createCaptionHandler({ apiKey: 'test-only-key', request }), { descriptions: ['rain'] });
    assert.equal(status, 200);
    assert.deepEqual(result, { titles: ['Rain'], reflections: [], source: 'fallback' });
  }
});

test('each visit selects distinct attributed quotes without altering photo blocks', () => {
  const photo: ContentBlock = { id: 'photo', type: 'image', src: 'photo.jpg', caption: 'Photo', mobile: {}, desktop: {} };
  const blocks = [photo, ...Array.from({ length: 3 }, (_, index) => ({
    id: 'quote-' + index, type: 'text', content: '', mobile: {}, desktop: {},
  } as ContentBlock))];
  const first = withWisdom(blocks, () => 0);
  const second = withWisdom(blocks, () => 0.99);
  assert.equal(first[0], photo);
  assert.equal(new Set(first.slice(1).map(block => block.content)).size, 3);
  assert.ok(first.slice(1).every(block => block.content?.startsWith('“') && block.caption?.startsWith('— ')));
  assert.notDeepEqual(first.slice(1), second.slice(1));
  assert.equal(blocks[1].content, '');
});
