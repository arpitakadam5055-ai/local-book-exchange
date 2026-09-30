// ============================================================
// LOCAL BOOK EXCHANGE
// ADMIN PANEL JAVASCRIPT
// ============================================================

let adminUsersCache = [];

let adminBooksCache = [];

let adminExchangesCache = [];

let adminCategoriesCache = [];

let currentAdminChatUserId = null;

let lastReportData = null;

// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener("DOMContentLoaded", async function () {
  initAdminSidebar();

  const page = App.currentPage();

  // Login page is handled by auth.js
  if (page === "login.html") {
    return;
  }

  if (!App.requireAdmin()) {
    return;
  }

  initAdminLogout();

  try {
    await loadAdminIdentity();

    switch (page) {
      case "dashboard.html":
        await loadAdminDashboard();

        break;

      case "users.html":
        await initAdminUsersPage();

        break;

      case "user-details.html":
        await initAdminUserDetailsPage();

        break;

      case "books.html":
        await initAdminBooksPage();

        break;

      case "book-details.html":
        await initAdminBookDetailsPage();

        break;

      case "exchange-requests.html":
        await initAdminExchangePage();

        break;

      case "categories.html":
        await initAdminCategoriesPage();

        break;

      case "reports.html":
        await initAdminReportsPage();

        break;

      case "messages.html":
        await initAdminMessagesPage();

        break;

      case "profile.html":
        await initAdminProfilePage();

        break;
    }
  } catch (error) {
    console.error("Admin page error:", error);
  }
});

// ============================================================
// AUTH ERROR
// ============================================================

function handleAdminError(error) {
  if (error && error.status === 401) {
    App.removeAdminToken();

    sessionStorage.setItem(
      "lbe_admin_flash_message",
      "Admin session expired. Please login again.",
    );

    window.location.href = "login.html";

    return true;
  }

  return false;
}

// ============================================================
// SIDEBAR
// ============================================================

function initAdminSidebar() {
  const button = document.getElementById("adminMenuToggle");

  const sidebar = document.getElementById("adminSidebar");

  if (!button || !sidebar) {
    return;
  }

  button.addEventListener("click", function () {
    sidebar.classList.toggle("active");
  });

  document.addEventListener("click", function (event) {
    if (
      window.innerWidth <= 850 &&
      sidebar.classList.contains("active") &&
      !sidebar.contains(event.target) &&
      !button.contains(event.target)
    ) {
      sidebar.classList.remove("active");
    }
  });
}

// ============================================================
// LOGOUT
// ============================================================

function initAdminLogout() {
  const button = document.getElementById("logoutBtn");

  if (!button) {
    return;
  }

  button.addEventListener("click", function (event) {
    event.preventDefault();

    App.removeAdminToken();

    window.location.href = "login.html";
  });
}

// ============================================================
// ADMIN IDENTITY
// ============================================================

async function loadAdminIdentity() {
  try {
    const response = await App.apiFetch("/admin/profile", {
      auth: "admin",
    });

    const admin = App.getObject(response, "admin", "profile");

    App.setAdminData(admin);

    const name = admin.full_name || admin.name || "Administrator";

    setAdminText("adminName", name);

    setAdminText("welcomeAdminName", name);

    setAdminText("topAdminName", name);
  } catch (error) {
    handleAdminError(error);
  }
}

// ============================================================
// DASHBOARD
// ============================================================

async function loadAdminDashboard() {
  try {
    const response = await App.apiFetch("/admin/dashboard", {
      auth: "admin",
    });

    setAdminText(
      "totalUsers",
      response.totalUsers ?? response.stats?.users ?? 0,
    );

    setAdminText(
      "totalBooks",
      response.totalBooks ?? response.stats?.books ?? 0,
    );

    setAdminText(
      "totalExchanges",
      response.totalExchanges ?? response.stats?.exchanges ?? 0,
    );

    setAdminText(
      "completedExchanges",
      response.completedExchanges ?? response.stats?.completed_exchanges ?? 0,
    );

    renderAdminRecentExchanges(response.recentExchanges || []);

    renderAdminRecentBooks(response.recentBooks || []);
  } catch (error) {
    if (!handleAdminError(error)) {
      console.error(error);
    }
  }
}

// ============================================================
// RECENT EXCHANGES
// ============================================================

function renderAdminRecentExchanges(exchanges) {
  const table = document.getElementById("recentExchangeTable");

  if (!table) {
    return;
  }

  if (!exchanges.length) {
    table.innerHTML = `
            <tr>
                <td colspan="4">
                    No exchange requests available.
                </td>
            </tr>
        `;

    return;
  }

  table.innerHTML = exchanges
    .slice(0, 6)
    .map(
      (exchange) => `
                <tr>

                    <td>
                        ${App.escapeHtml(exchange.requester_name || "User")}
                    </td>

                    <td>
                        ${App.escapeHtml(
                          exchange.requested_book_title || "Book",
                        )}
                    </td>

                    <td>
                        ${App.statusBadge(exchange.status)}
                    </td>

                    <td>
                        ${App.formatDate(exchange.created_at)}
                    </td>

                </tr>
            `,
    )
    .join("");
}

