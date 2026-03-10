export interface PostgresConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connecttionTimeoutMillis?: number;
    synchronize?: boolean;
}