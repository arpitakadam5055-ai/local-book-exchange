// ============================================================
// LOCAL BOOK EXCHANGE
// Category Controller
// ============================================================

const { query } = require("../db");

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
// GET CATEGORIES
// ============================================================

async function getCategories(req, res) {
  try {
    const result = await query(
      `
                SELECT
                    c.id,
                    c.name,
                    c.description,
                    c.status,
                    c.created_at,
                    c.updated_at,

                    COUNT(b.id)::INTEGER
                        AS book_count

                FROM categories c

                LEFT JOIN books b
                    ON b.category_id = c.id

                GROUP BY
                    c.id

                ORDER BY
                    c.name ASC
                `,
    );

    return send(res, 200, {
      success: true,
      categories: result.rows,
    });
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load categories.",
    });
  }
}

// ============================================================
// CREATE CATEGORY
// ============================================================

async function createCategory(req, res) {
  try {
    const body = await readBody(req);

    const name = String(body.name || "").trim();

    const description = String(body.description || "").trim();

    const status = String(body.status || "active").toLowerCase();

    if (!name) {
      return send(res, 400, {
        success: false,
        message: "Category name is required.",
      });
    }

    if (!["active", "inactive"].includes(status)) {
      return send(res, 400, {
        success: false,
        message: "Invalid category status.",
      });
    }

    const result = await query(
      `
                INSERT INTO categories
                (
                    name,
                    description,
                    status
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                RETURNING *
                `,
      [name, description || null, status],
    );

    return send(res, 201, {
      success: true,
      message: "Category created successfully.",
      category: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return send(res, 409, {
        success: false,
        message: "This category already exists.",
      });
    }

    console.error("CREATE CATEGORY ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to create category.",
    });
  }
}

// ============================================================
// UPDATE CATEGORY
// ============================================================

async function updateCategory(req, res) {
  try {
    const body = await readBody(req);

    const name = String(body.name || "").trim();

    const description = String(body.description || "").trim();

    const status = String(body.status || "active").toLowerCase();

    if (!name) {
      return send(res, 400, {
        success: false,
        message: "Category name is required.",
      });
    }

    const result = await query(
      `
                UPDATE categories
                SET
                    name = $1,
                    description = $2,
                    status = $3,
                    updated_at = NOW()

                WHERE id = $4

                RETURNING *
                `,
      [name, description || null, status, req.params.id],
    );

    if (result.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "Category not found.",
      });
    }

    return send(res, 200, {
      success: true,
      message: "Category updated successfully.",
      category: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return send(res, 409, {
        success: false,
        message: "A category with this name already exists.",
      });
    }

    console.error("UPDATE CATEGORY ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to update category.",
    });
  }
}

// ============================================================
// DELETE CATEGORY
// ============================================================

async function deleteCategory(req, res) {
  try {
    const books = await query(
      `
                SELECT COUNT(*)::INTEGER
                    AS total
                FROM books
                WHERE category_id = $1
                `,
      [req.params.id],
    );

    if (books.rows[0].total > 0) {
      return send(res, 409, {
        success: false,
        message:
          "This category cannot be deleted because books are using it. Set it to inactive instead.",
      });
    }

    const result = await query(
      `
                DELETE FROM categories
                WHERE id = $1
                RETURNING id
                `,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "Category not found.",
      });
    }

    return send(res, 200, {
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to delete category.",
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getCategories,

  createCategory,

  updateCategory,

  deleteCategory,
};