// ============================================================
// RECENT BOOKS
// ============================================================

function renderAdminRecentBooks(books) {
  const container = document.getElementById("recentBooks");

  if (!container) {
    return;
  }

  if (!books.length) {
    container.innerHTML = `
            <div class="admin-book-item">

                <img
                    src="../assets/images/book-placeholder.svg"
                    alt="Book"
                >

                <div class="admin-book-info">

                    <h4>No books available</h4>

                    <p>
                        Newly added books will appear here.
                    </p>

                </div>

            </div>
        `;

    return;
  }

  container.innerHTML = books
    .slice(0, 5)
    .map(
      (book) => `
                <a
                    class="admin-book-item"
                    href="book-details.html?id=${encodeURIComponent(
                      adminBookId(book),
                    )}"
                >

                    <img
                        src="${adminBookImage(book)}"
                        alt="${App.escapeHtml(book.title)}"
                        onerror="this.src='../assets/images/book-placeholder.svg'"
                    >

                    <div class="admin-book-info">

                        <h4>
                            ${App.escapeHtml(book.title)}
                        </h4>

                        <p>
                            ${App.escapeHtml(book.author || "Unknown Author")}
                        </p>

                    </div>

                </a>
            `,
    )
    .join("");
}

// ============================================================
// ADMIN USERS
// ============================================================

async function initAdminUsersPage() {
  const search = document.getElementById("userSearch");

  if (search) {
    search.addEventListener("input", filterAdminUsers);
  }

  await loadAdminUsers();
}

// ============================================================
// LOAD USERS
// ============================================================

async function loadAdminUsers() {
  try {
    const response = await App.apiFetch("/admin/users", {
      auth: "admin",
    });

    adminUsersCache = App.getArray(response, "users");

    renderAdminUsers(adminUsersCache);
  } catch (error) {
    if (!handleAdminError(error)) {
      alert(error.message);
    }
  }
}

// ============================================================
// FILTER USERS
// ============================================================

function filterAdminUsers() {
  const search = adminValue("userSearch").toLowerCase();

  const filtered = adminUsersCache.filter((user) => {
    const text = `${user.full_name || ""}
                     ${user.name || ""}
                     ${user.email || ""}
                     ${user.phone || ""}
                     ${user.location || ""}`.toLowerCase();

    return !search || text.includes(search);
  });

  renderAdminUsers(filtered);
}

// ============================================================
// RENDER USERS
// ============================================================

function renderAdminUsers(users) {
  const tbody = document.getElementById("usersTableBody");

  setAdminText("userCount", users.length);

  if (!tbody) {
    return;
  }

  if (!users.length) {
    tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    No registered users found.
                </td>
            </tr>
        `;

    return;
  }

  tbody.innerHTML = users
    .map((user) => {
      const id = user.id || user.user_id;

      return `
                    <tr>

                        <td>

                            <div class="table-user">

                                <img
                                    src="${App.getImageUrl(
                                      user.profile_image ||
                                        "assets/images/logo.png",
                                      "assets/images/logo.png",
                                    )}"
                                    alt="User"
                                >

                                <div>

                                    <strong>
                                        ${App.escapeHtml(
                                          user.full_name || user.name || "User",
                                        )}
                                    </strong>

                                    <small>
                                        ${App.escapeHtml(user.email || "")}
                                    </small>

                                </div>

                            </div>

                        </td>

                        <td>
                            ${App.escapeHtml(user.phone || "-")}
                        </td>

                        <td>
                            ${App.escapeHtml(user.location || "-")}
                        </td>

                        <td>
                            ${App.escapeHtml(
                              user.book_count ?? user.books_count ?? 0,
                            )}
                        </td>

                        <td>
                            ${App.statusBadge(user.status || "active")}
                        </td>

                        <td>
                            ${App.formatDate(user.created_at)}
                        </td>

                        <td>

                            <div class="action-buttons">

                                <a
                                    class="action-btn"
                                    href="user-details.html?id=${encodeURIComponent(id)}"
                                    title="View"
                                >
                                    👁
                                </a>

                                <button
                                    class="action-btn delete"
                                    onclick="adminDeleteUser('${id}')"
                                    title="Delete"
                                >
                                    🗑
                                </button>

                            </div>

                        </td>

                    </tr>
                `;
    })
    .join("");
}

// ============================================================
// DELETE USER
// ============================================================

async function adminDeleteUser(id) {
  if (!App.confirmAction("Are you sure you want to delete this user?")) {
    return;
  }

  try {
    await App.apiFetch(`/admin/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
      auth: "admin",
    });

    if (App.currentPage() === "users.html") {
      await loadAdminUsers();
    } else {
      window.location.href = "users.html";
    }
  } catch (error) {
    alert(error.message);
  }
}

