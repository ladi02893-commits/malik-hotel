import { Pool, PoolClient } from 'pg';
import { createClient } from '@insforge/sdk';

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://c2y6x4d5.us-east.insforge.app';
const apiKey = process.env.INSFORGE_API_KEY || 'ik_5a131665bf7277aceeca766beb5a5b38';
const databaseUrl = process.env.INSFORGE_DATABASE_URL || 'postgresql://postgres:4bed443ecb7b7588d006f1e4efefc7ad@c2y6x4d5.us-east.database.insforge.app:5432/insforge?sslmode=require';

// Privileged InsForge SDK client for server-side operations
export const insforgeServer = createClient({
  baseUrl,
  anonKey: apiKey || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
});

// Singleton Postgres Connection Pool for atomic transactions
let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle InsForge Postgres client', err);
    });
  }
  return pool;
}

/**
 * Execute a query with connection handling
 */
export async function dbQuery<T = any>(text: string, params?: any[]): Promise<T[]> {
  const p = getDbPool();
  const res = await p.query(text, params);
  return res.rows;
}

/**
 * Run a multi-step operation inside an atomic PostgreSQL transaction
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const p = getDbPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
