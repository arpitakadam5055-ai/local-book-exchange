// ============================================================
// LOCAL BOOK EXCHANGE
// PostgreSQL / Neon Database Connection
// File: lib/db.js
// ============================================================

const { Pool } = require("pg");

// ============================================================
// CHECK DATABASE URL
// ============================================================

if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL environment variable is not configured.");
}

// ============================================================
// DETECT LOCAL DATABASE
// ============================================================

function isLocalDatabase() {
  const url = process.env.DATABASE_URL || "";

  return url.includes("localhost") || url.includes("127.0.0.1");
}

// ============================================================
// CREATE POSTGRESQL CONNECTION POOL
// ============================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Neon requires SSL.
  // Local PostgreSQL normally does not.
  ssl: isLocalDatabase()
    ? false
    : {
        rejectUnauthorized: false,
      },

  max: 10,

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 10000,
});

// ============================================================
// DATABASE CONNECTION EVENTS
// ============================================================

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

// ============================================================
// BASIC QUERY FUNCTION
//
// Usage:
//
// const { query } = require("../db");
//
// const result = await query(
//     "SELECT * FROM users WHERE id = $1",
//     [userId]
// );
//
// ============================================================

async function query(text, params = []) {
  try {
    const result = await pool.query(text, params);

    return result;
  } catch (error) {
    console.error("Database query error:", error.message);

    throw error;
  }
}

// ============================================================
// GET DATABASE CLIENT
//
// Use this for transactions.
//
// Example:
//
// const client = await getClient();
//
// try {
//
//     await client.query("BEGIN");
//
//     ...
//
//     await client.query("COMMIT");
//
// } catch (error) {
//
//     await client.query("ROLLBACK");
//
// } finally {
//
//     client.release();
// }
//
// ============================================================

async function getClient() {
  try {
    return await pool.connect();
  } catch (error) {
    console.error("Database connection error:", error.message);

    throw error;
  }
}

// ============================================================
// DATABASE HEALTH CHECK
// ============================================================

async function testConnection() {
  try {
    const result = await query(
      `
                SELECT
                    NOW() AS server_time,
                    current_database() AS database_name
                `,
    );

    console.log("PostgreSQL connected successfully.");

    console.log("Database:", result.rows[0].database_name);

    console.log("Server Time:", result.rows[0].server_time);

    return true;
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message);

    return false;
  }
}

// ============================================================
// TRANSACTION HELPER
//
// Example:
//
// const result = await transaction(
//     async (client) => {
//
//         await client.query(...);
//
//         return something;
//     }
// );
//
// ============================================================

async function transaction(callback) {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    const result = await callback(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError.message);
    }

    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// CLOSE DATABASE POOL
//
// Normally not required on Vercel.
// Useful for scripts such as create-admin.js.
// ============================================================

async function closePool() {
  try {
    await pool.end();
  } catch (error) {
    console.error("Error closing database pool:", error.message);
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  pool,

  query,

  getClient,

  testConnection,

  transaction,

  closePool,
};
