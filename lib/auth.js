// ============================================================
// LOCAL BOOK EXCHANGE
// Authentication / JWT Helper
// File: lib/auth.js
// ============================================================

const jwt = require("jsonwebtoken");

const { query } = require("./db");

// ============================================================
// JWT CONFIGURATION
// ============================================================

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "local-book-exchange-development-secret-change-this";

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// ============================================================
// CUSTOM AUTH ERROR
// ============================================================

function authError(message, statusCode = 401) {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
}

// ============================================================
// CREATE USER TOKEN
// ============================================================

function generateUserToken(user) {
  if (!user) {
    throw new Error("User data is required to create token.");
  }

  const userId = user.id || user.user_id;

  if (!userId) {
    throw new Error("User ID is missing.");
  }

  return jwt.sign(
    {
      id: userId,

      userId,

      email: user.email,

      role: "user",
    },

    JWT_SECRET,

    {
      expiresIn: JWT_EXPIRES_IN,
    },
  );
}

// ============================================================
// CREATE ADMIN TOKEN
// ============================================================

function generateAdminToken(admin) {
  if (!admin) {
    throw new Error("Admin data is required to create token.");
  }

  const adminId = admin.id || admin.admin_id;

  if (!adminId) {
    throw new Error("Admin ID is missing.");
  }

  return jwt.sign(
    {
      id: adminId,

      adminId,

      email: admin.email,

      role: "admin",
    },

    JWT_SECRET,

    {
      expiresIn: JWT_EXPIRES_IN,
    },
  );
}

// ============================================================
// GET AUTHORIZATION TOKEN
//
// Expected:
//
// Authorization: Bearer eyJhbGciOi...
//
// ============================================================

function getTokenFromRequest(req) {
  if (!req) {
    throw authError("Request is missing.");
  }

  const authorization =
    req.headers?.authorization || req.headers?.Authorization;

  if (!authorization) {
    throw authError("Authentication token is required.");
  }

  const parts = authorization.trim().split(/\s+/);

  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    throw authError("Invalid Authorization header.");
  }

  const token = parts[1];

  if (!token) {
    throw authError("Authentication token is missing.");
  }

  return token;
}

// ============================================================
// VERIFY JWT TOKEN
// ============================================================

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw authError("Your session has expired. Please login again.");
    }

    throw authError("Invalid authentication token.");
  }
}

// ============================================================
// GET AUTHENTICATED USER FROM DATABASE
// ============================================================

async function requireUser(req) {
  const token = getTokenFromRequest(req);

  const decoded = verifyToken(token);

  // --------------------------------------------------------
  // ROLE CHECK
  // --------------------------------------------------------

  if (decoded.role !== "user") {
    throw authError("User access required.", 403);
  }

  const userId = decoded.userId || decoded.id;

  if (!userId) {
    throw authError("Invalid user token.");
  }

  // --------------------------------------------------------
  // GET USER FROM DATABASE
  // --------------------------------------------------------

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
                status,
                created_at,
                updated_at
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
    [userId],
  );

  if (result.rows.length === 0) {
    throw authError("User account was not found.");
  }

  const user = result.rows[0];

  // --------------------------------------------------------
  // USER STATUS CHECK
  // --------------------------------------------------------

  const status = String(user.status || "active").toLowerCase();

  if (status !== "active") {
    throw authError(
      status === "blocked"
        ? "Your account has been blocked."
        : "Your account is currently inactive.",
      403,
    );
  }

  return user;
}

// ============================================================
// GET AUTHENTICATED ADMIN FROM DATABASE
// ============================================================

async function requireAdmin(req) {
  const token = getTokenFromRequest(req);

  const decoded = verifyToken(token);

  // --------------------------------------------------------
  // ROLE CHECK
  // --------------------------------------------------------

  if (decoded.role !== "admin") {
    throw authError("Administrator access required.", 403);
  }

  const adminId = decoded.adminId || decoded.id;

  if (!adminId) {
    throw authError("Invalid administrator token.");
  }

  // --------------------------------------------------------
  // GET ADMIN FROM DATABASE
  // --------------------------------------------------------

  const result = await query(
    `
            SELECT
                id,
                full_name,
                email,
                phone,
                status,
                last_login,
                created_at,
                updated_at
            FROM admins
            WHERE id = $1
            LIMIT 1
            `,
    [adminId],
  );

  if (result.rows.length === 0) {
    throw authError("Administrator account was not found.");
  }

  const admin = result.rows[0];

  // --------------------------------------------------------
  // ADMIN STATUS CHECK
  // --------------------------------------------------------

  const status = String(admin.status || "active").toLowerCase();

  if (status !== "active") {
    throw authError("Administrator account is inactive.", 403);
  }

  return admin;
}

// ============================================================
// OPTIONAL USER AUTH
//
// Useful when an endpoint can work for both:
// logged-in users and guests.
//
// ============================================================

async function optionalUser(req) {
  try {
    const authorization = req.headers?.authorization;

    if (!authorization) {
      return null;
    }

    return await requireUser(req);
  } catch (error) {
    return null;
  }
}

// ============================================================
// PASSWORD SAFE USER RESPONSE
//
// Never send password_hash back to browser.
// ============================================================

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id || user.user_id,

    full_name: user.full_name,

    email: user.email,

    phone: user.phone || "",

    location: user.location || "",

    bio: user.bio || "",

    profile_image: user.profile_image || null,

    status: user.status || "active",

    created_at: user.created_at,

    updated_at: user.updated_at,
  };
}

// ============================================================
// PASSWORD SAFE ADMIN RESPONSE
// ============================================================

function sanitizeAdmin(admin) {
  if (!admin) {
    return null;
  }

  return {
    id: admin.id || admin.admin_id,

    full_name: admin.full_name,

    email: admin.email,

    phone: admin.phone || "",

    status: admin.status || "active",

    last_login: admin.last_login,

    created_at: admin.created_at,

    updated_at: admin.updated_at,
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  generateUserToken,

  generateAdminToken,

  getTokenFromRequest,

  verifyToken,

  requireUser,

  requireAdmin,

  optionalUser,

  sanitizeUser,

  sanitizeAdmin,

  authError,
};
