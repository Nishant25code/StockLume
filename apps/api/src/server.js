/**
 * Local entry point:  npm run dev:api  (from the repo root)
 * On Vercel the app is served as a function, so we skip listen() there.
 */
import app from './app.js';
import { env } from './config/env.js';

if (!process.env.VERCEL) {
  app.listen(env.port, () => {
    console.log(`StockLume API listening on http://localhost:${env.port}`);
    console.log(`Health check:          http://localhost:${env.port}/api/health`);
  });
}

export default app;
