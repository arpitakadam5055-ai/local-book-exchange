// ============================================================
// LOCAL BOOK EXCHANGE
// Contact Controller
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
// SUBMIT CONTACT MESSAGE
// ============================================================

async function submitContact(req, res) {
  try {
    const body = await readBody(req);

    const name = String(body.name || "").trim();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const subject = String(body.subject || "").trim();

    const message = String(body.message || "").trim();

    if (!name || !email || !subject || !message) {
      return send(res, 400, {
        success: false,
        message: "Please complete all contact form fields.",
      });
    }

    await query(
      `
            INSERT INTO contacts
            (
                name,
                email,
                subject,
                message,
                status
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                'new'
            )
            `,
      [name, email, subject, message],
    );

    return send(res, 201, {
      success: true,
      message: "Your message has been sent successfully.",
    });
  } catch (error) {
    console.error("CONTACT ERROR:", error);

    return send(res, 500, {
      success: false,
      message: "Unable to send your message.",
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  submitContact,
};
