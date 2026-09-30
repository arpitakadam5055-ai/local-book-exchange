// ============================================================
// LOCAL BOOK EXCHANGE
// Exchange Controller
// ============================================================

const { query, transaction } = require("../db");

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
// BODY
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

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

// ============================================================
// EXCHANGE SELECT QUERY
// ============================================================

const EXCHANGE_SELECT = `
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
`;

// ============================================================
// CREATE EXCHANGE REQUEST
// ============================================================

async function createExchangeRequest(req, res) {
  try {
    const body = await readBody(req);

    const requestedBookId = body.requestedBookId || body.requested_book_id;

    const offeredBookId = body.offeredBookId || body.offered_book_id;

    const message = String(body.message || "").trim();

    if (!requestedBookId || !offeredBookId) {
      return send(res, 400, {
        success: false,
        message: "Requested book and offered book are required.",
      });
    }

    if (String(requestedBookId) === String(offeredBookId)) {
      return send(res, 400, {
        success: false,
        message: "You cannot exchange a book for itself.",
      });
    }

    const requested = await query(
      `
                SELECT
                    id,
                    user_id,
                    status
                FROM books
                WHERE id = $1
                LIMIT 1
                `,
      [requestedBookId],
    );

    if (requested.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "Requested book was not found.",
      });
    }

    const requestedBook = requested.rows[0];

    if (requestedBook.user_id === req.user.id) {
      return send(res, 400, {
        success: false,
        message: "You cannot request your own book.",
      });
    }

    if (requestedBook.status !== "available") {
      return send(res, 409, {
        success: false,
        message: "Requested book is not currently available.",
      });
    }

    const offered = await query(
      `
                SELECT
                    id,
                    user_id,
                    status
                FROM books
                WHERE id = $1
                LIMIT 1
                `,
      [offeredBookId],
    );

    if (offered.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "Offered book was not found.",
      });
    }

    const offeredBook = offered.rows[0];

    if (offeredBook.user_id !== req.user.id) {
      return send(res, 403, {
        success: false,
        message: "You can only offer one of your own books.",
      });
    }

    if (offeredBook.status !== "available") {
      return send(res, 409, {
        success: false,
        message: "Your offered book is not currently available.",
      });
    }

    const duplicate = await query(
      `
                SELECT id
                FROM exchange_requests
                WHERE
                    requester_id = $1
                    AND requested_book_id = $2
                    AND status = 'pending'
                LIMIT 1
                `,
      [req.user.id, requestedBookId],
    );

    if (duplicate.rows.length > 0) {
      return send(res, 409, {
        success: false,
        message: "You already sent a pending request for this book.",
      });
    }

    const inserted = await query(
      `
                INSERT INTO exchange_requests
                (
                    requester_id,
                    owner_id,
                    requested_book_id,
                    offered_book_id,
                    message,
                    status
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    'pending'
                )
                RETURNING id
                `,
      [
        req.user.id,
        requestedBook.user_id,
        requestedBookId,
        offeredBookId,
        message || null,
      ],
    );

    const exchange = await query(
      `
                ${EXCHANGE_SELECT}

                WHERE
                    e.id = $1

                LIMIT 1
                `,
      [inserted.rows[0].id],
    );

    return send(res, 201, {
      success: true,
      message: "Exchange request sent successfully.",
      exchange: exchange.rows[0],
    });
  } catch (error) {
    console.error("CREATE EXCHANGE ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to send exchange request.",
    });
  }
}

// ============================================================
// INCOMING REQUESTS
// ============================================================

async function getIncomingRequests(req, res) {
  try {
    const result = await query(
      `
                ${EXCHANGE_SELECT}

                WHERE
                    e.owner_id = $1

                ORDER BY
                    e.created_at DESC
                `,
      [req.user.id],
    );

    return send(res, 200, {
      success: true,
      exchanges: result.rows,
      requests: result.rows,
    });
  } catch (error) {
    console.error("INCOMING EXCHANGE ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load exchange requests.",
    });
  }
}

// ============================================================
// MY EXCHANGES
// ============================================================

async function getMyExchanges(req, res) {
  try {
    const result = await query(
      `
                ${EXCHANGE_SELECT}

                WHERE
                    e.requester_id = $1
                    OR e.owner_id = $1

                ORDER BY
                    e.created_at DESC
                `,
      [req.user.id],
    );

    return send(res, 200, {
      success: true,
      exchanges: result.rows,
    });
  } catch (error) {
    console.error("MY EXCHANGES ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load exchanges.",
    });
  }
}

