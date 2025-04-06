
export function info(message: string): void {
    console.log(`[INFO] ${message}`);
  }
  
  
  export function warn(message: string): void {
    console.warn(`[WARN] ${message}`);
  }
  

export function error(err: unknown): void {
  if (err instanceof Error) {
    console.error(`[ERROR] ${err.message}`);
  } else {
    console.error(`[ERROR] ${String(err)}`);
  }
}

  export function debug(message: string): void {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${message}`);
    }
  }