/**
 * Logging utility that conditionally logs based on environment.
 * Errors are always logged; debug/info logs are only shown in development.
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Log general information - only in development
   */
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log warnings - only in development
   */
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log errors - always logged (production and development)
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  /**
   * Log debug information - only in development
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Log with a specific context/tag - only in development
   */
  tagged: (tag: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`[${tag}]`, ...args);
    }
  },

  /**
   * Log an error with context - always logged
   */
  errorWithContext: (context: string, error: unknown) => {
    console.error(`[${context}]`, error);
  },
};

/**
 * Custom error class for game-related errors.
 * Provides structured error information for debugging and error tracking.
 */
export class GameError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GameError';
    this.code = code;
    this.context = context;

    // Maintains proper stack trace for where error was thrown (V8 only)
    const ErrorWithCapture = Error as typeof Error & {
      captureStackTrace?: (target: object, constructor: Function) => void;
    };
    if (typeof ErrorWithCapture.captureStackTrace === 'function') {
      ErrorWithCapture.captureStackTrace(this, GameError);
    }
  }
}

/**
 * Standard error handler for consistent error processing across the app.
 */
export const handleError = (
  error: unknown,
  context: string,
  silent: boolean = false
): void => {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (!silent) {
    logger.errorWithContext(context, error);
  }

  // In production, you might want to send errors to a tracking service
  if (!isDev && error instanceof Error) {
    // TODO: Send to error tracking service (e.g., Sentry, PostHog)
    // trackError(error, context);
  }
};
