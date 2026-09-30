// ============================================================
// LOCAL BOOK EXCHANGE
// Authentication Controller
// ============================================================

const bcrypt = require("bcryptjs");

const { query } = require("../db");

const {
  generateUserToken,
  generateAdminToken,
  sanitizeUser,
  sanitizeAdmin,
} = require("../auth");

// ============================================================
// RESPONSE HELPER
// ============================================================

function send(res, statusCode, data) {
  if (res.headersSent) {
    return;
  }

  res.statusCode = statusCode;

  res.setHeader("Content-Type", "application/json");

  res.end(JSON.stringify(data));
}

// ============================================================
// READ JSON BODY
// ============================================================

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (Buffer.isBuffer(req.body)) {
    const text = req.body.toString("utf8");

    return text ? JSON.parse(text) : {};
  }

  if (typeof req.body === "string") {
    return req.body ? JSON.parse(req.body) : {};
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  const text = Buffer.concat(chunks).toString("utf8");

  return text ? JSON.parse(text) : {};
}

// ============================================================
// USER REGISTRATION
// ============================================================

async function register(req, res) {
  try {
    const body = await readBody(req);

    const fullName = String(body.fullName || body.full_name || "").trim();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const phone = String(body.phone || "").trim();

    const location = String(body.location || "").trim();

    const password = String(body.password || "");

    // ----------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------

    if (!fullName) {
      return send(res, 400, {
        success: false,
        message: "Full name is required.",
      });
    }

    if (!email) {
      return send(res, 400, {
        success: false,
        message: "Email address is required.",
      });
    }

    if (!location) {
      return send(res, 400, {
        success: false,
        message: "Location is required.",
      });
    }

    if (password.length < 6) {
      return send(res, 400, {
        success: false,
        message: "Password must contain at least 6 characters.",
      });
    }

    // ----------------------------------------------------
    // CHECK EMAIL
    // ----------------------------------------------------

    const existing = await query(
      `
                SELECT id
                FROM users
                WHERE LOWER(email) = LOWER($1)
                LIMIT 1
                `,
      [email],
    );

    if (existing.rows.length > 0) {
      return send(res, 409, {
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // ----------------------------------------------------
    // HASH PASSWORD
    // ----------------------------------------------------

    const passwordHash = await bcrypt.hash(password, 12);

    // ----------------------------------------------------
    // INSERT USER
    // ----------------------------------------------------

    const result = await query(
      `
                INSERT INTO users
                (
                    full_name,
                    email,
                    phone,
                    location,
                    password_hash,
                    status
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    'active'
                )
                RETURNING
                    id,
                    full_name,
                    email,
                    phone,
                    location,
                    bio,
                    profile_image,
                    status,
                    created_at,
                    updated_at
                `,
      [fullName, email, phone || null, location, passwordHash],
    );

    const user = result.rows[0];

    const token = generateUserToken(user);

    return send(res, 201, {
      success: true,
      message: "Registration successful.",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    if (error.code === "23505") {
      return send(res, 409, {
        success: false,
        message: "An account with this email already exists.",
      });
    }

    return send(res, 500, {
      success: false,
      message: "Unable to create account.",
    });
  }
}

// ============================================================
// USER LOGIN
// ============================================================

async function login(req, res) {
  try {
    const body = await readBody(req);

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");

    if (!email || !password) {
      return send(res, 400, {
        success: false,
        message: "Email and password are required.",
      });
    }

    const result = await query(
      `
                SELECT
                    id,
                    full_name,
                    email,
                    phone,
                    location,
                    bio,
                    profile_image,
                    password_hash,
                    status,
                    created_at,
                    updated_at
                FROM users
                WHERE LOWER(email) = LOWER($1)
                LIMIT 1
                `,
      [email],
    );

    if (result.rows.length === 0) {
      return send(res, 401, {
        success: false,
        message: "Invalid email or password.",
      });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return send(res, 401, {
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (String(user.status).toLowerCase() !== "active") {
      return send(res, 403, {
        success: false,
        message:
          user.status === "blocked"
            ? "Your account has been blocked."
            : "Your account is inactive.",
      });
    }

    const token = generateUserToken(user);

    return send(res, 200, {
      success: true,
      message: "Login successful.",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to login.",
    });
  }
}

// ============================================================
// ADMIN LOGIN
// ============================================================

async function adminLogin(req, res) {
  try {
    const body = await readBody(req);

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");

    if (!email || !password) {
      return send(res, 400, {
        success: false,
        message: "Email and password are required.",
      });
    }

    const result = await query(
      `
                SELECT
                    id,
                    full_name,
                    email,
                    phone,
                    password_hash,
                    status,
                    last_login,
                    created_at,
                    updated_at
                FROM admins
                WHERE LOWER(email) = LOWER($1)
                LIMIT 1
                `,
      [email],
    );

    if (result.rows.length === 0) {
      return send(res, 401, {
        success: false,
        message: "Invalid administrator email or password.",
      });
    }

    const admin = result.rows[0];

    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return send(res, 401, {
        success: false,
        message: "Invalid administrator email or password.",
      });
    }

    if (String(admin.status).toLowerCase() !== "active") {
      return send(res, 403, {
        success: false,
        message: "Administrator account is inactive.",
      });
    }

    const updated = await query(
      `
                UPDATE admins
                SET
                    last_login = NOW(),
                    updated_at = NOW()
                WHERE id = $1
                RETURNING
                    id,
                    full_name,
                    email,
                    phone,
                    status,
                    last_login,
                    created_at,
                    updated_at
                `,
      [admin.id],
    );

    const currentAdmin = updated.rows[0];

    const token = generateAdminToken(currentAdmin);

    return send(res, 200, {
      success: true,
      message: "Administrator login successful.",
      token,
      admin: sanitizeAdmin(currentAdmin),
    });
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to login as administrator.",
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  register,

  login,

  adminLogin,
};
