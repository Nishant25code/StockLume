/**
 * Local entry point:  npm run dev:api  (from the repo root)
 * On Cloudflare Workers src/worker.js is the entry instead (this file is not used).
 */
import app from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => {
  console.log(`StockLume API listening on http://localhost:${env.port}`);
  console.log(`Health check:          http://localhost:${env.port}/api/health`);
});

export default app;
