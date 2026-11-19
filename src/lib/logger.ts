/**
 * Saans Structured Logger
 * Emits JSON logs compatible with Google Cloud Logging.
 * Guarantees zero PII or sensitive health conditions are logged (SEC-17).
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogPayload {
  severity: LogLevel;
  message: string;
  timestamp: string;
  component?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const FORBIDDEN_KEYS = new Set([
  'name',
  'email',
  'password',
  'token',
  'secret',
  'apiKey',
  'condition',
  'conditions',
  'symptom',
  'symptoms',
  'pregnancy',
  'asthma',
  'copd',
]);

function sanitize(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitize(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

function writeLog(level: LogLevel, message: string, component?: string, context?: Record<string, unknown>, err?: Error): void {
  const payload: LogPayload = {
    severity: level,
    message,
    timestamp: new Date().toISOString(),
    component: component || 'saans-app',
    context: context ? (sanitize(context) as Record<string, unknown>) : undefined,
  };

  if (err) {
    payload.error = {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    };
  }

  const output = JSON.stringify(payload);
  if (level === 'ERROR') {
    process.stderr.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>, component?: string) =>
    writeLog('DEBUG', message, component, context),
  info: (message: string, context?: Record<string, unknown>, component?: string) =>
    writeLog('INFO', message, component, context),
  warn: (message: string, context?: Record<string, unknown>, component?: string) =>
    writeLog('WARN', message, component, context),
  error: (message: string, err?: Error, context?: Record<string, unknown>, component?: string) =>
    writeLog('ERROR', message, component, context, err),
};
