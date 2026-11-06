import { BookingError, getAvailability, reserve } from '../server/coffee-calendar';

export default async function handler(req: { method?: string; body?: unknown }, res: { status: (code: number) => any; setHeader: (name: string, value: string) => void; json: (data: unknown) => void }) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') return res.status(200).json(await getAvailability());
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Method not allowed' }); }
    if (JSON.stringify(req.body ?? '').length > 8192) throw new BookingError(413, 'Request is too large.');
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { throw new BookingError(400, 'Invalid request.'); } }
    return res.status(201).json(await reserve(body));
  } catch (error) {
    return res.status(error instanceof BookingError ? error.status : 503).json({ error: error instanceof BookingError ? error.message : 'My calendar is temporarily unavailable. Please try again shortly.' });
  }
}
