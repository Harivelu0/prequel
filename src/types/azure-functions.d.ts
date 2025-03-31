declare module '@azure/functions' {
  export interface HttpRequest {
    method: string;
    url: string;
    headers: Headers;
    query: Record<string, string | string[]>;
    params: Record<string, string>;
    body?: any;
    rawBody?: any;
  }

  export interface Headers {
    get(name: string): string | null;
    has(name: string): boolean;
    forEach(callback: (value: string, name: string) => void): void;
  }

  export interface Context {
    invocationId: string;
    executionContext: {
      invocationId: string;
      functionName: string;
      functionDirectory: string;
    };
    bindings: Record<string, any>;
    bindingData: Record<string, any>;
    traceContext: {
      traceparent: string;
      tracestate: string;
      attributes: Record<string, any>;
    };
    log: {
      (message: string, ...params: any[]): void;
      error(message: string, ...params: any[]): void;
      warn(message: string, ...params: any[]): void;
      info(message: string, ...params: any[]): void;
      verbose(message: string, ...params: any[]): void;
    };
    done: (err?: Error | null, result?: any) => void;
    res: {
      status?: number;
      body?: any;
      headers?: Record<string, string>;
    };
  }

  // Make AzureFunction more generic - accepts any args
  export type AzureFunction = (context: Context, ...args: any[]) => void | Promise<any>;
  
  // Specific function types
  export type HttpFunction = (context: Context, req: HttpRequest) => void | Promise<any>;
  export type TimerFunction = (context: Context, timer: any) => void | Promise<any>;
}