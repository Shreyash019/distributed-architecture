import { DynamicModule, Logger } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { createTypeOrmConfig } from 'postgres-connector-ts';
import { AuthUser, UserProfile } from './auth-service.entity';

const logger = new Logger('TypeOrmModule');

const required = [
  'DB_POSTGRES_HOST',
  'DB_POSTGRES_PORT',
  'DB_POSTGRES_USER',
  'DB_POSTGRES_PASSWORD',
  'DB_POSTGRES_NAME',
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const dbHost = process.env.DB_POSTGRES_HOST as string;
const dbPort = Number(process.env.DB_POSTGRES_PORT);
const dbUser = process.env.DB_POSTGRES_USER as string;
const dbPassword = process.env.DB_POSTGRES_PASSWORD as string;
const dbName = process.env.DB_POSTGRES_NAME as string;
const dbPoolMax = Number(process.env.DB_POSTGRES_POOL_MAX) || 10;

const dbConfig: DataSourceOptions = createTypeOrmConfig(
  {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    max: dbPoolMax,
  },
  [AuthUser, UserProfile],
) as unknown as DataSourceOptions;

export const TypeOrmRootModule: DynamicModule = TypeOrmModule.forRootAsync({
  useFactory: (): TypeOrmModuleOptions => dbConfig as TypeOrmModuleOptions,
  dataSourceFactory: async (options?: DataSourceOptions) => {
    if (!options) {
      throw new Error('TypeORM options are undefined');
    }

    const dataSource = new DataSource(options);
    await dataSource.initialize();
    logger.log(`Database connected: ${dbHost}:${dbPort}/${dbName}`);
    return dataSource;
  },
});
