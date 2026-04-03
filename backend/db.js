import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

function normalizeConnectionString(input) {
  if (!input) {
    return null;
  }

  if (input.startsWith("jdbc:postgresql://")) {
    return input.replace("jdbc:", "");
  }

  return input;
}

function parseConnection(baseConnectionString) {
  const normalized = normalizeConnectionString(baseConnectionString);
  if (!normalized) {
    throw new Error("URL de conexao do banco nao encontrada.");
  }

  const url = new URL(normalized);

  const userFromUrl = url.username ? decodeURIComponent(url.username) : "";
  const passwordFromUrl = url.password ? decodeURIComponent(url.password) : "";

  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    database: url.pathname.replace(/^\//, ""),
    user: process.env.DB_USER || userFromUrl || "postgres",
    password:
      process.env.DB_PASSWORD !== undefined
        ? process.env.DB_PASSWORD
        : passwordFromUrl !== ""
          ? passwordFromUrl
          : "postgres"
  };
}

const rawConnection =
  process.env.DATABASE_URL || process.env.DATABASE_JDBC_URL || "jdbc:postgresql://localhost:5432/mysite";

const parsed = parseConnection(rawConnection);

const pool = new Pool({
  host: parsed.host,
  port: parsed.port,
  database: parsed.database,
  user: parsed.user,
  password: parsed.password,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

export async function initDatabase() {
  const sql = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id BIGSERIAL PRIMARY KEY,
      nome VARCHAR(120) NOT NULL,
      email VARCHAR(160) NOT NULL UNIQUE,
      senha VARCHAR(255) NOT NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await pool.query(sql);
}

export async function query(text, params = []) {
  return pool.query(text, params);
}

export default pool;
