/**
 * Cloudflare Workers entry point for the Express API.
 *   npm run cf:dev --workspace @stocklume/api     (local, uses .dev.vars)
 *   npm run cf:deploy --workspace @stocklume/api  (deploy)
 *
 * Workers' Node.js compatibility runs the same Express app: app.listen()
 * registers it and httpServerHandler routes Worker requests to it.
 */
import { httpServerHandler } from 'cloudflare:node';
import app from './app.js';

const PORT = 8080;
app.listen(PORT);
const server = httpServerHandler({ port: PORT });

export default {
  fetch(request, env, ctx) {
    // The Hyperdrive binding can only be read inside a request, not at startup.
    if (env.HYPERDRIVE?.connectionString) {
      process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
    }
    return server.fetch(request, env, ctx);
  },
};
