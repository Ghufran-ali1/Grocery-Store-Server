require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.SUPABASE_DB_POOLING_URL || process.env.SUPABASE_DB_URL;

if (!global._pgPool) {
  global._pgPool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 2, // very low for serverless
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

module.exports = global._pgPool;
