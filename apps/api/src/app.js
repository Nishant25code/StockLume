/**
 * Express application (no app.listen here).
 * - Local development: src/server.js imports this and calls listen().
 * - Vercel: detects this Express app and runs it as a serverless function.
 */
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

const app = express();

app.disable('x-powered-by');

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (curl, Postman) which send no Origin header.
      if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.json({ success: true, data: { name: 'StockLume API', docs: '/api/health' } });
});

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
