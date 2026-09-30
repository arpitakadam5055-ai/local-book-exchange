// ============================================================
// LOCAL BOOK EXCHANGE
// Wishlist Controller
// ============================================================

const { query } = require("../db");

function send(res, status, data) {
  if (res.headersSent) {
    return;
  }

  res.statusCode = status;

  res.setHeader("Content-Type", "application/json");

  res.end(JSON.stringify(data));
}

// ============================================================
// GET WISHLIST
// ============================================================

async function getWishlist(req, res) {
  try {
    const result = await query(
      `
                SELECT
                    b.id,
                    b.user_id,
                    b.category_id,
                    b.title,
                    b.author,
                    b.book_condition AS condition,
                    b.language,
                    b.publication_year,
                    b.description,
                    b.image_url,
                    b.status,
                    b.created_at,

                    c.name
                        AS category_name,

                    u.full_name
                        AS owner_name,

                    u.location
                        AS owner_location

                FROM wishlist w

                JOIN books b
                    ON b.id = w.book_id

                JOIN users u
                    ON u.id = b.user_id

                LEFT JOIN categories c
                    ON c.id = b.category_id

                WHERE
                    w.user_id = $1

                ORDER BY
                    w.created_at DESC
                `,
      [req.user.id],
    );

    return send(res, 200, {
      success: true,
      books: result.rows,
      wishlist: result.rows,
    });
  } catch (error) {
    console.error("GET WISHLIST ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load wishlist.",
    });
  }
}

// ============================================================
// ADD TO WISHLIST
// ============================================================

async function addToWishlist(req, res) {
  try {
    const bookId = req.params.bookId;

    const book = await query(
      `
                SELECT
                    id,
                    user_id,
                    status
                FROM books
                WHERE id = $1
                LIMIT 1
                `,
      [bookId],
    );

    if (book.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "Book not found.",
      });
    }

    if (book.rows[0].user_id === req.user.id) {
      return send(res, 400, {
        success: false,
        message: "You cannot add your own book to your wishlist.",
      });
    }

    await query(
      `
            INSERT INTO wishlist
            (
                user_id,
                book_id
            )
            VALUES
            (
                $1,
                $2
            )
            ON CONFLICT
            (
                user_id,
                book_id
            )
            DO NOTHING
            `,
      [req.user.id, bookId],
    );

    return send(res, 200, {
      success: true,
      message: "Book added to wishlist.",
    });
  } catch (error) {
    console.error("ADD WISHLIST ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to add book to wishlist.",
    });
  }
}

// ============================================================
// REMOVE FROM WISHLIST
// ============================================================

async function removeFromWishlist(req, res) {
  try {
    await query(
      `
            DELETE FROM wishlist
            WHERE
                user_id = $1
                AND book_id = $2
            `,
      [req.user.id, req.params.bookId],
    );

    return send(res, 200, {
      success: true,
      message: "Book removed from wishlist.",
    });
  } catch (error) {
    console.error("REMOVE WISHLIST ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to remove book from wishlist.",
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getWishlist,

  addToWishlist,

  removeFromWishlist,
};
