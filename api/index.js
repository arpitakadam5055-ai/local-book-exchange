// ============================================================
// LOCAL BOOK EXCHANGE
// Main API Entry Point
// Vercel Serverless Function + Node.js
// ============================================================

const { requireUser, requireAdmin } = require("../lib/auth");

// Controllers
const authController = require("../lib/controllers/authController");
const bookController = require("../lib/controllers/bookController");
const exchangeController = require("../lib/controllers/exchangeController");
const categoryController = require("../lib/controllers/categoryController");
const wishlistController = require("../lib/controllers/wishlistController");
const messageController = require("../lib/controllers/messageController");
const profileController = require("../lib/controllers/profileController");
const contactController = require("../lib/controllers/contactController");
const adminController = require("../lib/controllers/adminController");

// ============================================================
// HELPER - SEND JSON RESPONSE
// ============================================================

function sendJson(res, statusCode, data) {
  if (res.headersSent) {
    return;
  }

  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");

  res.end(JSON.stringify(data));
}

// ============================================================
// CORS
// ============================================================

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:3000",
  ].filter(Boolean);

  // Allow same-origin requests
  if (!origin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  // Allow configured/local origins
  else if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );

  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  res.setHeader("Access-Control-Allow-Credentials", "true");
}

// ============================================================
// PATH NORMALIZER
// ============================================================

function getPath(req) {
  let path = req.url || "/";

  // Remove query string
  path = path.split("?")[0];

  // Remove /api from beginning
  if (path.startsWith("/api")) {
    path = path.substring(4);
  }

  if (!path) {
    path = "/";
  }

  // Remove ending slash except root
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  return path;
}

// ============================================================
// QUERY STRING PARSER
// ============================================================

function getQuery(req) {
  try {
    const base = `http://${req.headers.host || "localhost"}`;

    const url = new URL(req.url, base);

    const query = {};

    for (const [key, value] of url.searchParams.entries()) {
      query[key] = value;
    }

    return query;
  } catch (error) {
    return {};
  }
}

// ============================================================
// ROUTE PATTERN MATCHER
//
// Example:
//
// /books/:id
//
// matches:
//
// /books/10
//
// and produces:
//
// req.params.id = "10"
// ============================================================

function matchPath(pattern, actualPath) {
  const patternParts = pattern.split("/").filter(Boolean);

  const actualParts = actualPath.split("/").filter(Boolean);

  if (patternParts.length !== actualParts.length) {
    return null;
  }

  const params = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];

    const actualPart = actualParts[i];

    if (patternPart.startsWith(":")) {
      const paramName = patternPart.substring(1);

      params[paramName] = decodeURIComponent(actualPart);

      continue;
    }

    if (patternPart !== actualPart) {
      return null;
    }
  }

  return params;
}

// ============================================================
// AUTHENTICATION WRAPPER
// ============================================================

async function authenticate(req, res, authType) {
  if (!authType) {
    return true;
  }

  try {
    if (authType === "user") {
      const user = await requireUser(req);

      req.user = user;

      return true;
    }

    if (authType === "admin") {
      const admin = await requireAdmin(req);

      req.user = admin;

      return true;
    }

    return true;
  } catch (error) {
    sendJson(res, error.statusCode || 401, {
      success: false,
      message: error.message || "Unauthorized access.",
    });

    return false;
  }
}

// ============================================================
// ROUTES
// ============================================================

