/**
 * Simple logger utility for the PReQual system
 */

/**
 * Log an informational message
 */
export function info(message: string): void {
    console.log(`[INFO] ${message}`);
  }
  
  /**
   * Log a warning message
   */
  export function warn(message: string): void {
    console.warn(`[WARN] ${message}`);
  }
  
  /**
   * Log an error message
   */
 /**
 * Log an error message
 */
export function error(err: unknown): void {
  if (err instanceof Error) {
    console.error(`[ERROR] ${err.message}`);
  } else {
    console.error(`[ERROR] ${String(err)}`);
  }
}
  
  /**
   * Log a debug message
   */
  export function debug(message: string): void {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${message}`);
    }
  }