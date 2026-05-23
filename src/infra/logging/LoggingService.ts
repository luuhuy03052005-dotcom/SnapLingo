import log from 'electron-log';

// Configure log file name and format
log.transports.file.fileName = 'snaplingo.log';
log.transports.console.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

/**
 * Logging Service using electron-log.
 * Why: Saves clean operational traces directly inside userData directory for debug diagnostics.
 */
export const LoggingService = {
  info(message: string, ...args: unknown[]): void {
    log.info(message, ...args);
  },

  warn(message: string, ...args: unknown[]): void {
    log.warn(message, ...args);
  },

  debug(message: string, ...args: unknown[]): void {
    log.debug(message, ...args);
  },

  error(message: string, ...args: unknown[]): void {
    log.error(message, ...args);
  },

  getLogPath(): string {
    return log.transports.file.getFile().path;
  }
};
