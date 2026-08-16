import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './src/api/app';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

async function startServer() {
  const app = createApiApp();
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const express = await import('express');
    app.use(express.default.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NYC Community Gardens Resilience Index API running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  void startServer();
}
