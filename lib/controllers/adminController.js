// ============================================================
// LOCAL BOOK EXCHANGE
// Admin Controller
// ============================================================

const bcrypt = require("bcryptjs");

const { query } = require("../db");

const { sanitizeAdmin } = require("../auth");

// ============================================================
// HELPERS
// ============================================================

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
// ADMIN DASHBOARD
// ============================================================

async function getDashboard(req, res) {
  try {
    const [users, books, exchanges, completed, recentExchanges, recentBooks] =
      await Promise.all([
        query(
          `
                    SELECT COUNT(*)::INTEGER AS total
                    FROM users
                    `,
        ),

        query(
          `
                    SELECT COUNT(*)::INTEGER AS total
                    FROM books
                    `,
        ),

        query(
          `
                    SELECT COUNT(*)::INTEGER AS total
                    FROM exchange_requests
                    `,
        ),

        query(
          `
                    SELECT COUNT(*)::INTEGER AS total
                    FROM exchange_requests
                    WHERE status = 'completed'
                    `,
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

                    ORDER BY
                        e.created_at DESC

                    LIMIT 6
                    `,
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

                    ORDER BY
                        b.created_at DESC

                    LIMIT 5
                    `,
        ),
      ]);

    return send(res, 200, {
      success: true,

      totalUsers: users.rows[0].total,

      totalBooks: books.rows[0].total,

      totalExchanges: exchanges.rows[0].total,

      completedExchanges: completed.rows[0].total,

      recentExchanges: recentExchanges.rows,

      recentBooks: recentBooks.rows,
    });
  } catch (error) {
    console.error("ADMIN DASHBOARD ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load admin dashboard.",
    });
  }
}

// ============================================================
// ADMIN USERS
// ============================================================

async function getUsers(req, res) {
  try {
    const result = await query(
      `
                SELECT
                    u.id,
                    u.full_name,
                    u.email,
                    u.phone,
                    u.location,
                    u.profile_image,
                    u.status,
                    u.created_at,

                    COUNT(b.id)::INTEGER
                        AS book_count

                FROM users u

                LEFT JOIN books b
                    ON b.user_id = u.id

                GROUP BY
                    u.id

                ORDER BY
                    u.created_at DESC
                `,
    );

    return send(res, 200, {
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error("ADMIN USERS ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load users.",
    });
  }
}

// ============================================================
// ADMIN USER DETAILS
// ============================================================

async function getUserById(req, res) {
  try {
    const userId = req.params.id;

    const userResult = await query(
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

    if (userResult.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "User not found.",
      });
    }

    const [books, exchangeCount, wishlistCount, messageCount] =
      await Promise.all([
        query(
          `
                    SELECT
                        b.id,
                        b.title,
                        b.book_condition
                            AS condition,
                        b.status,
                        b.created_at,

                        c.name
                            AS category_name

                    FROM books b

                    LEFT JOIN categories c
                        ON c.id =
                            b.category_id

                    WHERE
                        b.user_id = $1

                    ORDER BY
                        b.created_at DESC
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
                        COUNT(*)::INTEGER
                            AS total
                    FROM messages
                    WHERE
                        (
                            sender_type = 'user'
                            AND sender_id = $1
                        )
                        OR
                        (
                            receiver_type = 'user'
                            AND receiver_id = $1
                        )
                    `,
          [userId],
        ),
      ]);

    return send(res, 200, {
      success: true,

      user: userResult.rows[0],

      books: books.rows,

      bookCount: books.rows.length,

      exchangeCount: exchangeCount.rows[0].total,

      wishlistCount: wishlistCount.rows[0].total,

      messageCount: messageCount.rows[0].total,
    });
  } catch (error) {
    console.error("ADMIN USER DETAILS ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load user details.",
    });
  }
}

// ============================================================
// UPDATE USER STATUS
// ============================================================

async function updateUserStatus(req, res) {
  try {
    const body = await readBody(req);

    const status = String(body.status || "").toLowerCase();

    if (!["active", "inactive", "blocked"].includes(status)) {
      return send(res, 400, {
        success: false,
        message: "Invalid user status.",
      });
    }

    const result = await query(
      `
                UPDATE users

                SET
                    status = $1,
                    updated_at = NOW()

                WHERE id = $2

                RETURNING
                    id,
                    full_name,
                    email,
                    status
                `,
      [status, req.params.id],
    );

    if (result.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "User not found.",
      });
    }

    return send(res, 200, {
      success: true,
      message: "User status updated successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("USER STATUS ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to update user status.",
    });
  }
}

// ============================================================
// DELETE USER
// ============================================================

async function deleteUser(req, res) {
  try {
    const result = await query(
      `
                DELETE FROM users
                WHERE id = $1
                RETURNING id
                `,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "User not found.",
      });
    }

    return send(res, 200, {
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to delete user.",
    });
  }
}

