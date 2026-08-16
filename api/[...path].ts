import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server';

type App = Awaited<ReturnType<typeof createApp>>['app'];

let appPromise: Promise<{ app: App; PORT: number }> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) appPromise = createApp();
  const { app } = await appPromise;
  app(req as Parameters<App>[0], res as Parameters<App>[1]);
}
