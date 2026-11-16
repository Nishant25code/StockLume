/**
 * Central error handling. Express 5 forwards errors thrown inside async
 * handlers here automatically — no try/catch needed in controllers.
 */
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Map common PostgreSQL error codes to friendly API errors.
const PG_ERRORS = {
  '23505': [409, 'CONFLICT', 'A record with these values already exists'],
  '23503': [400, 'VALIDATION_ERROR', 'A referenced record does not exist'],
  '23514': [400, 'VALIDATION_ERROR', 'A value breaks a database rule (check constraint)'],
  '23502': [400, 'VALIDATION_ERROR', 'A required value is missing'],
  '22P02': [400, 'VALIDATION_ERROR', 'Invalid value format (for example, a malformed UUID)'],
};

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.originalUrl} does not exist`));
}

// Express recognises error handlers by their 4 arguments — keep `_next`.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details;

  if (err instanceof ApiError) {
    ({ statusCode: status, code, message, details } = err);
  } else if (err?.code && PG_ERRORS[err.code]) {
    [status, code, message] = PG_ERRORS[err.code];
    details = env.isProduction ? undefined : { constraint: err.constraint, detail: err.detail };
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Request body is not valid JSON';
  }

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  const body = { success: false, error: { code, message } };
  if (details !== undefined) body.error.details = details;
  res.status(status).json(body);
}
