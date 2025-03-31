declare namespace mssql {
    class ConnectionPool {
        constructor(connectionString: string);
        connect(): Promise<ConnectionPool>;
        request(): Request;
        close(): Promise<void>;
    }
    class Request {
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
    const NVarChar: any;
    const VarChar: any;
    const Int: any;
    const BigInt: any;
    const DateTime: any;
    const DateTime2: any;
    const Date: any;
    const Bit: any;
    const Float: any;
    const Decimal: any;
    const Money: any;
    const UniqueIdentifier: any;
    const SmallInt: any;
    const TinyInt: any;
    const Text: any;
    const Char: any;
    const Xml: any;
}
declare module 'mssql' {
    export = mssql;
}
