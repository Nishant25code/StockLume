/**
 * Throw an ApiError anywhere (service, controller, middleware) and the central
 * error handler turns it into the standard error response:
 *
 *   { "success": false, "error": { "code": "NOT_FOUND", "message": "...", "details": ... } }
 *
 * Example:  throw ApiError.notFound('Product not found');
 */
export class ApiError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Invalid request', details) {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have permission to do this') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message = 'Conflict with current state', details) {
    return new ApiError(409, 'CONFLICT', message, details);
  }

  static serviceNotConfigured(service) {
    return new ApiError(503, 'SERVICE_NOT_CONFIGURED', `${service} is not configured. Check environment variables.`);
  }
}
