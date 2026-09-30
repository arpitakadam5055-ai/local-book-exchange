// ============================================================
// LOCAL BOOK EXCHANGE
// COMMON JAVASCRIPT
// ============================================================

(function () {
  "use strict";

  // ========================================================
  // API BASE URL
  // ========================================================

  function getApiBase() {
    const hostname = window.location.hostname;
    const port = window.location.port;

    // VS Code Live Server
    if (hostname === "127.0.0.1" || hostname === "localhost") {
      if (port === "5500" || port === "5501" || port === "5502") {
        return "http://localhost:3000/api";
      }
    }

    // Vercel / same domain
    return "/api";
  }

  const API_BASE = getApiBase();

  // ========================================================
  // STORAGE KEYS
  // ========================================================

  const STORAGE = {
    USER_TOKEN: "lbe_user_token",

    ADMIN_TOKEN: "lbe_admin_token",

    USER_DATA: "lbe_user_data",

    ADMIN_DATA: "lbe_admin_data",
  };

  // ========================================================
  // TOKEN FUNCTIONS
  // ========================================================

  function getUserToken() {
    return localStorage.getItem(STORAGE.USER_TOKEN);
  }

  function getAdminToken() {
    return localStorage.getItem(STORAGE.ADMIN_TOKEN);
  }

  function setUserToken(token) {
    if (token) {
      localStorage.setItem(STORAGE.USER_TOKEN, token);
    }
  }

  function setAdminToken(token) {
    if (token) {
      localStorage.setItem(STORAGE.ADMIN_TOKEN, token);
    }
  }

  function removeUserToken() {
    localStorage.removeItem(STORAGE.USER_TOKEN);

    localStorage.removeItem(STORAGE.USER_DATA);
  }

  function removeAdminToken() {
    localStorage.removeItem(STORAGE.ADMIN_TOKEN);

    localStorage.removeItem(STORAGE.ADMIN_DATA);
  }

  // ========================================================
  // SAVE USER / ADMIN DATA
  // ========================================================

  function setUserData(user) {
    if (!user) {
      return;
    }

    localStorage.setItem(STORAGE.USER_DATA, JSON.stringify(user));
  }

  function getUserData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.USER_DATA));
    } catch (error) {
      return null;
    }
  }

  function setAdminData(admin) {
    if (!admin) {
      return;
    }

    localStorage.setItem(STORAGE.ADMIN_DATA, JSON.stringify(admin));
  }

  function getAdminData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.ADMIN_DATA));
    } catch (error) {
      return null;
    }
  }

  // ========================================================
  // API REQUEST
  // ========================================================

  async function apiFetch(endpoint, options = {}) {
    const {
      method = "GET",

      body = null,

      auth = null,

      headers = {},
    } = options;

    const requestHeaders = {
      ...headers,
    };

    // ----------------------------------------------------
    // AUTH TOKEN
    // ----------------------------------------------------

    if (auth === "user") {
      const token = getUserToken();

      if (token) {
        requestHeaders.Authorization = `Bearer ${token}`;
      }
    }

    if (auth === "admin") {
      const token = getAdminToken();

      if (token) {
        requestHeaders.Authorization = `Bearer ${token}`;
      }
    }

    // ----------------------------------------------------
    // BODY
    // ----------------------------------------------------

    let requestBody = body;

    if (
      body !== null &&
      !(body instanceof FormData) &&
      typeof body !== "string"
    ) {
      requestHeaders["Content-Type"] = "application/json";

      requestBody = JSON.stringify(body);
    }

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${API_BASE}${endpoint}`;

    let response;

    try {
      response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: method === "GET" || method === "HEAD" ? undefined : requestBody,
      });
    } catch (error) {
      throw new Error("Unable to connect to the server.");
    }

    let data = {};

    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok) {
      const message =
        data.message || data.error || `Request failed (${response.status})`;

      if (response.status === 401 && auth === "user") {
        removeUserToken();
      }

      if (response.status === 401 && auth === "admin") {
        removeAdminToken();
      }

      const apiError = new Error(message);

      apiError.status = response.status;

      apiError.data = data;

      throw apiError;
    }

    return data;
  }

  // ========================================================
  // MESSAGE BOX
  // ========================================================

  function setMessage(elementId, message, type = "info") {
    const element = document.getElementById(elementId);

    if (!element) {
      return;
    }

    if (!message) {
      element.innerHTML = "";

      return;
    }

    const allowedTypes = ["success", "danger", "warning", "info"];

    const alertType = allowedTypes.includes(type) ? type : "info";

    element.innerHTML = `
            <div class="alert alert-${alertType}">
                ${escapeHtml(message)}
            </div>
        `;
  }

  // ========================================================
  // HTML ESCAPE
  // ========================================================

  function escapeHtml(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ========================================================
  // QUERY PARAMETER
  // ========================================================

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);

    return params.get(name);
  }

  // ========================================================
  // CURRENT PAGE
  // ========================================================

  function currentPage() {
    const pathname = window.location.pathname;

    const parts = pathname.split("/");

    return parts[parts.length - 1] || "index.html";
  }

  // ========================================================
  // DATE FORMAT
  // ========================================================

  function formatDate(value) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatDateTime(value) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ========================================================
  // TEXT FORMAT
  // ========================================================

  function capitalize(value) {
    if (!value) {
      return "-";
    }

    const text = String(value).replaceAll("_", " ").replaceAll("-", " ");

    return text
      .split(" ")
      .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
      .join(" ");
  }

  // ========================================================
  // IMAGE PATH
  // ========================================================

  function getImageUrl(value, fallback = "assets/images/book-placeholder.svg") {
    let path = value || fallback;

    if (
      path.startsWith("http://") ||
      path.startsWith("https://") ||
      path.startsWith("data:") ||
      path.startsWith("blob:")
    ) {
      return path;
    }

    if (path.startsWith("/")) {
      return path;
    }

    path = path.replace(/^\.?\//, "");

    const pathname = window.location.pathname;

    const nested = pathname.includes("/user/") || pathname.includes("/admin/");

    if (nested) {
      if (path.startsWith("../")) {
        return path;
      }

      return `../${path}`;
    }

    return path;
  }

  // ========================================================
  // GET ARRAY FROM API RESPONSE
  // ========================================================

  function getArray(response, ...possibleKeys) {
    if (Array.isArray(response)) {
      return response;
    }

    for (const key of possibleKeys) {
      if (response && Array.isArray(response[key])) {
        return response[key];
      }
    }

    if (response && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  }

  // ========================================================
  // GET OBJECT FROM API RESPONSE
  // ========================================================

  function getObject(response, ...possibleKeys) {
    if (!response) {
      return {};
    }

    for (const key of possibleKeys) {
      if (
        response[key] &&
        typeof response[key] === "object" &&
        !Array.isArray(response[key])
      ) {
        return response[key];
      }
    }

    if (
      response.data &&
      typeof response.data === "object" &&
      !Array.isArray(response.data)
    ) {
      return response.data;
    }

    return response;
  }

  // ========================================================
  // STATUS BADGE
  // ========================================================

  function statusBadge(status) {
    const value = String(status || "unknown").toLowerCase();

    let badgeClass = "badge-info";

    if (
      ["active", "available", "accepted", "completed", "approved"].includes(
        value,
      )
    ) {
      badgeClass = "badge-success";
    }

    if (["pending", "reserved", "waiting"].includes(value)) {
      badgeClass = "badge-warning";
    }

    if (
      ["inactive", "blocked", "rejected", "cancelled", "removed"].includes(
        value,
      )
    ) {
      badgeClass = "badge-danger";
    }

    return `
            <span class="badge ${badgeClass}">
                ${escapeHtml(capitalize(value))}
            </span>
        `;
  }

  // ========================================================
  // CONFIRM
  // ========================================================

  function confirmAction(message) {
    return window.confirm(message);
  }

  // ========================================================
  // REDIRECT
  // ========================================================

  function redirect(url) {
    window.location.href = url;
  }

  // ========================================================
  // REQUIRE USER LOGIN
  // ========================================================

  function requireUser() {
    if (!getUserToken()) {
      sessionStorage.setItem("lbe_flash_message", "Please login to continue.");

      redirect("login.html");

      return false;
    }

    return true;
  }

  // ========================================================
  // REQUIRE ADMIN LOGIN
  // ========================================================

  function requireAdmin() {
    if (!getAdminToken()) {
      sessionStorage.setItem(
        "lbe_admin_flash_message",
        "Please login as administrator.",
      );

      redirect("login.html");

      return false;
    }

    return true;
  }

  // ========================================================
  // BUTTON LOADING
  // ========================================================

  function buttonLoading(button, loading, text = "Please wait...") {
    if (!button) {
      return;
    }

    if (loading) {
      button.dataset.oldText = button.innerHTML;

      button.disabled = true;

      button.innerHTML = text;
    } else {
      button.disabled = false;

      if (button.dataset.oldText) {
        button.innerHTML = button.dataset.oldText;

        delete button.dataset.oldText;
      }
    }
  }

  // ========================================================
  // FLASH MESSAGE
  // ========================================================

  function getFlashMessage(key) {
    const value = sessionStorage.getItem(key);

    if (value) {
      sessionStorage.removeItem(key);
    }

    return value;
  }

  // ========================================================
  // EXPOSE GLOBAL APP
  // ========================================================

  window.App = {
    API_BASE,

    apiFetch,

    getUserToken,
    getAdminToken,

    setUserToken,
    setAdminToken,

    removeUserToken,
    removeAdminToken,

    setUserData,
    setAdminData,

    getUserData,
    getAdminData,

    setMessage,

    escapeHtml,

    getQueryParam,

    currentPage,

    formatDate,
    formatDateTime,

    capitalize,

    getImageUrl,

    getArray,
    getObject,

    statusBadge,

    confirmAction,

    redirect,

    requireUser,
    requireAdmin,

    buttonLoading,

    getFlashMessage,
  };
})();
