// ============================================================
// LOCAL BOOK EXCHANGE
// Book Controller
// ============================================================

const { query } = require("../db");

// ============================================================
// RESPONSE
// ============================================================

function send(res, status, data) {
  if (res.headersSent) {
    return;
  }

  res.statusCode = status;

  res.setHeader("Content-Type", "application/json");

  res.end(JSON.stringify(data));
}

// ============================================================
// RAW BODY
// ============================================================

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    return Buffer.from(req.body);
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

// ============================================================
// SIMPLE MULTIPART PARSER
// ============================================================

function parseMultipart(buffer, contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);

  if (!boundaryMatch) {
    throw new Error("Invalid multipart request.");
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2];

  const raw = buffer.toString("latin1");

  const sections = raw.split(`--${boundary}`);

  const fields = {};

  const files = {};

  for (let section of sections) {
    if (!section || section === "--\r\n" || section === "--") {
      continue;
    }

    if (section.startsWith("\r\n")) {
      section = section.slice(2);
    }

    if (section.endsWith("\r\n")) {
      section = section.slice(0, -2);
    }

    if (section.endsWith("--")) {
      section = section.slice(0, -2);
    }

    const headerEnd = section.indexOf("\r\n\r\n");

    if (headerEnd === -1) {
      continue;
    }

    const headers = section.slice(0, headerEnd);

    let body = section.slice(headerEnd + 4);

    if (body.endsWith("\r\n")) {
      body = body.slice(0, -2);
    }

    const nameMatch = headers.match(/name="([^"]+)"/);

    if (!nameMatch) {
      continue;
    }

    const fieldName = nameMatch[1];

    const fileMatch = headers.match(/filename="([^"]*)"/);

    if (fileMatch) {
      const filename = fileMatch[1];

      if (!filename) {
        continue;
      }

      const typeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);

      const mimeType = typeMatch
        ? typeMatch[1].trim()
        : "application/octet-stream";

      const fileBuffer = Buffer.from(body, "latin1");

      files[fieldName] = {
        filename,

        mimeType,

        buffer: fileBuffer,
      };
    } else {
      fields[fieldName] = Buffer.from(body, "latin1").toString("utf8");
    }
  }

  return {
    fields,
    files,
  };
}

// ============================================================
// READ REQUEST DATA
// ============================================================

async function readRequestData(req) {
  const contentType = String(req.headers["content-type"] || "");

  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return {
      fields: req.body,
      files: {},
    };
  }

  const buffer = await readRawBody(req);

  if (contentType.includes("multipart/form-data")) {
    return parseMultipart(buffer, contentType);
  }

  if (buffer.length === 0) {
    return {
      fields: {},
      files: {},
    };
  }

  return {
    fields: JSON.parse(buffer.toString("utf8")),
    files: {},
  };
}

// ============================================================
// GET ALL AVAILABLE BOOKS
// ============================================================

async function getAllBooks(req, res) {
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
                    b.updated_at,

                    c.name AS category_name,

                    u.full_name AS owner_name,
                    u.location AS owner_location,
                    u.location

                FROM books b

                JOIN users u
                    ON u.id = b.user_id

                LEFT JOIN categories c
                    ON c.id = b.category_id

                WHERE
                    b.status = 'available'
                    AND u.status = 'active'
                    AND (
                        c.id IS NULL
                        OR c.status = 'active'
                    )

                ORDER BY
                    b.created_at DESC
                `,
    );

    return send(res, 200, {
      success: true,
      books: result.rows,
    });
  } catch (error) {
    console.error("GET BOOKS ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load books.",
    });
  }
}

// ============================================================
// MY BOOKS
// ============================================================

async function getMyBooks(req, res) {
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
                    b.updated_at,

                    c.name AS category_name

                FROM books b

                LEFT JOIN categories c
                    ON c.id = b.category_id

                WHERE
                    b.user_id = $1

                ORDER BY
                    b.created_at DESC
                `,
      [req.user.id],
    );

    return send(res, 200, {
      success: true,
      books: result.rows,
    });
  } catch (error) {
    console.error("MY BOOKS ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load your books.",
    });
  }
}

// ============================================================
// BOOK DETAILS
// ============================================================

