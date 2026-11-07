import { Pool } from 'pg';
import { DurableObject } from 'cloudflare:workers';
import { requestScopedPool, withRequestPools } from '../../../lib/cloudflare/request-pools.mjs';

let pool;
export class DatabaseHostProbe extends DurableObject {
  constructor(context, env) {
    super(context, env);
    const url = new URL(env.DATABASE_URL);
    if (url.hostname !== '127.0.0.1' || url.pathname !== '/teacher_scenario_runtime') {
      throw new Error('Durable PostgreSQL probe requires the isolated local database');
    }
    this.pool = new Pool({ connectionString: env.DATABASE_URL, max: 1 });
    this.background = null;
  }

  async fetch(request) {
    if (new URL(request.url).pathname === '/host/status') {
      return Response.json({ background: this.background });
    }
    const first = await this.pool.query('SELECT pg_backend_pid() AS id');
    setTimeout(async () => {
      try {
        const later = await this.pool.query('SELECT pg_backend_pid() AS id');
        this.background = { passed: true, backendId: later.rows[0].id };
      } catch {
        this.background = { passed: false };
      }
    }, 100);
    return Response.json({ backendId: first.rows[0].id });
  }
}

const worker = {
  fetch(request, env, context) {
    if (new URL(request.url).pathname.startsWith('/host/')) {
      return env.DATABASE_HOST.get(env.DATABASE_HOST.idFromName('postgres-contract')).fetch(
        request,
      );
    }
    return withRequestPools(
      async () => {
        if (new URL(request.url).pathname === '/health') return Response.json({ ready: true });
        const url = new URL(env.DATABASE_URL);
        if (url.hostname !== '127.0.0.1' || url.pathname !== '/teacher_scenario_runtime') {
          throw new Error('PostgreSQL contract requires the isolated local database');
        }
        pool ??= requestScopedPool(Pool, { connectionString: env.DATABASE_URL, max: 1 });
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const first = await client.query('SELECT pg_backend_pid() AS id');
          await client.query('CREATE TEMP TABLE teacherlab_probe(value integer) ON COMMIT DROP');
          await client.query('INSERT INTO teacherlab_probe VALUES (7)');
          const row = await client.query('SELECT value FROM teacherlab_probe');
          await client.query('ROLLBACK');
          const last = await client.query(
            "SELECT pg_backend_pid() AS id, to_regclass('pg_temp.teacherlab_probe') AS table_name",
          );
          const passed =
            first.rows[0].id === last.rows[0].id &&
            row.rows[0].value === 7 &&
            last.rows[0].table_name === null;
          return Response.json(
            { passed, backendId: first.rows[0].id, rolledBack: last.rows[0].table_name === null },
            { status: passed ? 200 : 500 },
          );
        } finally {
          client.release();
        }
      },
      request,
      env,
      context,
    );
  },
};
export default worker;