window.adminDeleteUser = adminDeleteUser;

// ============================================================
// USER DETAILS PAGE
// ============================================================

async function initAdminUserDetailsPage() {
  const id = App.getQueryParam("id");

  if (!id) {
    window.location.href = "users.html";

    return;
  }

  try {
    const response = await App.apiFetch(
      `/admin/users/${encodeURIComponent(id)}`,
      {
        auth: "admin",
      },
    );

    const user = response.user || response.data || {};

    fillAdminUserDetails(user, response);

    const activate = document.getElementById("activateUserBtn");

    const block = document.getElementById("blockUserBtn");

    const deleteButton = document.getElementById("deleteUserBtn");

    if (activate) {
      activate.addEventListener("click", () =>
        adminUpdateUserStatus(id, "active"),
      );
    }

    if (block) {
      block.addEventListener("click", () =>
        adminUpdateUserStatus(id, "blocked"),
      );
    }

    if (deleteButton) {
      deleteButton.addEventListener("click", () => adminDeleteUser(id));
    }
  } catch (error) {
    alert(error.message);
  }
}

// ============================================================
// FILL USER DETAILS
// ============================================================

function fillAdminUserDetails(user, response) {
  const name = user.full_name || user.name || "User";

  setAdminText("userName", name);

  setAdminText("userEmail", user.email || "-");

  setAdminText("detailName", name);

  setAdminText("detailEmail", user.email || "-");

  setAdminText("detailPhone", user.phone || "-");

  setAdminText("detailLocation", user.location || "-");

  setAdminText("detailStatus", App.capitalize(user.status || "active"));

  setAdminText("detailJoined", App.formatDate(user.created_at));

  setAdminText(
    "userBookCount",
    response.bookCount ?? response.books?.length ?? 0,
  );

  setAdminText("userExchangeCount", response.exchangeCount ?? 0);

  setAdminText("userWishlistCount", response.wishlistCount ?? 0);

  setAdminText("userMessageCount", response.messageCount ?? 0);

  const image = document.getElementById("userProfileImage");

  if (image) {
    image.src = App.getImageUrl(
      user.profile_image || "assets/images/logo.png",
      "assets/images/logo.png",
    );
  }

  renderAdminUserBooks(response.books || []);
}

// ============================================================
// USER BOOK TABLE
// ============================================================

