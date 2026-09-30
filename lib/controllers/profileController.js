// ============================================================
// LOCAL BOOK EXCHANGE
// User Profile + Dashboard Controller
// ============================================================

const bcrypt = require("bcryptjs");

const { query } = require("../db");

const { sanitizeUser } = require("../auth");

function send(res, status, data) {
  if (res.headersSent) {
    return;
  }

  res.statusCode = status;

  res.setHeader("Content-Type", "application/json");

  res.end(JSON.stringify(data));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

// ============================================================
// GET PROFILE
// ============================================================

async function getProfile(req, res) {
  try {
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
      [req.user.id],
    );

    return send(res, 200, {
      success: true,
      user: sanitizeUser(result.rows[0]),
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load profile.",
    });
  }
}

// ============================================================
// UPDATE PROFILE
// ============================================================

async function updateProfile(req, res) {
  try {
    const body = await readBody(req);

    const fullName = String(body.fullName || body.full_name || "").trim();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const phone = String(body.phone || "").trim();

    const location = String(body.location || "").trim();

    const bio = String(body.bio || "").trim();

    if (!fullName || !email || !location) {
      return send(res, 400, {
        success: false,
        message: "Name, email and location are required.",
      });
    }

    const result = await query(
      `
                UPDATE users

                SET
                    full_name = $1,
                    email = $2,
                    phone = $3,
                    location = $4,
                    bio = $5,
                    updated_at = NOW()

                WHERE id = $6

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
      [fullName, email, phone || null, location, bio || null, req.user.id],
    );

    return send(res, 200, {
      success: true,
      message: "Profile updated successfully.",
      user: sanitizeUser(result.rows[0]),
    });
  } catch (error) {
    if (error.code === "23505") {
      return send(res, 409, {
        success: false,
        message: "This email address is already in use.",
      });
    }

    console.error("UPDATE PROFILE ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to update profile.",
    });
  }
}

// ============================================================
// CHANGE PASSWORD
// ============================================================

async function changePassword(req, res) {
  try {
    const body = await readBody(req);

    const currentPassword = String(body.currentPassword || "");

    const newPassword = String(body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return send(res, 400, {
        success: false,
        message: "Current and new passwords are required.",
      });
    }

    if (newPassword.length < 6) {
      return send(res, 400, {
        success: false,
        message: "New password must contain at least 6 characters.",
      });
    }

    const result = await query(
      `
                SELECT password_hash
                FROM users
                WHERE id = $1
                LIMIT 1
                `,
      [req.user.id],
    );

    const valid = await bcrypt.compare(
      currentPassword,
      result.rows[0].password_hash,
    );

    if (!valid) {
      return send(res, 400, {
        success: false,
        message: "Current password is incorrect.",
      });
    }

    const hash = await bcrypt.hash(newPassword, 12);

    await query(
      `
            UPDATE users

            SET
                password_hash = $1,
                updated_at = NOW()

            WHERE id = $2
            `,
      [hash, req.user.id],
    );

    return send(res, 200, {
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("PASSWORD ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to change password.",
    });
  }
}

// ============================================================
// USER DASHBOARD
// ============================================================

async function getDashboard(req, res) {
  try {
    const userId = req.user.id;

    const [
      bookCount,
      incomingCount,
      exchangeCount,
      wishlistCount,
      recentBooks,
      recentRequests,
      recommendedBooks,
    ] = await Promise.all([
      query(
        `
                    SELECT
                        COUNT(*)::INTEGER
                            AS total
                    FROM books
                    WHERE user_id = $1
                    `,
        [userId],
      ),

      query(
        `
                    SELECT
                        COUNT(*)::INTEGER
                            AS total
                    FROM exchange_requests
                    WHERE
                        owner_id = $1
                        AND status = 'pending'
                    `,
        [userId],
      ),

      query(
        `
                    SELECT
                        COUNT(*)::INTEGER
                            AS total
                    FROM exchange_requests
                    WHERE
                        requester_id = $1
                        OR owner_id = $1
                    `,
        [userId],
      ),

      query(
        `
                    SELECT
                        COUNT(*)::INTEGER
                            AS total
                    FROM wishlist
                    WHERE user_id = $1
                    `,
        [userId],
      ),

      query(
        `
                    SELECT
                        b.id,
                        b.title,
                        b.author,
                        b.image_url,
                        b.status,
                        b.created_at

                    FROM books b

                    WHERE
                        b.user_id = $1

                    ORDER BY
                        b.created_at DESC

                    LIMIT 5
                    `,
        [userId],
      ),

      query(
        `
                    SELECT
                        e.id,
                        e.status,
                        e.created_at,

                        requester.full_name
                            AS requester_name,

                        requested.title
                            AS requested_book_title

                    FROM exchange_requests e

                    JOIN users requester
                        ON requester.id =
                            e.requester_id

                    JOIN books requested
                        ON requested.id =
                            e.requested_book_id

                    WHERE
                        e.owner_id = $1

                    ORDER BY
                        e.created_at DESC

                    LIMIT 5
                    `,
        [userId],
      ),

      query(
        `
                    SELECT
                        b.id,
                        b.user_id,
                        b.category_id,
                        b.title,
                        b.author,
                        b.book_condition
                            AS condition,
                        b.image_url,
                        b.status,
                        b.created_at,

                        c.name
                            AS category_name,

                        u.full_name
                            AS owner_name,

                        u.location

                    FROM books b

                    JOIN users u
                        ON u.id = b.user_id

                    LEFT JOIN categories c
                        ON c.id = b.category_id

                    WHERE
                        b.status = 'available'
                        AND b.user_id <> $1
                        AND u.status = 'active'

                    ORDER BY
                        b.created_at DESC

                    LIMIT 4
                    `,
        [userId],
      ),
    ]);

    return send(res, 200, {
      success: true,

      user: sanitizeUser(req.user),

      totalBooks: bookCount.rows[0].total,

      incomingRequests: incomingCount.rows[0].total,

      totalExchanges: exchangeCount.rows[0].total,

      wishlistCount: wishlistCount.rows[0].total,

      recentBooks: recentBooks.rows,

      recentRequests: recentRequests.rows,

      recommendedBooks: recommendedBooks.rows,
    });
  } catch (error) {
    console.error("DASHBOARD ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load dashboard.",
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getProfile,

  updateProfile,

  changePassword,

  getDashboard,
};
