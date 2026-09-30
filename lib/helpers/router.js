// ============================================================
// LOCAL BOOK EXCHANGE
// Router Helper
// File: lib/helpers/router.js
// ============================================================

// ============================================================
// NORMALIZE PATH
//
// Examples:
//
// /api/books/     -> /books
// /api/users?id=1 -> /users
//
// ============================================================

function normalizePath(url) {
  let path = String(url || "/");

  // Remove query string
  path = path.split("?")[0];

  // Decode safe URL characters
  try {
    path = decodeURI(path);
  } catch (error) {
    // Keep original path
  }

  // Remove /api prefix
  if (path === "/api") {
    path = "/";
  }

  if (path.startsWith("/api/")) {
    path = path.substring(4);
  }

  if (!path) {
    path = "/";
  }

  // Ensure beginning slash
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  // Remove multiple slashes
  path = path.replace(/\/+/g, "/");

  // Remove ending slash
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  return path;
}

// ============================================================
// QUERY PARAMETERS
// ============================================================

function parseQuery(req) {
  try {
    const host = req.headers?.host || "localhost";

    const url = new URL(req.url, `http://${host}`);

    const query = {};

    for (const [key, value] of url.searchParams.entries()) {
      if (Object.prototype.hasOwnProperty.call(query, key)) {
        if (!Array.isArray(query[key])) {
          query[key] = [query[key]];
        }

        query[key].push(value);
      } else {
        query[key] = value;
      }
    }

    return query;
  } catch (error) {
    return {};
  }
}

// ============================================================
// MATCH ROUTE PATH
//
// Example:
//
// Pattern:
// /books/:id
//
// Actual:
// /books/10
//
// Returns:
//
// {
//     id: "10"
// }
//
// ============================================================

function matchPath(pattern, actualPath) {
  const normalizedPattern = normalizeSimplePath(pattern);

  const normalizedActual = normalizeSimplePath(actualPath);

  const patternParts = normalizedPattern.split("/").filter(Boolean);

  const actualParts = normalizedActual.split("/").filter(Boolean);

  if (patternParts.length !== actualParts.length) {
    return null;
  }

  const params = {};

  for (let index = 0; index < patternParts.length; index++) {
    const patternPart = patternParts[index];

    const actualPart = actualParts[index];

    // ----------------------------------------
    // Dynamic parameter
    // ----------------------------------------

    if (patternPart.startsWith(":")) {
      const parameterName = patternPart.substring(1);

      try {
        params[parameterName] = decodeURIComponent(actualPart);
      } catch (error) {
        params[parameterName] = actualPart;
      }

      continue;
    }

    // ----------------------------------------
    // Wildcard
    // ----------------------------------------

    if (patternPart === "*") {
      continue;
    }

    // ----------------------------------------
    // Static route mismatch
    // ----------------------------------------

    if (patternPart !== actualPart) {
      return null;
    }
  }

  return params;
}

// ============================================================
// SIMPLE PATH NORMALIZATION
// ============================================================

function normalizeSimplePath(path) {
  let value = String(path || "/");

  value = value.split("?")[0];

  if (!value.startsWith("/")) {
    value = "/" + value;
  }

  value = value.replace(/\/+/g, "/");

  if (value.length > 1 && value.endsWith("/")) {
    value = value.slice(0, -1);
  }

  return value;
}

// ============================================================
// READ RAW BODY
// ============================================================

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    return Buffer.from(req.body, "utf8");
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

// ============================================================
// PARSE JSON BODY
// ============================================================

async function parseJsonBody(req) {
  // Vercel may already parse request.body
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  const buffer = await readRawBody(req);

  if (buffer.length === 0) {
    return {};
  }

  const text = buffer.toString("utf8").trim();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const parsingError = new Error("Invalid JSON request body.");

    parsingError.statusCode = 400;

    throw parsingError;
  }
}

// ============================================================
// PARSE URL-ENCODED BODY
// ============================================================