function renderAdminUserBooks(books) {
  const tbody = document.getElementById("userBooksTable");

  if (!tbody) {
    return;
  }

  if (!books.length) {
    tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    No books found for this user.
                </td>
            </tr>
        `;

    return;
  }

  tbody.innerHTML = books
    .map(
      (book) => `
                <tr>

                    <td>
                        ${App.escapeHtml(book.title)}
                    </td>

                    <td>
                        ${App.escapeHtml(book.category_name || "-")}
                    </td>

                    <td>
                        ${App.escapeHtml(App.capitalize(book.condition))}
                    </td>

                    <td>
                        ${App.statusBadge(book.status || "available")}
                    </td>

                </tr>
            `,
    )
    .join("");
}

// ============================================================
// USER STATUS
// ============================================================

async function adminUpdateUserStatus(id, status) {
  try {
    await App.apiFetch(`/admin/users/${encodeURIComponent(id)}/status`, {
      method: "PATCH",

      auth: "admin",

      body: {
        status,
      },
    });

    window.location.reload();
  } catch (error) {
    alert(error.message);
  }
}

// ============================================================
// ADMIN BOOKS
// ============================================================

async function initAdminBooksPage() {
  await loadAdminCategoryFilter();

  const search = document.getElementById("bookSearch");

  const category = document.getElementById("bookCategoryFilter");

  const status = document.getElementById("bookStatusFilter");

  if (search) {
    search.addEventListener("input", filterAdminBooks);
  }

  if (category) {
    category.addEventListener("change", filterAdminBooks);
  }

  if (status) {
    status.addEventListener("change", filterAdminBooks);
  }

  await loadAdminBooks();
}

// ============================================================
// LOAD ADMIN BOOKS
// ============================================================

async function loadAdminBooks() {
  try {
    const response = await App.apiFetch("/admin/books", {
      auth: "admin",
    });

    adminBooksCache = App.getArray(response, "books");

    renderAdminBooks(adminBooksCache);
  } catch (error) {
    alert(error.message);
  }
}

// ============================================================
// CATEGORY FILTER
// ============================================================

async function loadAdminCategoryFilter() {
  const select = document.getElementById("bookCategoryFilter");

  if (!select) {
    return;
  }

  try {
    const response = await App.apiFetch("/categories");

    const categories = App.getArray(response, "categories");

    select.innerHTML = `
            <option value="">
                All Categories
            </option>

            ${categories
              .map(
                (category) => `
                        <option
                            value="${App.escapeHtml(
                              category.id || category.category_id,
                            )}"
                        >
                            ${App.escapeHtml(
                              category.name || category.category_name,
                            )}
                        </option>
                    `,
              )
              .join("")}
        `;
  } catch (error) {
    console.error(error);
  }
}

// ============================================================
// FILTER ADMIN BOOKS
// ============================================================

function filterAdminBooks() {
  const search = adminValue("bookSearch").toLowerCase();

  const category = adminValue("bookCategoryFilter");

  const status = adminValue("bookStatusFilter").toLowerCase();

  const filtered = adminBooksCache.filter((book) => {
    const text = `${book.title || ""}
                     ${book.author || ""}
                     ${book.owner_name || ""}`.toLowerCase();

    return (
      (!search || text.includes(search)) &&
      (!category || String(book.category_id || "") === String(category)) &&
      (!status || String(book.status || "").toLowerCase() === status)
    );
  });

  renderAdminBooks(filtered);
}

// ============================================================
// RENDER ADMIN BOOKS
// ============================================================

function renderAdminBooks(books) {
  const tbody = document.getElementById("booksTableBody");

  setAdminText("bookCount", books.length);

  if (!tbody) {
    return;
  }

  if (!books.length) {
    tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    No books found.
                </td>
            </tr>
        `;

    return;
  }

  tbody.innerHTML = books
    .map((book) => {
      const id = adminBookId(book);

      return `
                    <tr>

                        <td>

                            <div class="table-user">

                                <img
                                    src="${adminBookImage(book)}"
                                    alt="Book"
                                    onerror="this.src='../assets/images/book-placeholder.svg'"
                                >

                                <div>

                                    <strong>
                                        ${App.escapeHtml(book.title)}
                                    </strong>

                                    <small>
                                        ${App.escapeHtml(book.author || "")}
                                    </small>

                                </div>

                            </div>

                        </td>

                        <td>
                            ${App.escapeHtml(book.owner_name || "-")}
                        </td>

                        <td>
                            ${App.escapeHtml(book.category_name || "-")}
                        </td>

                        <td>
                            ${App.escapeHtml(App.capitalize(book.condition))}
                        </td>

                        <td>
                            ${App.statusBadge(book.status || "available")}
                        </td>

                        <td>
                            ${App.formatDate(book.created_at)}
                        </td>

                        <td>

                            <div class="action-buttons">

                                <a
                                    href="book-details.html?id=${encodeURIComponent(id)}"
                                    class="action-btn"
                                >
                                    👁
                                </a>

                                <button
                                    class="action-btn delete"
                                    onclick="adminDeleteBook('${id}')"
                                >
                                    🗑
                                </button>

                            </div>

                        </td>

                    </tr>
                `;
    })
    .join("");
}

// ============================================================
// ADMIN BOOK DETAILS
// ============================================================

async function initAdminBookDetailsPage() {
  const id = App.getQueryParam("id");

  if (!id) {
    window.location.href = "books.html";

    return;
  }

  try {
    const response = await App.apiFetch(
      `/admin/books/${encodeURIComponent(id)}`,
      {
        auth: "admin",
      },
    );

    const book = App.getObject(response, "book");

    setAdminText("bookTitle", book.title || "-");

    setAdminText("bookAuthor", `by ${book.author || "Unknown"}`);

    setAdminText("bookDescription", book.description || "-");

    setAdminText("bookCategory", book.category_name || "-");

    setAdminText("bookCondition", App.capitalize(book.condition));

    setAdminText("bookOwner", book.owner_name || "-");

    setAdminText("bookLocation", book.location || book.owner_location || "-");

    setAdminText("bookAddedDate", App.formatDate(book.created_at));

    setAdminText("bookId", adminBookId(book));

    const image = document.getElementById("bookImage");

    if (image) {
      image.src = adminBookImage(book);
    }

    const status = document.getElementById("bookStatus");

    if (status) {
      status.outerHTML = App.statusBadge(book.status || "available");
    }

    const activate = document.getElementById("activateBookBtn");

    const remove = document.getElementById("removeBookBtn");

    if (activate) {
      activate.addEventListener("click", () =>
        adminUpdateBookStatus(id, "available"),
      );
    }

    if (remove) {
      remove.addEventListener("click", () => adminDeleteBook(id));
    }
  } catch (error) {
    alert(error.message);
  }
}

// ============================================================
// BOOK STATUS
// ============================================================

async function adminUpdateBookStatus(id, status) {
  try {
    await App.apiFetch(`/admin/books/${encodeURIComponent(id)}/status`, {
      method: "PATCH",

      auth: "admin",

      body: {
        status,
      },
    });

    window.location.reload();
  } catch (error) {
    alert(error.message);
  }
}

