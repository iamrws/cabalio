/**
 * Structured logging utility that sanitizes sensitive data.
 * Prevents leaking connection strings, SQL queries, and stack traces.
 */

interface LogContext {
  [key: string]: string | number | boolean | null | undefined;
}

function sanitizeError(error: unknown): { code?: string; message: string } {
  if (error instanceof Error) {
    return {
      message: error.message.replace(/postgresql:\/\/[^\s]+/gi, '[REDACTED_URL]'),
    };
  }
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    return {
      code: typeof obj.code === 'string' ? obj.code : undefined,
      message: typeof obj.message === 'string'
        ? obj.message.replace(/postgresql:\/\/[^\s]+/gi, '[REDACTED_URL]')
        : 'Unknown error',
    };
  }
  return { message: String(error) };
}

export function logError(event: string, error: unknown, context?: LogContext): void {
  console.error(JSON.stringify({
    event,
    error: sanitizeError(error),
    ...context,
    timestamp: new Date().toISOString(),
  }));
}

export function logWarn(event: string, context?: LogContext): void {
  console.warn(JSON.stringify({
    event,
    ...context,
    timestamp: new Date().toISOString(),
  }));
}

export function logInfo(event: string, context?: LogContext): void {
  console.log(JSON.stringify({
    event,
    ...context,
    timestamp: new Date().toISOString(),
  }));
}
