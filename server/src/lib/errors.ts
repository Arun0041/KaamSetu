export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const BadRequest = (message: string, details?: unknown) =>
  new AppError(400, message, 'BAD_REQUEST', details);
export const Unauthorized = (message = 'Unauthorized') =>
  new AppError(401, message, 'UNAUTHORIZED');
export const Forbidden = (message = 'Forbidden') =>
  new AppError(403, message, 'FORBIDDEN');
export const NotFound = (message = 'Not found') => new AppError(404, message, 'NOT_FOUND');
export const Conflict = (message: string, details?: unknown) =>
  new AppError(409, message, 'CONFLICT', details);
export const PayloadTooLarge = (message = 'Payload too large') =>
  new AppError(413, message, 'PAYLOAD_TOO_LARGE');
export const TooManyRequests = (message = 'Too many requests') =>
  new AppError(429, message, 'RATE_LIMITED');
export const ServiceUnavailable = (message = 'Service unavailable') =>
  new AppError(503, message, 'SERVICE_UNAVAILABLE');
