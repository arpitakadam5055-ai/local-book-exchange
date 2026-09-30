// ============================================================
// LOCAL BOOK EXCHANGE
// User Messaging Controller
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
// CONVERSATION LIST
// ============================================================

async function getConversations(req, res) {
  try {
    const result = await query(
      `
                WITH conversation_messages AS
                (
                    SELECT
                        CASE
                            WHEN
                                sender_type = 'user'
                                AND sender_id = $1
                            THEN receiver_id

                            ELSE sender_id
                        END
                            AS other_user_id,

                        message,

                        created_at

                    FROM messages

                    WHERE
                        (
                            sender_type = 'user'
                            AND sender_id = $1
                            AND receiver_type = 'user'
                        )
                        OR
                        (
                            receiver_type = 'user'
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
                                other_user_id

                            ORDER BY
                                created_at DESC
                        )
                            AS rn

                    FROM conversation_messages
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
                        r.other_user_id

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
    console.error("CONVERSATIONS ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load conversations.",
    });
  }
}

// ============================================================
// GET MESSAGES WITH USER
// ============================================================

async function getMessages(req, res) {
  try {
    const otherUserId = req.params.userId;

    if (String(otherUserId) === String(req.user.id)) {
      return send(res, 400, {
        success: false,
        message: "Invalid conversation.",
      });
    }

    const userResult = await query(
      `
                SELECT
                    id,
                    full_name,
                    profile_image
                FROM users
                WHERE
                    id = $1
                    AND status = 'active'
                LIMIT 1
                `,
      [otherUserId],
    );

    if (userResult.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "User not found.",
      });
    }

    const messages = await query(
      `
                SELECT
                    id,
                    sender_type,
                    sender_id,
                    receiver_type,
                    receiver_id,
                    message,
                    created_at

                FROM messages

                WHERE
                    (
                        sender_type = 'user'
                        AND sender_id = $1
                        AND receiver_type = 'user'
                        AND receiver_id = $2
                    )
                    OR
                    (
                        sender_type = 'user'
                        AND sender_id = $2
                        AND receiver_type = 'user'
                        AND receiver_id = $1
                    )

                ORDER BY
                    created_at ASC
                `,
      [req.user.id, otherUserId],
    );

    return send(res, 200, {
      success: true,

      user: {
        id: userResult.rows[0].id,

        name: userResult.rows[0].full_name,

        full_name: userResult.rows[0].full_name,

        profile_image: userResult.rows[0].profile_image,
      },

      messages: messages.rows,
    });
  } catch (error) {
    console.error("GET MESSAGES ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to load messages.",
    });
  }
}

// ============================================================
// SEND USER MESSAGE
// ============================================================

async function sendMessage(req, res) {
  try {
    const body = await readBody(req);

    const receiverId = body.receiverId || body.receiver_id;

    const message = String(body.message || "").trim();

    if (!receiverId || !message) {
      return send(res, 400, {
        success: false,
        message: "Receiver and message are required.",
      });
    }

    if (String(receiverId) === String(req.user.id)) {
      return send(res, 400, {
        success: false,
        message: "You cannot send a message to yourself.",
      });
    }

    if (message.length > 2000) {
      return send(res, 400, {
        success: false,
        message: "Message is too long.",
      });
    }

    const receiver = await query(
      `
                SELECT id
                FROM users
                WHERE
                    id = $1
                    AND status = 'active'
                LIMIT 1
                `,
      [receiverId],
    );

    if (receiver.rows.length === 0) {
      return send(res, 404, {
        success: false,
        message: "Receiver was not found.",
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
                    'user',
                    $1,
                    'user',
                    $2,
                    $3
                )
                RETURNING *
                `,
      [req.user.id, receiverId, message],
    );

    return send(res, 201, {
      success: true,
      message: "Message sent successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("SEND MESSAGE ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to send message.",
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getConversations,

  getMessages,

  sendMessage,
};