const routes = [
  // ========================================================
  // SYSTEM
  // ========================================================

  {
    method: "GET",
    path: "/",
    handler: async (req, res) => {
      sendJson(res, 200, {
        success: true,
        message: "Local Book Exchange API is running.",
      });
    },
  },

  {
    method: "GET",
    path: "/health",
    handler: async (req, res) => {
      sendJson(res, 200, {
        success: true,
        status: "OK",
        service: "Local Book Exchange API",
        timestamp: new Date().toISOString(),
      });
    },
  },

  // ========================================================
  // AUTHENTICATION
  // ========================================================

  {
    method: "POST",
    path: "/auth/register",
    handler: authController.register,
  },

  {
    method: "POST",
    path: "/auth/login",
    handler: authController.login,
  },

  {
    method: "POST",
    path: "/auth/admin-login",
    handler: authController.adminLogin,
  },

  // ========================================================
  // USER PROFILE
  // ========================================================

  {
    method: "GET",
    path: "/profile",
    auth: "user",
    handler: profileController.getProfile,
  },

  {
    method: "PUT",
    path: "/profile",
    auth: "user",
    handler: profileController.updateProfile,
  },

  {
    method: "PUT",
    path: "/profile/password",
    auth: "user",
    handler: profileController.changePassword,
  },

  // ========================================================
  // USER DASHBOARD
  // ========================================================

  {
    method: "GET",
    path: "/user/dashboard",
    auth: "user",
    handler: profileController.getDashboard,
  },

  // ========================================================
  // BOOKS
  // ========================================================

  // Public / browse books
  {
    method: "GET",
    path: "/books",
    handler: bookController.getAllBooks,
  },

  // User's own books
  {
    method: "GET",
    path: "/books/my",
    auth: "user",
    handler: bookController.getMyBooks,
  },

  // Add book
  {
    method: "POST",
    path: "/books",
    auth: "user",
    handler: bookController.createBook,
  },

  // Individual book details
  {
    method: "GET",
    path: "/books/:id",
    handler: bookController.getBookById,
  },

  // Update book
  {
    method: "PUT",
    path: "/books/:id",
    auth: "user",
    handler: bookController.updateBook,
  },

  // Delete user's book
  {
    method: "DELETE",
    path: "/books/:id",
    auth: "user",
    handler: bookController.deleteBook,
  },

  // ========================================================
  // CATEGORIES
  // ========================================================

  {
    method: "GET",
    path: "/categories",
    handler: categoryController.getCategories,
  },

  // ========================================================
  // EXCHANGE REQUESTS
  // ========================================================

  // Send new exchange request
  {
    method: "POST",
    path: "/exchanges",
    auth: "user",
    handler: exchangeController.createExchangeRequest,
  },

  // Incoming requests
  {
    method: "GET",
    path: "/exchanges/incoming",
    auth: "user",
    handler: exchangeController.getIncomingRequests,
  },

  // All exchanges belonging to logged user
  {
    method: "GET",
    path: "/exchanges/my",
    auth: "user",
    handler: exchangeController.getMyExchanges,
  },

  // Single exchange
  {
    method: "GET",
    path: "/exchanges/:id",
    auth: "user",
    handler: exchangeController.getExchangeById,
  },

  // Accept / reject / complete / cancel exchange
  {
    method: "PATCH",
    path: "/exchanges/:id/status",
    auth: "user",
    handler: exchangeController.updateExchangeStatus,
  },

  // ========================================================
  // WISHLIST
  // ========================================================

  {
    method: "GET",
    path: "/wishlist",
    auth: "user",
    handler: wishlistController.getWishlist,
  },

  {
    method: "POST",
    path: "/wishlist/:bookId",
    auth: "user",
    handler: wishlistController.addToWishlist,
  },

  {
    method: "DELETE",
    path: "/wishlist/:bookId",
    auth: "user",
    handler: wishlistController.removeFromWishlist,
  },

  // ========================================================
  // MESSAGES
  // ========================================================

  // Conversation list
  {
    method: "GET",
    path: "/messages/conversations",
    auth: "user",
    handler: messageController.getConversations,
  },

  // Messages with a particular user
  {
    method: "GET",
    path: "/messages/:userId",
    auth: "user",
    handler: messageController.getMessages,
  },

  // Send message
  {
    method: "POST",
    path: "/messages",
    auth: "user",
    handler: messageController.sendMessage,
  },

  // ========================================================
  // CONTACT
  // ========================================================

  {
    method: "POST",
    path: "/contact",
    handler: contactController.submitContact,
  },

  // ========================================================
  // ADMIN DASHBOARD
  // ========================================================

  {
    method: "GET",
    path: "/admin/dashboard",
    auth: "admin",
    handler: adminController.getDashboard,
  },

  // ========================================================
  // ADMIN USERS
  // ========================================================

  {
    method: "GET",
    path: "/admin/users",
    auth: "admin",
    handler: adminController.getUsers,
  },

  {
    method: "GET",
    path: "/admin/users/:id",
    auth: "admin",
    handler: adminController.getUserById,
  },

  {
    method: "PATCH",
    path: "/admin/users/:id/status",
    auth: "admin",
    handler: adminController.updateUserStatus,
  },

  {
    method: "DELETE",
    path: "/admin/users/:id",
    auth: "admin",
    handler: adminController.deleteUser,
  },

  // ========================================================
  // ADMIN BOOKS
  // ========================================================

  {
    method: "GET",
    path: "/admin/books",
    auth: "admin",
    handler: adminController.getBooks,
  },

  {
    method: "GET",
    path: "/admin/books/:id",
    auth: "admin",
    handler: adminController.getBookById,
  },

  {
    method: "PATCH",
    path: "/admin/books/:id/status",
    auth: "admin",
    handler: adminController.updateBookStatus,
  },

  {
    method: "DELETE",
    path: "/admin/books/:id",
    auth: "admin",
    handler: adminController.deleteBook,
  },

  // ========================================================
  // ADMIN EXCHANGES
  // ========================================================

  {
    method: "GET",
    path: "/admin/exchanges",
    auth: "admin",
    handler: adminController.getExchanges,
  },

  // ========================================================
  // ADMIN CATEGORIES
  // ========================================================

  {
    method: "POST",
    path: "/admin/categories",
    auth: "admin",
    handler: categoryController.createCategory,
  },

  {
    method: "PUT",
    path: "/admin/categories/:id",
    auth: "admin",
    handler: categoryController.updateCategory,
  },

  {
    method: "DELETE",
    path: "/admin/categories/:id",
    auth: "admin",
    handler: categoryController.deleteCategory,
  },

  // ========================================================
  // ADMIN REPORTS
  // ========================================================

  {
    method: "GET",
    path: "/admin/reports",
    auth: "admin",
    handler: adminController.getReports,
  },

  // ========================================================
  // ADMIN MESSAGES
  // ========================================================

  {
    method: "GET",
    path: "/admin/conversations",
    auth: "admin",
    handler: adminController.getConversations,
  },

  {
    method: "GET",
    path: "/admin/messages/:userId",
    auth: "admin",
    handler: adminController.getMessages,
  },

  {
    method: "POST",
    path: "/admin/messages",
    auth: "admin",
    handler: adminController.sendMessage,
  },

  // ========================================================
  // ADMIN PROFILE
  // ========================================================

  {
    method: "GET",
    path: "/admin/profile",
    auth: "admin",
    handler: adminController.getProfile,
  },

  {
    method: "PUT",
    path: "/admin/profile",
    auth: "admin",
    handler: adminController.updateProfile,
  },

  {
    method: "PUT",
    path: "/admin/profile/password",
    auth: "admin",
    handler: adminController.changePassword,
  },
];