// ============================================================
// ADMIN BOOKS
// ============================================================

async function getBooks(req, res) {
  try {
    const result = await query(
      `
                SELECT
                    b.id,
                    b.user_id,
                    b.category_id,
                    b.title,
                    b.author,
                    b.book_condition
                        AS condition,
                    b.language,
                    b.publication_year,
                    b.description,
                    b.image_url,
                    b.status,
                    b.created_at,
                    b.updated_at,

                    c.name
                        AS category_name,

                    u.full_name
                        AS owner_name,

                    u.location
                        AS owner_location

                FROM books b

                JOIN users u
                    ON u.id =
                        b.user_id

                LEFT JOIN categories c
                    ON c.id =
                        b.category_id

                ORDER BY
                    b.created_at DESC
                `,
    );

    return send(res, 200, {
      success: true,
      books: result.rows,
    });
  } catch (error) {
    console.error("ADMIN BOOKS ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load books.",
    });
  }
}

// ============================================================
// ADMIN BOOK DETAILS
// ============================================================

async function getBookById(req, res) {
  try {
    const result = await query(
      `
                SELECT
                    b.id,
                    b.user_id,
                    b.category_id,
                    b.title,
                    b.author,
                    b.book_condition
                        AS condition,
                    b.language,
                    b.publication_year,
                    b.description,
                    b.image_url,
                    b.status,
                    b.created_at,
                    b.updated_at,

                    c.name
                        AS category_name,

                    u.full_name
                        AS owner_name,

                    u.location
                        AS owner_location,

                    u.location

                FROM books b

                JOIN users u
                    ON u.id =
                        b.user_id

                LEFT JOIN categories c
                    ON c.id =
                        b.category_id

                WHERE
                    b.id = $1

                LIMIT 1
                `,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "Book not found.",
      });
    }

    return send(res, 200, {
      success: true,
      book: result.rows[0],
    });
  } catch (error) {
    console.error("ADMIN BOOK DETAILS ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load book details.",
    });
  }
}

// ============================================================
// UPDATE BOOK STATUS
// ============================================================

async function updateBookStatus(req, res) {
  try {
    const body = await readBody(req);

    const status = String(body.status || "").toLowerCase();

    const allowed = ["available", "reserved", "exchanged", "inactive"];

    if (!allowed.includes(status)) {
      return send(res, 400, {
        success: false,
        message: "Invalid book status.",
      });
    }

    const result = await query(
      `
                UPDATE books

                SET
                    status = $1,
                    updated_at = NOW()

                WHERE id = $2

                RETURNING *
                `,
      [status, req.params.id],
    );

    if (result.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "Book not found.",
      });
    }

    return send(res, 200, {
      success: true,
      message: "Book status updated successfully.",
      book: result.rows[0],
    });
  } catch (error) {
    console.error("ADMIN BOOK STATUS ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to update book status.",
    });
  }
}

// ============================================================
// DELETE BOOK
// ============================================================

async function deleteBook(req, res) {
  try {
    const active = await query(
      `
                SELECT id
                FROM exchange_requests
                WHERE
                    (
                        requested_book_id = $1
                        OR offered_book_id = $1
                    )
                    AND status IN
                    (
                        'pending',
                        'accepted'
                    )
                LIMIT 1
                `,
      [req.params.id],
    );

    if (active.rows.length > 0) {
      return send(res, 409, {
        success: false,
        message: "This book cannot be deleted while it has an active exchange.",
      });
    }

    const result = await query(
      `
                DELETE FROM books
                WHERE id = $1
                RETURNING id
                `,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "Book not found.",
      });
    }

    return send(res, 200, {
      success: true,
      message: "Book deleted successfully.",
    });
  } catch (error) {
    console.error("ADMIN DELETE BOOK ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to delete book.",
    });
  }
}

// ============================================================
// ADMIN EXCHANGES
// ============================================================

async function getExchanges(req, res) {
  try {
    const result = await query(
      `
                SELECT
                    e.id,
                    e.requester_id,
                    e.owner_id,
                    e.requested_book_id,
                    e.offered_book_id,
                    e.message,
                    e.status,
                    e.created_at,
                    e.updated_at,

                    requester.full_name
                        AS requester_name,

                    owner.full_name
                        AS owner_name,

                    requested.title
                        AS requested_book_title,

                    offered.title
                        AS offered_book_title

                FROM exchange_requests e

                JOIN users requester
                    ON requester.id =
                        e.requester_id

                JOIN users owner
                    ON owner.id =
                        e.owner_id

                JOIN books requested
                    ON requested.id =
                        e.requested_book_id

                JOIN books offered
                    ON offered.id =
                        e.offered_book_id

                ORDER BY
                    e.created_at DESC
                `,
    );

    return send(res, 200, {
      success: true,
      exchanges: result.rows,
    });
  } catch (error) {
    console.error("ADMIN EXCHANGES ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load exchange requests.",
    });
  }
}