// ============================================================
// EXCHANGE DETAILS
// ============================================================

async function getExchangeById(req, res) {
  try {
    const result = await query(
      `
                ${EXCHANGE_SELECT}

                WHERE
                    e.id = $1
                    AND
                    (
                        e.requester_id = $2
                        OR
                        e.owner_id = $2
                    )

                LIMIT 1
                `,
      [req.params.id, req.user.id],
    );

    if (result.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "Exchange request not found.",
      });
    }

    return send(res, 200, {
      success: true,
      exchange: result.rows[0],
    });
  } catch (error) {
    console.error("EXCHANGE DETAILS ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load exchange details.",
    });
  }
}

// ============================================================
// UPDATE EXCHANGE STATUS
// ============================================================

async function updateExchangeStatus(req, res) {
  try {
    const body = await readBody(req);

    const newStatus = String(body.status || "").toLowerCase();

    const allowedStatuses = ["accepted", "rejected", "completed", "cancelled"];

    if (!allowedStatuses.includes(newStatus)) {
      return send(res, 400, {
        success: false,
        message: "Invalid exchange status.",
      });
    }

    const result = await transaction(async (client) => {
      const current = await client.query(
        `
                            SELECT *
                            FROM exchange_requests
                            WHERE id = $1
                            FOR UPDATE
                            `,
        [req.params.id],
      );

      if (current.rows.length === 0) {
        const error = new Error("Exchange request not found.");

        error.statusCode = 404;

        throw error;
      }

      const exchange = current.rows[0];

      const isRequester = exchange.requester_id === req.user.id;

      const isOwner = exchange.owner_id === req.user.id;

      if (!isRequester && !isOwner) {
        const error = new Error(
          "You do not have permission to update this exchange.",
        );

        error.statusCode = 403;

        throw error;
      }

      // ----------------------------------------
      // VALID TRANSITIONS
      // ----------------------------------------

      if (newStatus === "accepted") {
        if (!isOwner || exchange.status !== "pending") {
          const error = new Error(
            "Only the book owner can accept a pending request.",
          );

          error.statusCode = 400;

          throw error;
        }

        await client.query(
          `
                            UPDATE books
                            SET
                                status = 'reserved',
                                updated_at = NOW()
                            WHERE id IN
                            (
                                $1,
                                $2
                            )
                            `,
          [exchange.requested_book_id, exchange.offered_book_id],
        );

        await client.query(
          `
                            UPDATE exchange_requests
                            SET
                                status = 'rejected',
                                updated_at = NOW()
                            WHERE
                                id <> $1
                                AND status = 'pending'
                                AND
                                (
                                    requested_book_id
                                        IN ($2, $3)
                                    OR
                                    offered_book_id
                                        IN ($2, $3)
                                )
                            `,
          [exchange.id, exchange.requested_book_id, exchange.offered_book_id],
        );
      }

      if (newStatus === "rejected") {
        if (!isOwner || exchange.status !== "pending") {
          const error = new Error(
            "Only the book owner can reject a pending request.",
          );

          error.statusCode = 400;

          throw error;
        }
      }

      if (newStatus === "cancelled") {
        if (!isRequester || exchange.status !== "pending") {
          const error = new Error(
            "Only the requester can cancel a pending request.",
          );

          error.statusCode = 400;

          throw error;
        }
      }

      if (newStatus === "completed") {
        if (exchange.status !== "accepted") {
          const error = new Error(
            "Only an accepted exchange can be completed.",
          );

          error.statusCode = 400;

          throw error;
        }

        await client.query(
          `
                            UPDATE books
                            SET
                                status = 'exchanged',
                                updated_at = NOW()
                            WHERE id IN
                            (
                                $1,
                                $2
                            )
                            `,
          [exchange.requested_book_id, exchange.offered_book_id],
        );
      }

      const updated = await client.query(
        `
                            UPDATE exchange_requests
                            SET
                                status = $1,
                                updated_at = NOW()
                            WHERE id = $2
                            RETURNING *
                            `,
        [newStatus, exchange.id],
      );

      return updated.rows[0];
    });

    return send(res, 200, {
      success: true,
      message: `Exchange ${newStatus} successfully.`,
      exchange: result,
    });
  } catch (error) {
    console.error("UPDATE EXCHANGE ERROR:", error);

    return send(res, error.statusCode || 500, {
      success: false,
      message: error.message || "Unable to update exchange request.",
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createExchangeRequest,

  getIncomingRequests,

  getMyExchanges,

  getExchangeById,

  updateExchangeStatus,
};
