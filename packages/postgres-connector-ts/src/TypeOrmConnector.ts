import { PostgresConfig } from "./types";
import { DataSourceOptions } from "typeorm";

export function createTypeOrmConfig(config: PostgresConfig, entities: any[]=[]): DataSourceOptions {
    return {
        type: 'postgres',
        host: config.host,
        port: config.port,
        username: config.user,
        password: config.password,
        database: config.database,
        entities: entities,
        synchronize: config.synchronize ?? false,
        poolSize: config.max
    }

}