// ============================================================
// ADMIN REPORTS
// ============================================================

async function getReports(req, res) {
  try {
    const [
      users,
      books,
      completed,
      pending,
      categories,
      messages,
      summary,
      popular,
    ] = await Promise.all([
      query(
        `
                    SELECT COUNT(*)::INTEGER AS total
                    FROM users
                    `,
      ),

      query(
        `
                    SELECT COUNT(*)::INTEGER AS total
                    FROM books
                    `,
      ),

      query(
        `
                    SELECT COUNT(*)::INTEGER AS total
                    FROM exchange_requests
                    WHERE status = 'completed'
                    `,
      ),

      query(
        `
                    SELECT COUNT(*)::INTEGER AS total
                    FROM exchange_requests
                    WHERE status = 'pending'
                    `,
      ),

      query(
        `
                    SELECT COUNT(*)::INTEGER AS total
                    FROM categories
                    `,
      ),

      query(
        `
                    SELECT COUNT(*)::INTEGER AS total
                    FROM messages
                    `,
      ),

      query(
        `
                    SELECT
                        COUNT(*)
                            FILTER
                            (
                                WHERE status = 'pending'
                            )::INTEGER
                            AS pending,

                        COUNT(*)
                            FILTER
                            (
                                WHERE status = 'accepted'
                            )::INTEGER
                            AS accepted,

                        COUNT(*)
                            FILTER
                            (
                                WHERE status = 'completed'
                            )::INTEGER
                            AS completed,

                        COUNT(*)
                            FILTER
                            (
                                WHERE status = 'rejected'
                            )::INTEGER
                            AS rejected

                    FROM exchange_requests
                    `,
      ),

      query(
        `
                    SELECT
                        c.id,
                        c.name,

                        COUNT(
                            DISTINCT b.id
                        )::INTEGER
                            AS book_count,

                        COUNT(
                            DISTINCT e.id
                        )::INTEGER
                            AS exchange_count

                    FROM categories c

                    LEFT JOIN books b
                        ON b.category_id =
                            c.id

                    LEFT JOIN exchange_requests e
                        ON e.requested_book_id =
                            b.id

                    GROUP BY
                        c.id,
                        c.name

                    ORDER BY
                        exchange_count DESC,
                        book_count DESC,
                        c.name ASC

                    LIMIT 10
                    `,
      ),
    ]);

    return send(res, 200, {
      success: true,

      totalUsers: users.rows[0].total,

      totalBooks: books.rows[0].total,

      completedExchanges: completed.rows[0].total,

      pendingExchanges: pending.rows[0].total,

      totalCategories: categories.rows[0].total,

      totalMessages: messages.rows[0].total,

      exchangeSummary: summary.rows[0],

      popularCategories: popular.rows,
    });
  } catch (error) {
    console.error("ADMIN REPORT ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to generate reports.",
    });
  }
}

// ============================================================
// ADMIN CONVERSATIONS
// ============================================================

async function getConversations(req, res) {
  try {
    const result = await query(
      `
                WITH admin_messages AS
                (
                    SELECT
                        CASE

                            WHEN
                                sender_type = 'admin'
                                AND sender_id = $1

                            THEN receiver_id

                            ELSE sender_id

                        END
                            AS user_id,

                        message,

                        created_at

                    FROM messages

                    WHERE
                        (
                            sender_type = 'admin'
                            AND sender_id = $1
                            AND receiver_type = 'user'
                        )
                        OR
                        (
                            receiver_type = 'admin'
                            AND receiver_id = $1
                            AND sender_type = 'user'
                        )
                ),

                ranked AS
                (
                    SELECT
                        *,

                        ROW_NUMBER()
                        OVER
                        (
                            PARTITION BY
                                user_id

                            ORDER BY
                                created_at DESC
                        )
                            AS rn

                    FROM admin_messages
                )

                SELECT
                    u.id
                        AS user_id,

                    u.full_name
                        AS user_name,

                    u.profile_image,

                    r.message
                        AS last_message,

                    r.created_at
                        AS last_message_at

                FROM ranked r

                JOIN users u
                    ON u.id =
                        r.user_id

                WHERE
                    r.rn = 1

                ORDER BY
                    r.created_at DESC
                `,
      [req.user.id],
    );

    return send(res, 200, {
      success: true,
      conversations: result.rows,
    });
  } catch (error) {
    console.error("ADMIN CONVERSATIONS ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load conversations.",
    });
  }
}

// ============================================================
// ADMIN MESSAGES WITH USER
// ============================================================

