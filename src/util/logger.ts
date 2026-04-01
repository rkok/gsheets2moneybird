/**
 * Singleton logger module that provides debug logging functionality.
 * Debug output can be enabled via --debug flag or DEBUG environment variable.
 */

class Logger {
  private static instance: Logger;
  private debugEnabled: boolean = false;

  private constructor() {
    // Check environment variable on construction
    this.debugEnabled = process.env.DEBUG === 'true' || process.env.DEBUG === '1';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Enable or disable debug logging
   */
  public setDebug(enabled: boolean): void {
    this.debugEnabled = enabled;
  }

  /**
   * Log debug information (only if debug is enabled)
   */
  public debug(message: string, ...args: any[]): void {
    if (this.debugEnabled) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log informational messages (always shown)
   */
  public info(message: string, ...args: any[]): void {
    console.log(message, ...args);
  }

  /**
   * Log warning messages (always shown)
   */
  public warn(message: string, ...args: any[]): void {
    console.warn(message, ...args);
  }

  /**
   * Log error messages (always shown)
   */
  public error(message: string, ...args: any[]): void {
    console.error(message, ...args);
  }
}

export = Logger.getInstance();