async function getBookById(req, res) {
  try {
    const bookId = req.params.id;

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
                    b.updated_at,

                    c.name AS category_name,

                    u.full_name AS owner_name,
                    u.location AS owner_location,
                    u.location

                FROM books b

                JOIN users u
                    ON u.id = b.user_id

                LEFT JOIN categories c
                    ON c.id = b.category_id

                WHERE
                    b.id = $1

                LIMIT 1
                `,
      [bookId],
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
    console.error("BOOK DETAILS ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load book details.",
    });
  }
}

// ============================================================
// CREATE BOOK
// ============================================================

async function createBook(req, res) {
  try {
    const { fields, files } = await readRequestData(req);

    const title = String(fields.title || "").trim();

    const author = String(fields.author || "").trim();

    const categoryId = fields.categoryId || fields.category_id || null;

    const condition = String(fields.condition || "").trim();

    const language = String(fields.language || "").trim();

    const publicationYear =
      fields.publicationYear || fields.publication_year || null;

    const description = String(fields.description || "").trim();

    if (!title || !author || !categoryId || !condition || !description) {
      return send(res, 400, {
        success: false,
        message:
          "Title, author, category, condition and description are required.",
      });
    }

    // ----------------------------------------------------
    // CATEGORY CHECK
    // ----------------------------------------------------

    const category = await query(
      `
                SELECT id
                FROM categories
                WHERE
                    id = $1
                    AND status = 'active'
                LIMIT 1
                `,
      [categoryId],
    );

    if (category.rows.length === 0) {
      return send(res, 400, {
        success: false,
        message: "Invalid book category.",
      });
    }

    // ----------------------------------------------------
    // IMAGE
    // ----------------------------------------------------

    let imageUrl = null;

    const imageFile = files.bookImage || files.image;

    if (imageFile) {
      if (!imageFile.mimeType.startsWith("image/")) {
        return send(res, 400, {
          success: false,
          message: "Only image files are allowed.",
        });
      }

      const maxSize = 2 * 1024 * 1024;

      if (imageFile.buffer.length > maxSize) {
        return send(res, 400, {
          success: false,
          message: "Book image must be smaller than 2 MB.",
        });
      }

      imageUrl =
        `data:${imageFile.mimeType};base64,` +
        imageFile.buffer.toString("base64");
    }

    // ----------------------------------------------------
    // INSERT
    // ----------------------------------------------------

    const result = await query(
      `
                INSERT INTO books
                (
                    user_id,
                    category_id,
                    title,
                    author,
                    book_condition,
                    language,
                    publication_year,
                    description,
                    image_url,
                    status
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    'available'
                )
                RETURNING *
                `,
      [
        req.user.id,
        categoryId,
        title,
        author,
        condition,
        language || null,
        publicationYear || null,
        description,
        imageUrl,
      ],
    );

    return send(res, 201, {
      success: true,
      message: "Book added successfully.",
      book: result.rows[0],
    });
  } catch (error) {
    console.error("CREATE BOOK ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to add book.",
    });
  }
}

// ============================================================
// UPDATE BOOK
// ============================================================

async function updateBook(req, res) {
  try {
    const { fields } = await readRequestData(req);

    const bookId = req.params.id;

    const existing = await query(
      `
                SELECT *
                FROM books
                WHERE
                    id = $1
                    AND user_id = $2
                LIMIT 1
                `,
      [bookId, req.user.id],
    );

    if (existing.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "Book not found.",
      });
    }

    const book = existing.rows[0];

    const result = await query(
      `
                UPDATE books
                SET
                    category_id = $1,
                    title = $2,
                    author = $3,
                    book_condition = $4,
                    language = $5,
                    publication_year = $6,
                    description = $7,
                    updated_at = NOW()

                WHERE
                    id = $8
                    AND user_id = $9

                RETURNING *
                `,
      [
        fields.categoryId || fields.category_id || book.category_id,

        fields.title || book.title,

        fields.author || book.author,

        fields.condition || book.book_condition,

        fields.language ?? book.language,

        fields.publicationYear ||
          fields.publication_year ||
          book.publication_year,

        fields.description || book.description,

        bookId,

        req.user.id,
      ],
    );

    return send(res, 200, {
      success: true,
      message: "Book updated successfully.",
      book: result.rows[0],
    });
  } catch (error) {
    console.error("UPDATE BOOK ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to update book.",
    });
  }
}

// ============================================================
// DELETE BOOK
// ============================================================

async function deleteBook(req, res) {
  try {
    const bookId = req.params.id;

    const activeExchange = await query(
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
      [bookId],
    );

    if (activeExchange.rows.length > 0) {
      return send(res, 409, {
        success: false,
        message: "This book is part of an active exchange request.",
      });
    }

    const result = await query(
      `
                DELETE FROM books
                WHERE
                    id = $1
                    AND user_id = $2
                RETURNING id
                `,
      [bookId, req.user.id],
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
    console.error("DELETE BOOK ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to delete book.",
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getAllBooks,

  getMyBooks,

  getBookById,

  createBook,

  updateBook,

  deleteBook,
};