async function getMessages(req, res) {
  try {
    const userId = req.params.userId;

    const userResult = await query(
      `
                SELECT
                    id,
                    full_name,
                    profile_image
                FROM users
                WHERE id = $1
                LIMIT 1
                `,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "User not found.",
      });
    }

    const result = await query(
      `
                SELECT
                    id,
                    sender_type,
                    sender_id,
                    receiver_type,
                    receiver_id,
                    message,
                    created_at,

                    CASE
                        WHEN sender_type = 'admin'
                        THEN TRUE
                        ELSE FALSE
                    END
                        AS is_admin,

                    sender_type
                        AS sender_role

                FROM messages

                WHERE
                    (
                        sender_type = 'admin'
                        AND sender_id = $1
                        AND receiver_type = 'user'
                        AND receiver_id = $2
                    )
                    OR
                    (
                        sender_type = 'user'
                        AND sender_id = $2
                        AND receiver_type = 'admin'
                        AND receiver_id = $1
                    )

                ORDER BY
                    created_at ASC
                `,
      [req.user.id, userId],
    );

    return send(res, 200, {
      success: true,

      user: {
        id: userResult.rows[0].id,

        name: userResult.rows[0].full_name,

        full_name: userResult.rows[0].full_name,

        profile_image: userResult.rows[0].profile_image,
      },

      messages: result.rows,
    });
  } catch (error) {
    console.error("ADMIN GET MESSAGES ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load messages.",
    });
  }
}

// ============================================================
// ADMIN SEND MESSAGE
// ============================================================

async function sendMessage(req, res) {
  try {
    const body = await readBody(req);

    const userId = body.userId || body.user_id;

    const message = String(body.message || "").trim();

    if (!userId || !message) {
      return send(res, 400, {
        success: false,
        message: "User and message are required.",
      });
    }

    const user = await query(
      `
                SELECT id
                FROM users
                WHERE id = $1
                LIMIT 1
                `,
      [userId],
    );

    if (user.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "User not found.",
      });
    }

    const result = await query(
      `
                INSERT INTO messages
                (
                    sender_type,
                    sender_id,
                    receiver_type,
                    receiver_id,
                    message
                )
                VALUES
                (
                    'admin',
                    $1,
                    'user',
                    $2,
                    $3
                )
                RETURNING *
                `,
      [req.user.id, userId, message],
    );

    return send(res, 201, {
      success: true,
      message: "Message sent successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("ADMIN SEND MESSAGE ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to send message.",
    });
  }
}

// ============================================================
// ADMIN PROFILE
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
                    status,
                    last_login,
                    created_at,
                    updated_at

                FROM admins

                WHERE id = $1

                LIMIT 1
                `,
      [req.user.id],
    );

    return send(res, 200, {
      success: true,
      admin: sanitizeAdmin(result.rows[0]),
    });
  } catch (error) {
    console.error("ADMIN PROFILE ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load administrator profile.",
    });
  }
}

// ============================================================
// UPDATE ADMIN PROFILE
// ============================================================

async function updateProfile(req, res) {
  try {
    const body = await readBody(req);

    const fullName = String(body.fullName || body.full_name || "").trim();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const phone = String(body.phone || "").trim();

    if (!fullName || !email) {
      return send(res, 400, {
        success: false,
        message: "Name and email are required.",
      });
    }

    const result = await query(
      `
                UPDATE admins

                SET
                    full_name = $1,
                    email = $2,
                    phone = $3,
                    updated_at = NOW()

                WHERE id = $4

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
      [fullName, email, phone || null, req.user.id],
    );

    return send(res, 200, {
      success: true,
      message: "Administrator profile updated successfully.",
      admin: sanitizeAdmin(result.rows[0]),
    });
  } catch (error) {
    if (error.code === "23505") {
      return send(res, 409, {
        success: false,
        message: "This email address is already in use.",
      });
    }

    console.error("ADMIN UPDATE PROFILE ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to update administrator profile.",
    });
  }
}

// ============================================================
// CHANGE ADMIN PASSWORD
// ============================================================

async function changePassword(req, res) {
  try {
    const body = await readBody(req);

    const currentPassword = String(body.currentPassword || "");

    const newPassword = String(body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return send(res, 400, {
        success: false,
        message: "Current password and new password are required.",
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
                FROM admins
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
            UPDATE admins

            SET
                password_hash = $1,
                updated_at = NOW()

            WHERE id = $2
            `,
      [hash, req.user.id],
    );

    return send(res, 200, {
      success: true,
      message: "Administrator password changed successfully.",
    });
  } catch (error) {
    console.error("ADMIN PASSWORD ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to change administrator password.",
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getDashboard,

  getUsers,

  getUserById,

  updateUserStatus,

  deleteUser,

  getBooks,

  getBookById,

  updateBookStatus,

  deleteBook,

  getExchanges,

  getReports,

  getConversations,

  getMessages,

  sendMessage,

  getProfile,

  updateProfile,

  changePassword,
};
