// ============================================================
// LOCAL BOOK EXCHANGE
// CREATE ADMIN SCRIPT
// File: scripts/create-admin.js
// ============================================================
//
// Purpose:
// Creates or updates the main administrator account.
//
// Run:
// node scripts/create-admin.js
//
// Required environment variables:
//
// DATABASE_URL=...
// ADMIN_NAME=Administrator
// ADMIN_EMAIL=admin@example.com
// ADMIN_PASSWORD=Admin@123
// ADMIN_PHONE=9876543210
//
// ============================================================

require("dotenv").config();

const bcrypt = require("bcryptjs");

const { query, closePool } = require("../lib/db");

// ============================================================
// GET ENVIRONMENT VALUES
// ============================================================

const ADMIN_NAME = String(process.env.ADMIN_NAME || "Administrator").trim();

const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "")
  .trim()
  .toLowerCase();

const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "");

const ADMIN_PHONE = String(process.env.ADMIN_PHONE || "").trim();

// ============================================================
// VALIDATION
// ============================================================

function validateConfig() {
  const errors = [];

  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is not configured.");
  }

  if (!ADMIN_NAME) {
    errors.push("ADMIN_NAME is required.");
  }

  if (!ADMIN_EMAIL) {
    errors.push("ADMIN_EMAIL is required.");
  }

  if (ADMIN_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL)) {
    errors.push("ADMIN_EMAIL is not valid.");
  }

  if (!ADMIN_PASSWORD) {
    errors.push("ADMIN_PASSWORD is required.");
  }

  if (ADMIN_PASSWORD && ADMIN_PASSWORD.length < 6) {
    errors.push("ADMIN_PASSWORD must contain at least 6 characters.");
  }

  return errors;
}

// ============================================================
// CREATE OR UPDATE ADMIN
// ============================================================

async function createAdmin() {
  console.log("==========================================");

  console.log(" Local Book Exchange - Create Admin");

  console.log("==========================================");

  // --------------------------------------------------------
  // VALIDATE CONFIG
  // --------------------------------------------------------

  const errors = validateConfig();

  if (errors.length > 0) {
    console.error("\nConfiguration Error:\n");

    errors.forEach((error, index) => {
      console.error(`${index + 1}. ${error}`);
    });

    process.exitCode = 1;

    return;
  }

  try {
    console.log("\nConnecting to database...");

    // ----------------------------------------------------
    // CHECK IF ADMIN EXISTS
    // ----------------------------------------------------

    const existing = await query(
      `
                SELECT
                    id,
                    full_name,
                    email,
                    phone,
                    status
                FROM admins
                WHERE LOWER(email) = LOWER($1)
                LIMIT 1
                `,
      [ADMIN_EMAIL],
    );

    // ----------------------------------------------------
    // HASH PASSWORD
    // ----------------------------------------------------

    console.log("Hashing administrator password...");

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    // ----------------------------------------------------
    // UPDATE EXISTING ADMIN
    // ----------------------------------------------------

    if (existing.rows.length > 0) {
      const adminId = existing.rows[0].id;

      const result = await query(
        `
                    UPDATE admins

                    SET
                        full_name = $1,
                        phone = $2,
                        password_hash = $3,
                        status = 'active',
                        updated_at = NOW()

                    WHERE id = $4

                    RETURNING
                        id,
                        full_name,
                        email,
                        phone,
                        status,
                        created_at,
                        updated_at
                    `,
        [ADMIN_NAME, ADMIN_PHONE || null, passwordHash, adminId],
      );

      const admin = result.rows[0];

      console.log("\nAdministrator already existed.");

      console.log("Administrator account updated successfully.");

      printAdminDetails(admin);

      return;
    }

    // ----------------------------------------------------
    // CREATE NEW ADMIN
    // ----------------------------------------------------

    const result = await query(
      `
                INSERT INTO admins
                (
                    full_name,
                    email,
                    phone,
                    password_hash,
                    status
                )

                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    'active'
                )

                RETURNING
                    id,
                    full_name,
                    email,
                    phone,
                    status,
                    created_at,
                    updated_at
                `,
      [ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE || null, passwordHash],
    );

    const admin = result.rows[0];

    console.log("\nAdministrator created successfully.");

    printAdminDetails(admin);
  } catch (error) {
    console.error("\nUnable to create administrator.");

    console.error(error.message);

    if (error.code === "42P01") {
      console.error("\nThe admins table does not exist.");

      console.error("Run database/schema.sql first.");
    }

    if (error.code === "23505") {
      console.error("\nAn administrator with this email already exists.");
    }

    process.exitCode = 1;
  }
}

// ============================================================
// DISPLAY ADMIN DETAILS
// ============================================================

function printAdminDetails(admin) {
  console.log("\n------------------------------------------");

  console.log(`Admin ID   : ${admin.id}`);

  console.log(`Name       : ${admin.full_name}`);

  console.log(`Email      : ${admin.email}`);

  console.log(`Phone      : ${admin.phone || "-"}`);

  console.log(`Status     : ${admin.status}`);

  console.log("------------------------------------------");

  console.log(
    "\nUse the ADMIN_EMAIL and ADMIN_PASSWORD from your .env file to login.",
  );

  console.log("Admin login page: admin/login.html");
}

// ============================================================
// RUN
// ============================================================

async function main() {
  try {
    await createAdmin();
  } catch (error) {
    console.error("Unexpected error:", error);

    process.exitCode = 1;
  } finally {
    try {
      await closePool();
    } catch (error) {
      console.error("Unable to close database connection:", error.message);
    }
  }
}

main();
