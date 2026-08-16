import type { IncomingMessage, ServerResponse } from 'http';
import { createApiApp } from './app';

const app = createApiApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const url = req.url || '/';
  if (!url.startsWith('/api')) {
    const qIndex = url.indexOf('?');
    const pathPart = qIndex === -1 ? url : url.slice(0, qIndex);
    const query = qIndex === -1 ? '' : url.slice(qIndex);
    req.url = `/api${pathPart.startsWith('/') ? pathPart : `/${pathPart}`}${query}`;
  }
  return app(req, res);
}
