import type { Plugin } from 'vite';
import handler from '../api/coffee';
export function coffeeApi(env: Record<string, string>): Plugin {
  return { name: 'coffee-api', configureServer(server) {
    for (const [key, value] of Object.entries(env)) if (/^(GOOGLE_|COFFEE_)/.test(key) && !process.env[key]) process.env[key] = value;
    server.middlewares.use(async (req, res, next) => {
      if (req.url?.split('?')[0] !== '/api/coffee') return next();
      const response = { status(code: number) { res.statusCode = code; return response; }, setHeader(name: string, value: string) { res.setHeader(name, value); }, json(data: unknown) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); } };
      try {
        const chunks: Buffer[] = []; let size = 0;
        for await (const chunk of req) { size += Buffer.byteLength(chunk); if (size > 8192) { response.status(413).json({ error: 'Request is too large.' }); return; } chunks.push(Buffer.from(chunk)); }
        await handler({ method: req.method, body: Buffer.concat(chunks).toString() }, response);
      } catch { response.status(503).json({ error: 'Calendar unavailable. Please try again.' }); }
    });
  } };
}