// ============================================================
// DELETE BOOK
// ============================================================

async function adminDeleteBook(id) {
  if (!App.confirmAction("Are you sure you want to remove this book?")) {
    return;
  }

  try {
    await App.apiFetch(`/admin/books/${encodeURIComponent(id)}`, {
      method: "DELETE",
      auth: "admin",
    });

    if (App.currentPage() === "books.html") {
      await loadAdminBooks();
    } else {
      window.location.href = "books.html";
    }
  } catch (error) {
    alert(error.message);
  }
}

window.adminDeleteBook = adminDeleteBook;

// ============================================================
// ADMIN EXCHANGES
// ============================================================

async function initAdminExchangePage() {
  const search = document.getElementById("exchangeSearch");

  const status = document.getElementById("exchangeStatusFilter");

  const date = document.getElementById("exchangeDateFilter");

  [search, status, date].forEach((element) => {
    if (element) {
      element.addEventListener(
        element.tagName === "SELECT" || element.type === "date"
          ? "change"
          : "input",
        filterAdminExchanges,
      );
    }
  });

  await loadAdminExchanges();
}

// ============================================================
// LOAD EXCHANGES
// ============================================================

async function loadAdminExchanges() {
  try {
    const response = await App.apiFetch("/admin/exchanges", {
      auth: "admin",
    });

    adminExchangesCache = App.getArray(response, "exchanges");

    renderAdminExchanges(adminExchangesCache);
  } catch (error) {
    alert(error.message);
  }
}

// ============================================================
// FILTER EXCHANGES
// ============================================================

function filterAdminExchanges() {
  const search = adminValue("exchangeSearch").toLowerCase();

  const status = adminValue("exchangeStatusFilter").toLowerCase();

  const date = adminValue("exchangeDateFilter");

  const filtered = adminExchangesCache.filter((exchange) => {
    const text = `${exchange.requester_name || ""}
                     ${exchange.owner_name || ""}
                     ${exchange.requested_book_title || ""}
                     ${exchange.offered_book_title || ""}`.toLowerCase();

    const createdDate = exchange.created_at
      ? String(exchange.created_at).slice(0, 10)
      : "";

    return (
      (!search || text.includes(search)) &&
      (!status || String(exchange.status || "").toLowerCase() === status) &&
      (!date || createdDate === date)
    );
  });

  renderAdminExchanges(filtered);
}

// ============================================================
// RENDER EXCHANGES
// ============================================================

function renderAdminExchanges(exchanges) {
  const tbody = document.getElementById("exchangeTableBody");

  if (!tbody) {
    return;
  }

  if (!exchanges.length) {
    tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    No exchange requests found.
                </td>
            </tr>
        `;

    return;
  }

  tbody.innerHTML = exchanges
    .map(
      (exchange) => `
                <tr>

                    <td>
                        ${App.escapeHtml(exchange.id || exchange.exchange_id)}
                    </td>

                    <td>
                        ${App.escapeHtml(exchange.requester_name || "-")}
                    </td>

                    <td>
                        ${App.escapeHtml(exchange.owner_name || "-")}
                    </td>

                    <td>
                        ${App.escapeHtml(exchange.requested_book_title || "-")}
                    </td>

                    <td>
                        ${App.escapeHtml(exchange.offered_book_title || "-")}
                    </td>

                    <td>
                        ${App.statusBadge(exchange.status)}
                    </td>

                    <td>
                        ${App.formatDate(exchange.created_at)}
                    </td>

                    <td>
                        View
                    </td>

                </tr>
            `,
    )
    .join("");
}

// ============================================================
// ADMIN CATEGORIES
// ============================================================

async function initAdminCategoriesPage() {
  const search = document.getElementById("categorySearch");

  if (search) {
    search.addEventListener("input", filterAdminCategories);
  }

  const form = document.getElementById("categoryForm");

  if (form) {
    form.addEventListener("submit", saveAdminCategory);
  }

  await loadAdminCategories();
}

// ============================================================
// LOAD CATEGORIES
// ============================================================

async function loadAdminCategories() {
  try {
    const response = await App.apiFetch("/categories");

    adminCategoriesCache = App.getArray(response, "categories");

    renderAdminCategories(adminCategoriesCache);
  } catch (error) {
    alert(error.message);
  }
}

// ============================================================
// FILTER CATEGORIES
// ============================================================

function filterAdminCategories() {
  const search = adminValue("categorySearch").toLowerCase();

  const filtered = adminCategoriesCache.filter((category) =>
    String(category.name || category.category_name || "")
      .toLowerCase()
      .includes(search),
  );

  renderAdminCategories(filtered);
}

// ============================================================
// RENDER CATEGORIES
// ============================================================

function renderAdminCategories(categories) {
  const tbody = document.getElementById("categoryTableBody");

  if (!tbody) {
    return;
  }

  if (!categories.length) {
    tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    No categories available.
                </td>
            </tr>
        `;

    return;
  }

  tbody.innerHTML = categories
    .map((category) => {
      const id = category.id || category.category_id;

      return `
                    <tr>

                        <td>
                            ${App.escapeHtml(
                              category.name || category.category_name,
                            )}
                        </td>

                        <td>
                            ${App.escapeHtml(
                              category.book_count ?? category.books_count ?? 0,
                            )}
                        </td>

                        <td>
                            ${App.statusBadge(category.status || "active")}
                        </td>

                        <td>

                            <div class="action-buttons">

                                <button
                                    class="action-btn"
                                    onclick="editAdminCategory('${id}')"
                                >
                                    ✏
                                </button>

                                <button
                                    class="action-btn delete"
                                    onclick="deleteAdminCategory('${id}')"
                                >
                                    🗑
                                </button>

                            </div>

                        </td>

                    </tr>
                `;
    })
    .join("");
}