async function parseUrlEncodedBody(req) {
  const buffer = await readRawBody(req);

  if (buffer.length === 0) {
    return {};
  }

  const text = buffer.toString("utf8");

  const params = new URLSearchParams(text);

  const body = {};

  for (const [key, value] of params.entries()) {
    body[key] = value;
  }

  return body;
}

// ============================================================
// PARSE REQUEST BODY
// ============================================================

async function parseBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  const contentType = String(req.headers?.["content-type"] || "").toLowerCase();

  if (contentType.includes("application/json")) {
    return parseJsonBody(req);
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return parseUrlEncodedBody(req);
  }

  // JSON is the default for our API.
  return parseJsonBody(req);
}

// ============================================================
// HTTP METHOD
// ============================================================

function getMethod(req) {
  return String(req.method || "GET").toUpperCase();
}

// ============================================================
// CREATE ROUTE
// ============================================================

function createRoute(method, path, handler, options = {}) {
  if (typeof handler !== "function") {
    throw new Error(`Route handler for ${method} ${path} must be a function.`);
  }

  return {
    method: String(method).toUpperCase(),

    path: normalizeSimplePath(path),

    handler,

    auth: options.auth || null,
  };
}

// ============================================================
// ROUTER CLASS
// ============================================================

class Router {
  constructor() {
    this.routes = [];
  }

  // ========================================================
  // REGISTER ROUTE
  // ========================================================

  add(method, path, handler, options = {}) {
    this.routes.push(createRoute(method, path, handler, options));

    return this;
  }

  // ========================================================
  // GET
  // ========================================================

  get(path, handler, options = {}) {
    return this.add("GET", path, handler, options);
  }

  // ========================================================
  // POST
  // ========================================================

  post(path, handler, options = {}) {
    return this.add("POST", path, handler, options);
  }

  // ========================================================
  // PUT
  // ========================================================

  put(path, handler, options = {}) {
    return this.add("PUT", path, handler, options);
  }

  // ========================================================
  // PATCH
  // ========================================================

  patch(path, handler, options = {}) {
    return this.add("PATCH", path, handler, options);
  }

  // ========================================================
  // DELETE
  // ========================================================

  delete(path, handler, options = {}) {
    return this.add("DELETE", path, handler, options);
  }

  // ========================================================
  // FIND MATCHING ROUTE
  // ========================================================

  find(method, path) {
    const normalizedMethod = String(method).toUpperCase();

    const normalizedPath = normalizeSimplePath(path);

    for (const route of this.routes) {
      if (route.method !== normalizedMethod) {
        continue;
      }

      const params = matchPath(route.path, normalizedPath);

      if (params !== null) {
        return {
          route,
          params,
        };
      }
    }

    return null;
  }

  // ========================================================
  // HANDLE REQUEST
  //
  // authHandlers example:
  //
  // {
  //     user: requireUser,
  //     admin: requireAdmin
  // }
  //
  // ========================================================

  async handle(req, res, authHandlers = {}) {
    const method = getMethod(req);

    const path = normalizePath(req.url);

    const matched = this.find(method, path);

    if (!matched) {
      return false;
    }

    req.params = matched.params || {};

    req.query = parseQuery(req);

    const route = matched.route;

    // ----------------------------------------
    // Authentication
    // ----------------------------------------

    if (route.auth) {
      const authHandler = authHandlers[route.auth];

      if (typeof authHandler !== "function") {
        throw new Error(
          `Authentication handler "${route.auth}" is not configured.`,
        );
      }

      const authenticatedUser = await authHandler(req);

      req.user = authenticatedUser;
    }

    await route.handler(req, res);

    return true;
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  Router,

  createRoute,

  normalizePath,

  normalizeSimplePath,

  matchPath,

  parseQuery,

  parseBody,

  parseJsonBody,

  parseUrlEncodedBody,

  readRawBody,

  getMethod,
};
