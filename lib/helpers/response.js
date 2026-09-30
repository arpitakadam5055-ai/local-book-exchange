// ============================================================
// LOCAL BOOK EXCHANGE
// Response Helper
// File: lib/helpers/response.js
// ============================================================

// ============================================================
// SEND JSON RESPONSE
// ============================================================

function json(res, statusCode, data) {
  if (!res) {
    return;
  }

  if (res.headersSent) {
    return;
  }

  res.statusCode = statusCode;

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  res.end(JSON.stringify(data));
}

// ============================================================
// SUCCESS RESPONSE
// ============================================================

function success(res, data = {}, message = "Success", statusCode = 200) {
  return json(res, statusCode, {
    success: true,
    message,
    ...data,
  });
}

// ============================================================
// CREATED RESPONSE
// ============================================================

function created(res, data = {}, message = "Created successfully.") {
  return success(res, data, message, 201);
}

// ============================================================
// ERROR RESPONSE
// ============================================================

function error(
  res,
  message = "Something went wrong.",
  statusCode = 500,
  extra = {},
) {
  return json(res, statusCode, {
    success: false,
    message,
    ...extra,
  });
}

// ============================================================
// BAD REQUEST
// ============================================================

function badRequest(res, message = "Invalid request.", extra = {}) {
  return error(res, message, 400, extra);
}

// ============================================================
// UNAUTHORIZED
// ============================================================

function unauthorized(res, message = "Authentication required.") {
  return error(res, message, 401);
}

// ============================================================
// FORBIDDEN
// ============================================================

function forbidden(
  res,
  message = "You do not have permission to perform this action.",
) {
  return error(res, message, 403);
}

// ============================================================
// NOT FOUND
// ============================================================

function notFound(res, message = "Resource not found.") {
  return error(res, message, 404);
}

// ============================================================
// CONFLICT
// ============================================================

function conflict(res, message = "Resource already exists.") {
  return error(res, message, 409);
}

// ============================================================
// VALIDATION ERROR
// ============================================================

function validationError(
  res,
  errors,
  message = "Please check the submitted information.",
) {
  return error(res, message, 400, {
    errors: Array.isArray(errors) ? errors : [errors],
  });
}

// ============================================================
// INTERNAL SERVER ERROR
// ============================================================

function serverError(res, message = "Internal server error.") {
  return error(res, message, 500);
}

// ============================================================
// METHOD NOT ALLOWED
// ============================================================

function methodNotAllowed(res, message = "Method not allowed.") {
  return error(res, message, 405);
}

// ============================================================
// NO CONTENT
// ============================================================

function noContent(res) {
  if (!res) {
    return;
  }

  if (res.headersSent) {
    return;
  }

  res.statusCode = 204;

  res.end();
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  json,

  success,

  created,

  error,

  badRequest,

  unauthorized,

  forbidden,

  notFound,

  conflict,

  validationError,

  serverError,

  methodNotAllowed,

  noContent,
};
