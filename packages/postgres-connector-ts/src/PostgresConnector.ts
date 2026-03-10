import { Pool, PoolConfig, QueryResult, QueryResultRow } from "pg";
import { PostgresConfig } from "./types";

export class PostgresConnector {
  private static pool: Pool | null = null;

  // Initialize the pool with config
  static init(config: PostgresConfig): void {
    if (!this.pool) {
      this.pool = new Pool(config as PoolConfig);
      this.pool.on("error", (err) => {
        console.error("Postgres Pool Error:", err);
      });
    }
  }

  // Get the pool instance
  static getPool(): Pool {
    if (!this.pool) {
      throw new Error("Postgres pool not initialized. Call init() first.");
    }
    return this.pool;
  }

  // Run a query
  static async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<QueryResult<T>> {
    const pool = this.getPool();
    return pool.query<T>(text, params);
  }

  // Close the pool
  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