// ============================================================
// MAIN API HANDLER
// ============================================================

module.exports = async function handler(req, res) {
  try {
    // ----------------------------------------------------
    // CORS
    // ----------------------------------------------------

    setCorsHeaders(req, res);

    // ----------------------------------------------------
    // OPTIONS REQUEST
    // ----------------------------------------------------

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();

      return;
    }

    // ----------------------------------------------------
    // SET REQUEST DATA
    // ----------------------------------------------------

    const method = (req.method || "GET").toUpperCase();

    const path = getPath(req);

    req.query = getQuery(req);

    req.params = {};

    // ----------------------------------------------------
    // FIND ROUTE
    // ----------------------------------------------------

    let matchedRoute = null;
    let matchedParams = null;

    for (const route of routes) {
      if (route.method !== method) {
        continue;
      }

      const params = matchPath(route.path, path);

      if (params !== null) {
        matchedRoute = route;

        matchedParams = params;

        break;
      }
    }

    // ----------------------------------------------------
    // ROUTE NOT FOUND
    // ----------------------------------------------------

    if (!matchedRoute) {
      return sendJson(res, 404, {
        success: false,
        message: "API route not found.",
        method,
        path,
      });
    }

    // ----------------------------------------------------
    // SET PARAMS
    // ----------------------------------------------------

    req.params = matchedParams || {};

    // ----------------------------------------------------
    // AUTHENTICATE
    // ----------------------------------------------------

    const authenticated = await authenticate(req, res, matchedRoute.auth);

    if (!authenticated) {
      return;
    }

    // ----------------------------------------------------
    // CALL CONTROLLER
    // ----------------------------------------------------

    await matchedRoute.handler(req, res);
  } catch (error) {
    console.error("API ERROR:", error);

    if (!res.headersSent) {
      sendJson(res, error.statusCode || 500, {
        success: false,
        message: error.message || "Internal server error.",
      });
    }
  }
};

// ============================================================
// LOCAL NODE SERVER SUPPORT
//
// This section allows:
//
// node api/index.js
//
// for basic local testing.
//
// Vercel will ignore this section and use module.exports.
// ============================================================

if (require.main === module) {
  const http = require("http");

  const PORT = process.env.PORT || 3000;

  const server = http.createServer(async (req, res) => {
    try {
      await module.exports(req, res);
    } catch (error) {
      console.error("SERVER ERROR:", error);

      if (!res.headersSent) {
        res.statusCode = 500;

        res.setHeader("Content-Type", "application/json");

        res.end(
          JSON.stringify({
            success: false,
            message: "Internal server error.",
          }),
        );
      }
    }
  });

  server.listen(PORT, () => {
    console.log("======================================");

    console.log(" Local Book Exchange API");

    console.log(` http://localhost:${PORT}/api`);

    console.log("======================================");
  });
}
