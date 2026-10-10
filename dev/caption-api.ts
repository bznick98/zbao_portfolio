import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { createCaptionHandler } from '../api/generate-captions';

export const captionApi = (env: Record<string, string>): Plugin => {
  const handler = createCaptionHandler({ apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL });
  const middleware = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url?.split('?')[0] !== '/api/generate-captions') return next();
    const chunks: Buffer[] = [];
    let bytes = 0;
    try {
      for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > 65536) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Request too large' }));
          return;
        }
        chunks.push(buffer);
      }
    } catch {
      if (!res.destroyed) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Incomplete request' }));
      }
      return;
    }
    const response = {
      status(code: number) { res.statusCode = code; return response; },
      json(value: unknown) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); },
      setHeader(name: string, value: string) { res.setHeader(name, value); },
    };
    await handler({ method: req.method, body: Buffer.concat(chunks).toString('utf8') }, response);
  };
  return {
    name: 'portfolio-caption-api',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
};
