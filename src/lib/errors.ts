/**
 * Saans AppError & Shared Error Boundary Helpers
 * Standardized error handling across all API routes and services.
 */

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'STALE_DATA'
  | 'INTERNAL_ERROR'
  | 'CONSENT_REQUIRED'
  | 'KMS_ENCRYPT_ERROR'
  | 'KMS_DECRYPT_ERROR';

export interface AppErrorDetails {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  timestamp: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(code: ErrorCode, message: string, statusCode: number = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, details?: Record<string, unknown>): AppError {
    return new AppError('BAD_REQUEST', message, 400, details);
  }

  static unauthorized(message: string = 'Authentication required'): AppError {
    return new AppError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message: string = 'Access denied'): AppError {
    return new AppError('FORBIDDEN', message, 403);
  }

  static notFound(message: string = 'Resource not found'): AppError {
    return new AppError('NOT_FOUND', message, 404);
  }

  static rateLimited(message: string = 'Too many requests'): AppError {
    return new AppError('RATE_LIMITED', message, 429);
  }

  static providerUnavailable(provider: string, message?: string): AppError {
    return new AppError(
      'PROVIDER_UNAVAILABLE',
      message || `Air quality data provider "${provider}" is currently unreachable`,
      503,
      { provider }
    );
  }

  static internal(message: string = 'An unexpected error occurred'): AppError {
    return new AppError('INTERNAL_ERROR', message, 500);
  }

  toJSON(): AppErrorDetails {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Error) return AppError.internal(err.message);
  return AppError.internal(String(err));
}
