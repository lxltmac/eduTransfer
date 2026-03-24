import Database from "better-sqlite3";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isProduction = Boolean(process.env.DATABASE_URL);
let sqliteDb: Database.Database | null = null;
let postgresPool: Pool | null = null;

function convertPlaceholders(sql: string): string {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

export async function initDatabase() {
  if (isProduction) {
    postgresPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    console.log("[DB] PostgreSQL pool created");
  } else {
    const dataDir = process.env.DATA_DIR || path.dirname(__filename);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = process.env.DB_PATH || path.join(dataDir, "edu_transfer.db");
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma("journal_mode = WAL");
    console.log(`[DB] SQLite: ${dbPath}`);
  }
}

export async function asyncQuery<T = any>(sql: string, ...params: any[]): Promise<T[]> {
  if (isProduction) {
    const pgSql = convertPlaceholders(sql);
    const result = await postgresPool!.query(pgSql, params);
    return result.rows as T[];
  }
  if (params.length > 0) {
    return sqliteDb!.prepare(sql).all(...params) as T[];
  }
  return sqliteDb!.prepare(sql).all() as T[];
}

export async function asyncQueryOne<T = any>(sql: string, ...params: any[]): Promise<T | null> {
  if (isProduction) {
    const pgSql = convertPlaceholders(sql);
    const result = await postgresPool!.query(pgSql, params);
    return (result.rows[0] as T) || null;
  }
  if (params.length > 0) {
    return sqliteDb!.prepare(sql).get(...params) as T || null;
  }
  return sqliteDb!.prepare(sql).get() as T || null;
}

export async function asyncRun(sql: string, ...params: any[]): Promise<{ changes: number; lastID: number }> {
  if (isProduction) {
    const pgSql = convertPlaceholders(sql);
    const result = await postgresPool!.query(pgSql, params);
    return { changes: result.rowCount || 0, lastID: result.rows[0]?.id || 0 };
  }
  const stmt = sqliteDb!.prepare(sql);
  if (params.length > 0) {
    return stmt.run(...params);
  }
  return stmt.run();
}

export async function asyncExec(sql: string) {
  if (isProduction) {
    const statements = sql.split(";").filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) await postgresPool!.query(convertPlaceholders(stmt));
    }
  } else {
    sqliteDb!.exec(sql);
  }
}
