import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './src/api/app';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

async function startServer() {
  const app = createApiApp();
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: { server: httpServer },
      },
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

  httpServer.listen(PORT, () => {
    console.log(`NYC Community Gardens Resilience Index running on http://127.0.0.1:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  void startServer();
}
