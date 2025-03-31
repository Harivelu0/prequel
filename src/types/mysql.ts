declare namespace mssql {
    export class ConnectionPool {
      constructor(connectionString: string);
      connect(): Promise<ConnectionPool>;
      request(): Request;
      close(): Promise<void>;
    }
  
    export class Request {
      input(name: string, type: any, value: any): Request;
      query(sql: string): Promise<{
        recordset: any[];
        recordsets: any[][];
        rowsAffected: number[];
        output: any;
      }>;
      execute(procedure: string): Promise<{
        recordset: any[];
        recordsets: any[][];
        rowsAffected: number[];
        output: any;
      }>;
    }
  
    // SQL data types
    export const NVarChar: any;
    export const VarChar: any;
    export const Int: any;
    export const BigInt: any;
    export const DateTime: any;
    export const DateTime2: any;
    export const Date: any;
    export const Bit: any;
    export const Float: any;
    export const Decimal: any;
    export const Money: any;
    export const UniqueIdentifier: any;
    export const SmallInt: any;
    export const TinyInt: any;
    export const Text: any;
    export const Char: any;
    export const Xml: any;
  }
  
  declare module 'mssql' {
    export = mssql;
  }