// ============================================================
// EDIT CATEGORY
// ============================================================

function editAdminCategory(id) {
  const category = adminCategoriesCache.find(
    (item) => String(item.id || item.category_id) === String(id),
  );

  if (!category) {
    return;
  }

  setAdminValue("categoryId", id);

  setAdminValue("categoryName", category.name || category.category_name);

  setAdminValue("categoryDescription", category.description);

  setAdminValue("categoryStatus", category.status || "active");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

window.editAdminCategory = editAdminCategory;

// ============================================================
// SAVE CATEGORY
// ============================================================

async function saveAdminCategory(event) {
  event.preventDefault();

  const id = adminValue("categoryId");

  const name = adminValue("categoryName");

  const description = adminValue("categoryDescription");

  const status = adminValue("categoryStatus");

  const button = event.currentTarget.querySelector('button[type="submit"]');

  try {
    App.buttonLoading(button, true, "Saving...");

    const response = await App.apiFetch(
      id ? `/admin/categories/${encodeURIComponent(id)}` : "/admin/categories",
      {
        method: id ? "PUT" : "POST",

        auth: "admin",

        body: {
          name,
          description,
          status,
        },
      },
    );

    App.setMessage(
      "categoryMessage",
      response.message || "Category saved successfully.",
      "success",
    );

    event.currentTarget.reset();

    setAdminValue("categoryId", "");

    await loadAdminCategories();
  } catch (error) {
    App.setMessage("categoryMessage", error.message, "danger");
  } finally {
    App.buttonLoading(button, false);
  }
}

// ============================================================
// DELETE CATEGORY
// ============================================================

async function deleteAdminCategory(id) {
  if (!App.confirmAction("Delete this category?")) {
    return;
  }

  try {
    await App.apiFetch(`/admin/categories/${encodeURIComponent(id)}`, {
      method: "DELETE",
      auth: "admin",
    });

    await loadAdminCategories();
  } catch (error) {
    alert(error.message);
  }
}

window.deleteAdminCategory = deleteAdminCategory;

// ============================================================
// REPORTS
// ============================================================

async function initAdminReportsPage() {
  const exportButton = document.getElementById("exportReportBtn");

  if (exportButton) {
    exportButton.addEventListener("click", exportAdminReport);
  }

  await loadAdminReports();
}

// ============================================================
// LOAD REPORTS
// ============================================================

async function loadAdminReports() {
  try {
    const response = await App.apiFetch("/admin/reports", {
      auth: "admin",
    });

    lastReportData = response;

    setAdminText(
      "reportUsers",
      response.totalUsers ?? response.stats?.users ?? 0,
    );

    setAdminText(
      "reportBooks",
      response.totalBooks ?? response.stats?.books ?? 0,
    );

    setAdminText(
      "reportCompleted",
      response.completedExchanges ?? response.stats?.completed ?? 0,
    );

    setAdminText(
      "reportPending",
      response.pendingExchanges ?? response.stats?.pending ?? 0,
    );

    setAdminText(
      "reportCategories",
      response.totalCategories ?? response.stats?.categories ?? 0,
    );

    setAdminText(
      "reportMessages",
      response.totalMessages ?? response.stats?.messages ?? 0,
    );

    const summary = response.exchangeSummary || {};

    setAdminText("summaryPending", summary.pending || 0);

    setAdminText("summaryAccepted", summary.accepted || 0);

    setAdminText("summaryCompleted", summary.completed || 0);

    setAdminText("summaryRejected", summary.rejected || 0);

    renderPopularCategories(response.popularCategories || []);
  } catch (error) {
    alert(error.message);
  }
}

// ============================================================
// POPULAR CATEGORIES
// ============================================================

function renderPopularCategories(categories) {
  const tbody = document.getElementById("popularCategoryTable");

  if (!tbody) {
    return;
  }

  if (!categories.length) {
    tbody.innerHTML = `
            <tr>
                <td colspan="3">
                    No report data available.
                </td>
            </tr>
        `;

    return;
  }

  tbody.innerHTML = categories
    .map(
      (category) => `
                <tr>

                    <td>
                        ${App.escapeHtml(
                          category.name || category.category_name,
                        )}
                    </td>

                    <td>
                        ${App.escapeHtml(category.book_count ?? 0)}
                    </td>

                    <td>
                        ${App.escapeHtml(category.exchange_count ?? 0)}
                    </td>

                </tr>
            `,
    )
    .join("");
}

// ============================================================
// EXPORT REPORT
// ============================================================

function exportAdminReport() {
  if (!lastReportData) {
    alert("No report data available.");

    return;
  }

  const rows = [
    ["Local Book Exchange Report", ""],

    ["Generated", new Date().toLocaleString("en-IN")],

    [
      "Total Users",
      lastReportData.totalUsers ?? lastReportData.stats?.users ?? 0,
    ],

    [
      "Total Books",
      lastReportData.totalBooks ?? lastReportData.stats?.books ?? 0,
    ],

    [
      "Completed Exchanges",
      lastReportData.completedExchanges ?? lastReportData.stats?.completed ?? 0,
    ],

    [
      "Pending Exchanges",
      lastReportData.pendingExchanges ?? lastReportData.stats?.pending ?? 0,
    ],

    [
      "Categories",
      lastReportData.totalCategories ?? lastReportData.stats?.categories ?? 0,
    ],

    [
      "Messages",
      lastReportData.totalMessages ?? lastReportData.stats?.messages ?? 0,
    ],
  ];

  const csv = rows
    .map((row) =>
      row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = "local-book-exchange-report.csv";

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}

// ============================================================
// ADMIN MESSAGES
// ============================================================

async function initAdminMessagesPage() {
  const search = document.getElementById("conversationSearch");

  if (search) {
    search.addEventListener("input", loadAdminConversations);
  }

  const form = document.getElementById("adminMessageForm");

  if (form) {
    form.addEventListener("submit", sendAdminMessage);
  }

  await loadAdminConversations();
}

// ============================================================
// ADMIN CONVERSATIONS
// ============================================================

async function loadAdminConversations() {
  const container = document.getElementById("conversationList");

  if (!container) {
    return;
  }

  try {
    const response = await App.apiFetch("/admin/conversations", {
      auth: "admin",
    });

    let conversations = App.getArray(response, "conversations");

    const search = adminValue("conversationSearch").toLowerCase();

    if (search) {
      conversations = conversations.filter((item) =>
        String(item.user_name || item.name || "")
          .toLowerCase()
          .includes(search),
      );
    }

    if (!conversations.length) {
      container.innerHTML = `
                <div class="empty-state">

                    <h3>No conversations</h3>

                    <p>
                        User conversations
                        will appear here.
                    </p>

                </div>
            `;

      return;
    }

    container.innerHTML = conversations
      .map((item) => {
        const userId = item.user_id || item.id;

        return `
                        <div
                            class="chat-user"
                            onclick="openAdminConversation('${userId}')"
                        >

                            <img
                                src="${App.getImageUrl(
                                  item.profile_image ||
                                    "assets/images/logo.png",
                                  "assets/images/logo.png",
                                )}"
                                alt="User"
                            >

                            <div>

                                <strong>
                                    ${App.escapeHtml(
                                      item.user_name || item.name || "User",
                                    )}
                                </strong>

                                <small>
                                    ${App.escapeHtml(item.last_message || "")}
                                </small>

                            </div>

                        </div>
                    `;
      })
      .join("");
  } catch (error) {
    container.innerHTML = `
            <div class="alert alert-danger">
                ${App.escapeHtml(error.message)}
            </div>
        `;
  }
}

// ============================================================
// OPEN ADMIN CONVERSATION
// ============================================================

async function openAdminConversation(userId) {
  currentAdminChatUserId = userId;

  try {
    const response = await App.apiFetch(
      `/admin/messages/${encodeURIComponent(userId)}`,
      {
        auth: "admin",
      },
    );

    const messages = App.getArray(response, "messages");

    setAdminText(
      "chatHeader",
      response.user?.name ||
        response.user?.full_name ||
        response.userName ||
        "Conversation",
    );

    renderAdminMessages(messages);
  } catch (error) {
    alert(error.message);
  }
}

window.openAdminConversation = openAdminConversation;

// ============================================================
// RENDER ADMIN MESSAGES
// ============================================================

function renderAdminMessages(messages) {
  const container = document.getElementById("chatMessages");

  if (!container) {
    return;
  }

  if (!messages.length) {
    container.innerHTML = `
            <div class="empty-state">

                <h3>No messages yet</h3>

            </div>
        `;

    return;
  }

  container.innerHTML = messages
    .map((message) => {
      const fromAdmin =
        message.sender_role === "admin" || message.is_admin === true;

      return `
                    <div
                        class="message ${fromAdmin ? "sent" : "received"}"
                    >

                        ${App.escapeHtml(
                          message.message || message.content || "",
                        )}

                    </div>
                `;
    })
    .join("");

  container.scrollTop = container.scrollHeight;
}

// ============================================================
// SEND ADMIN MESSAGE
// ============================================================

async function sendAdminMessage(event) {
  event.preventDefault();

  if (!currentAdminChatUserId) {
    alert("Please select a user first.");

    return;
  }

  const input = document.getElementById("adminMessageInput");

  const message = input.value.trim();

  if (!message) {
    return;
  }

  try {
    await App.apiFetch("/admin/messages", {
      method: "POST",

      auth: "admin",

      body: {
        userId: currentAdminChatUserId,

        message,
      },
    });

    input.value = "";

    await openAdminConversation(currentAdminChatUserId);

    await loadAdminConversations();
  } catch (error) {
    alert(error.message);
  }
}

// ============================================================
// ADMIN PROFILE
// ============================================================

async function initAdminProfilePage() {
  try {
    const response = await App.apiFetch("/admin/profile", {
      auth: "admin",
    });

    const admin = App.getObject(response, "admin", "profile");

    fillAdminProfile(admin);

    const profileForm = document.getElementById("adminProfileForm");

    const passwordForm = document.getElementById("adminPasswordForm");

    if (profileForm) {
      profileForm.addEventListener("submit", updateAdminProfile);
    }

    if (passwordForm) {
      passwordForm.addEventListener("submit", changeAdminPassword);
    }
  } catch (error) {
    alert(error.message);
  }
}

// ============================================================
// FILL ADMIN PROFILE
// ============================================================

function fillAdminProfile(admin) {
  const name = admin.full_name || admin.name || "Administrator";

  setAdminText("profileAdminName", name);

  setAdminText("profileAdminEmail", admin.email || "-");

  setAdminText("topAdminName", name);

  setAdminValue("adminFullName", name);

  setAdminValue("adminEmail", admin.email);

  setAdminValue("adminPhone", admin.phone);

  setAdminText("adminLastLogin", App.formatDateTime(admin.last_login));

  setAdminText("adminCreatedAt", App.formatDate(admin.created_at));
}

// ============================================================
// UPDATE ADMIN PROFILE
// ============================================================

async function updateAdminProfile(event) {
  event.preventDefault();

  const button = event.currentTarget.querySelector('button[type="submit"]');

  try {
    App.buttonLoading(button, true, "Saving...");

    const response = await App.apiFetch("/admin/profile", {
      method: "PUT",

      auth: "admin",

      body: {
        fullName: adminValue("adminFullName"),

        email: adminValue("adminEmail"),

        phone: adminValue("adminPhone"),
      },
    });

    if (response.admin) {
      App.setAdminData(response.admin);

      fillAdminProfile(response.admin);
    }

    App.setMessage(
      "profileMessage",
      response.message || "Profile updated successfully.",
      "success",
    );
  } catch (error) {
    App.setMessage("profileMessage", error.message, "danger");
  } finally {
    App.buttonLoading(button, false);
  }
}

// ============================================================
// CHANGE ADMIN PASSWORD
// ============================================================

async function changeAdminPassword(event) {
  event.preventDefault();

  const currentPassword = adminValue("currentPassword");

  const newPassword = adminValue("newPassword");

  const confirmPassword = adminValue("confirmPassword");

  if (newPassword !== confirmPassword) {
    App.setMessage("passwordMessage", "New passwords do not match.", "danger");

    return;
  }

  const button = event.currentTarget.querySelector('button[type="submit"]');

  try {
    App.buttonLoading(button, true, "Changing...");

    const response = await App.apiFetch("/admin/profile/password", {
      method: "PUT",

      auth: "admin",

      body: {
        currentPassword,
        newPassword,
      },
    });

    App.setMessage(
      "passwordMessage",
      response.message || "Password changed successfully.",
      "success",
    );

    event.currentTarget.reset();
  } catch (error) {
    App.setMessage("passwordMessage", error.message, "danger");
  } finally {
    App.buttonLoading(button, false);
  }
}

// ============================================================
// GENERAL HELPERS
// ============================================================

function adminBookId(book) {
  return book.id || book.book_id || book.bookId || "";
}

function adminBookImage(book) {
  return App.getImageUrl(
    book.image_url ||
      book.image ||
      book.cover_image ||
      "assets/images/book-placeholder.svg",
  );
}

function setAdminText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value ?? "";
  }
}

function setAdminValue(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.value = value ?? "";
  }
}

function adminValue(id) {
  const element = document.getElementById(id);

  if (!element) {
    return "";
  }

  return String(element.value || "").trim();
}
