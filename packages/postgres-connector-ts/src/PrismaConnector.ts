import { PostgresConfig } from './types';

export function createPrismaUrl(config: PostgresConfig): string {
  const { user, password, host, port, database } = config;
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}