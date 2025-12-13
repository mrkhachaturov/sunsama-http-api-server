/**
 * Simple logger with configurable log levels
 *
 * Log levels: debug < info < warn < error
 * Set via LOG_LEVEL environment variable (default: info)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Get current log level from environment
 */
function getLogLevel(): LogLevel {
  const level = (process.env['LOG_LEVEL'] || 'info').toLowerCase() as LogLevel;
  return LOG_LEVELS[level] !== undefined ? level : 'info';
}

/**
 * Check if a log level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

/**
 * Format log message with timestamp and level
 */
function formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.length > 0 ? ' ' + args.map(a => JSON.stringify(a)).join(' ') : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedArgs}`;
}

/**
 * Logger instance
 */
export const logger = {
  /**
   * Debug level - verbose information for debugging
   */
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message, ...args));
    }
  },

  /**
   * Info level - general information
   */
  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, ...args));
    }
  },

  /**
   * Warn level - warning messages
   */
  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, ...args));
    }
  },

  /**
   * Error level - error messages
   */
  error(message: string, ...args: unknown[]): void {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, ...args));
    }
  },

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return getLogLevel();
  },
};

export default logger;
