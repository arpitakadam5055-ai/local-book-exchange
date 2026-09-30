// ============================================================
// LOCAL BOOK EXCHANGE
// USER PANEL JAVASCRIPT
// ============================================================

let userBooksCache = [];

let browseBooksCache = [];

let wishlistCache = [];

let currentChatUserId = null;

// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener("DOMContentLoaded", async function () {
  if (!App.requireUser()) {
    return;
  }

  initUserLogout();

  const page = App.currentPage();

  try {
    await loadUserNavigationProfile();

    switch (page) {
      case "dashboard.html":
        await loadUserDashboard();

        break;

      case "profile.html":
        await initProfilePage();

        break;

      case "add-book.html":
        await initAddBookPage();

        break;

      case "my-books.html":
        await initMyBooksPage();

        break;

      case "browse-books.html":
        await initBrowseBooksPage();

        break;

      case "book-details.html":
        await initBookDetailsPage();

        break;

      case "exchange-requests.html":
        await initIncomingExchangePage();

        break;

      case "my-exchanges.html":
        await initMyExchangesPage();

        break;

      case "messages.html":
        await initMessagesPage();

        break;

      case "wishlist.html":
        await initWishlistPage();

        break;
    }
  } catch (error) {
    console.error("User page error:", error);
  }
});

// ============================================================
// AUTH ERROR
// ============================================================

function handleUserError(error) {
  if (error && error.status === 401) {
    App.removeUserToken();

    sessionStorage.setItem(
      "lbe_flash_message",
      "Your session has expired. Please login again.",
    );

    window.location.href = "login.html";

    return true;
  }

  return false;
}

// ============================================================
// LOGOUT
// ============================================================

function initUserLogout() {
  const logoutButton = document.getElementById("logoutBtn");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", function (event) {
    event.preventDefault();

    App.removeUserToken();

    window.location.href = "login.html";
  });
}

// ============================================================
// NAVIGATION PROFILE
// ============================================================

async function loadUserNavigationProfile() {
  try {
    const response = await App.apiFetch("/profile", {
      auth: "user",
    });

    const user = App.getObject(response, "user", "profile");

    App.setUserData(user);

    const profileImages = document.querySelectorAll(".profile-avatar");

    const image = App.getImageUrl(
      user.profile_image || user.image || "assets/images/logo.png",
      "assets/images/logo.png",
    );

    profileImages.forEach((element) => {
      element.src = image;
    });
  } catch (error) {
    handleUserError(error);
  }
}

// ============================================================
// USER DASHBOARD
// ============================================================

async function loadUserDashboard() {
  try {
    const response = await App.apiFetch("/user/dashboard", {
      auth: "user",
    });

    const user = response.user || App.getUserData() || {};

    setText(
      "dashboardUserName",
      user.full_name || user.fullName || user.name || "User",
    );

    setText(
      "myBookCount",
      response.totalBooks ?? response.bookCount ?? response.stats?.books ?? 0,
    );

    setText(
      "incomingRequestCount",
      response.incomingRequests ?? response.stats?.incoming_requests ?? 0,
    );

    setText(
      "exchangeCount",
      response.totalExchanges ?? response.stats?.exchanges ?? 0,
    );

    setText(
      "wishlistCount",
      response.wishlistCount ?? response.stats?.wishlist ?? 0,
    );

    renderRecentUserBooks(response.recentBooks || response.myRecentBooks || []);

    renderDashboardRequests(
      response.recentRequests || response.exchangeRequests || [],
    );

    renderRecommendedBooks(
      response.recommendedBooks || response.nearbyBooks || [],
    );
  } catch (error) {
    if (!handleUserError(error)) {
      console.error(error);
    }
  }
}

// ============================================================
// DASHBOARD RECENT BOOKS
// ============================================================

function renderRecentUserBooks(books) {
  const container = document.getElementById("recentUserBooks");

  if (!container) {
    return;
  }

  if (!Array.isArray(books) || books.length === 0) {
    container.innerHTML = `
            <div class="mini-book">

                <img
                    src="../assets/images/book-placeholder.svg"
                    alt="Book"
                >

                <div class="mini-book-info">

                    <h4>No books added</h4>

                    <p>
                        Add your first book.
                    </p>

                </div>

            </div>
        `;

    return;
  }

  container.innerHTML = books
    .slice(0, 5)
    .map((book) => {
      const id = getBookId(book);

      return `
                    <a
                        href="book-details.html?id=${encodeURIComponent(id)}"
                        class="mini-book"
                    >

                        <img
                            src="${bookImage(book)}"
                            alt="${App.escapeHtml(book.title)}"
                            onerror="this.src='../assets/images/book-placeholder.svg'"
                        >

                        <div class="mini-book-info">

                            <h4>
                                ${App.escapeHtml(book.title)}
                            </h4>

                            <p>
                                ${App.escapeHtml(
                                  book.author || "Unknown Author",
                                )}
                            </p>

                        </div>

                    </a>
                `;
    })
    .join("");
}

// ============================================================
// DASHBOARD REQUESTS
// ============================================================

function renderDashboardRequests(requests) {
  const container = document.getElementById("dashboardExchangeRequests");

  if (!container) {
    return;
  }

  if (!Array.isArray(requests) || requests.length === 0) {
    container.innerHTML = `
            <div class="empty-state">

                <h3>No requests yet</h3>

                <p>
                    Incoming book exchange requests
                    will appear here.
                </p>

            </div>
        `;

    return;
  }

  container.innerHTML = requests
    .slice(0, 4)
    .map((request) => {
      const requester =
        request.requester_name || request.requesterName || "User";

      const requestedBook =
        request.requested_book_title ||
        request.requestedBookTitle ||
        request.book_title ||
        "Book";

      return `
                    <div class="exchange-item">

                        <div class="exchange-user">

                            <img
                                src="../assets/images/logo.png"
                                alt="User"
                            >

                            <div>

                                <h4>
                                    ${App.escapeHtml(requester)}
                                </h4>

                                <p>
                                    wants
                                    ${App.escapeHtml(requestedBook)}
                                </p>

                            </div>

                        </div>

                        ${App.statusBadge(request.status || "pending")}

                    </div>
                `;
    })
    .join("");
}

// ============================================================
// DASHBOARD RECOMMENDED BOOKS
// ============================================================

function renderRecommendedBooks(books) {
  const container = document.getElementById("recommendedBooks");

  if (!container) {
    return;
  }

  if (!Array.isArray(books) || books.length === 0) {
    container.innerHTML = `
            <div class="empty-state">

                <h3>No books available</h3>

                <p>
                    Available books will appear here.
                </p>

            </div>
        `;

    return;
  }

  container.innerHTML = books.slice(0, 4).map(userBookCard).join("");
}

// ============================================================
// PROFILE PAGE
// ============================================================

async function initProfilePage() {
  try {
    const response = await App.apiFetch("/profile", {
      auth: "user",
    });

    const user = App.getObject(response, "user", "profile");

    fillUserProfile(user);

    const form = document.getElementById("profileForm");

    if (form) {
      form.addEventListener("submit", updateUserProfile);
    }

    const passwordForm = document.getElementById("changePasswordForm");

    if (passwordForm) {
      passwordForm.addEventListener("submit", changeUserPassword);
    }
  } catch (error) {
    if (!handleUserError(error)) {
      App.setMessage("profileMessage", error.message, "danger");
    }
  }
}

// ============================================================
// FILL PROFILE
// ============================================================

function fillUserProfile(user) {
  setText(
    "profileName",
    user.full_name || user.fullName || user.name || "User",
  );

  setText("profileLocation", user.location || "Location not set");

  setValue("fullName", user.full_name || user.fullName || user.name);

  setValue("email", user.email);

  setValue("phone", user.phone);

  setValue("location", user.location);

  setValue("bio", user.bio);

  const photo = document.getElementById("profilePhoto");

  if (photo) {
    photo.src = App.getImageUrl(
      user.profile_image || user.image || "assets/images/logo.png",
      "assets/images/logo.png",
    );
  }
}

// ============================================================
// UPDATE PROFILE
// ============================================================

async function updateUserProfile(event) {
  event.preventDefault();

  const button = event.currentTarget.querySelector('button[type="submit"]');

  try {
    App.buttonLoading(button, true, "Saving...");

    const response = await App.apiFetch("/profile", {
      method: "PUT",

      auth: "user",

      body: {
        fullName: getValue("fullName"),

        email: getValue("email"),

        phone: getValue("phone"),

        location: getValue("location"),

        bio: getValue("bio"),
      },
    });

    if (response.user) {
      App.setUserData(response.user);

      fillUserProfile(response.user);
    }

    App.setMessage(
      "profileMessage",
      response.message || "Profile updated successfully.",
      "success",
    );
  } catch (error) {
    if (!handleUserError(error)) {
      App.setMessage("profileMessage", error.message, "danger");
    }
  } finally {
    App.buttonLoading(button, false);
  }
}

// ============================================================
// CHANGE PASSWORD
// ============================================================

async function changeUserPassword(event) {
  event.preventDefault();

  const currentPassword = getValue("currentPassword");

  const newPassword = getValue("newPassword");

  const confirmPassword = getValue("confirmNewPassword");

  if (newPassword !== confirmPassword) {
    App.setMessage("passwordMessage", "New passwords do not match.", "danger");

    return;
  }

  const button = event.currentTarget.querySelector('button[type="submit"]');

  try {
    App.buttonLoading(button, true, "Changing...");

    const response = await App.apiFetch("/profile/password", {
      method: "PUT",

      auth: "user",

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
// ADD BOOK PAGE
// ============================================================

async function initAddBookPage() {
  await loadCategorySelect("category");

  const form = document.getElementById("addBookForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const button = form.querySelector('button[type="submit"]');

    const formData = new FormData();

    formData.append("title", getValue("title"));

    formData.append("author", getValue("author"));

    formData.append("categoryId", getValue("category"));

    formData.append("condition", getValue("condition"));

    formData.append("language", getValue("language"));

    formData.append("publicationYear", getValue("publicationYear"));

    formData.append("description", getValue("description"));

    const imageInput = document.getElementById("bookImage");

    if (imageInput && imageInput.files.length > 0) {
      formData.append("bookImage", imageInput.files[0]);
    }

    try {
      App.buttonLoading(button, true, "Adding Book...");

      const response = await App.apiFetch("/books", {
        method: "POST",

        auth: "user",

        body: formData,
      });

      App.setMessage(
        "addBookMessage",
        response.message || "Book added successfully.",
        "success",
      );

      form.reset();

      const preview = document.getElementById("imagePreviewContainer");

      if (preview) {
        preview.style.display = "none";
      }

      setTimeout(function () {
        window.location.href = "my-books.html";
      }, 700);
    } catch (error) {
      App.setMessage("addBookMessage", error.message, "danger");
    } finally {
      App.buttonLoading(button, false);
    }
  });
}

// ============================================================
// CATEGORY SELECT
// ============================================================

async function loadCategorySelect(id) {
  const select = document.getElementById(id);

  if (!select) {
    return;
  }

  try {
    const response = await App.apiFetch("/categories");

    const categories = App.getArray(response, "categories");

    const current = select.innerHTML;

    const options = categories
      .filter((category) => !category.status || category.status === "active")
      .map((category) => {
        const id = category.id || category.category_id;

        const name = category.name || category.category_name;

        return `
                        <option
                            value="${App.escapeHtml(id)}"
                        >
                            ${App.escapeHtml(name)}
                        </option>
                    `;
      })
      .join("");

    select.innerHTML = current + options;
  } catch (error) {
    console.error("Unable to load categories:", error);
  }
}

// ============================================================
// MY BOOKS
// ============================================================

async function initMyBooksPage() {
  const search = document.getElementById("myBookSearch");

  const status = document.getElementById("myBookStatus");

  if (search) {
    search.addEventListener("input", filterMyBooks);
  }

  if (status) {
    status.addEventListener("change", filterMyBooks);
  }

  await loadMyBooks();
}

// ============================================================
// LOAD MY BOOKS
// ============================================================

async function loadMyBooks() {
  const container = document.getElementById("myBooksGrid");

  if (!container) {
    return;
  }

  try {
    const response = await App.apiFetch("/books/my", {
      auth: "user",
    });

    userBooksCache = App.getArray(response, "books");

    renderMyBooks(userBooksCache);
  } catch (error) {
    if (!handleUserError(error)) {
      container.innerHTML = `
                <div class="empty-state">

                    <h3>Unable to load books</h3>

                    <p>
                        ${App.escapeHtml(error.message)}
                    </p>

                </div>
            `;
    }
  }
}

// ============================================================
// FILTER MY BOOKS
// ============================================================

function filterMyBooks() {
  const search = getValue("myBookSearch").toLowerCase();

  const status = getValue("myBookStatus").toLowerCase();

  const filtered = userBooksCache.filter((book) => {
    const text = `${book.title || ""}
                     ${book.author || ""}
                     ${book.category_name || ""}`.toLowerCase();

    const matchesSearch = !search || text.includes(search);

    const matchesStatus =
      !status || String(book.status || "").toLowerCase() === status;

    return matchesSearch && matchesStatus;
  });

  renderMyBooks(filtered);
}

// ============================================================
// RENDER MY BOOKS
// ============================================================

function renderMyBooks(books) {
  const container = document.getElementById("myBooksGrid");

  if (!container) {
    return;
  }

  if (!books.length) {
    container.innerHTML = `
            <div class="empty-state">

                <img
                    src="../assets/images/book-placeholder.svg"
                    alt="No books"
                >

                <h3>No books found</h3>

                <p>
                    Add your first book and
                    start exchanging.
                </p>

                <a
                    href="add-book.html"
                    class="btn btn-dark"
                >
                    Add Book
                </a>

            </div>
        `;

    return;
  }

  container.innerHTML = books
    .map((book) => {
      const id = getBookId(book);

      return `
                    <article class="book-card">

                        <div class="book-image">

                            <img
                                src="${bookImage(book)}"
                                alt="${App.escapeHtml(book.title)}"
                                onerror="this.src='../assets/images/book-placeholder.svg'"
                            >

                        </div>

                        <div class="book-content">

                            <h3 class="book-title">
                                ${App.escapeHtml(book.title)}
                            </h3>

                            <p class="book-author">
                                by ${App.escapeHtml(book.author || "Unknown")}
                            </p>

                            <div class="book-meta">

                                ${App.statusBadge(book.status || "available")}

                                <span class="badge badge-primary">

                                    ${App.escapeHtml(
                                      App.capitalize(book.condition || "-"),
                                    )}

                                </span>

                            </div>

                            <a
                                href="book-details.html?id=${encodeURIComponent(id)}"
                                class="btn btn-light btn-full"
                            >
                                View Details
                            </a>

                            <br><br>

                            <button
                                type="button"
                                class="btn btn-danger btn-full"
                                onclick="deleteMyBook('${App.escapeHtml(id)}')"
                            >
                                Delete Book
                            </button>

                        </div>

                    </article>
                `;
    })
    .join("");
}

// ============================================================
// DELETE MY BOOK
// ============================================================

async function deleteMyBook(id) {
  if (!App.confirmAction("Are you sure you want to delete this book?")) {
    return;
  }

  try {
    await App.apiFetch(`/books/${encodeURIComponent(id)}`, {
      method: "DELETE",
      auth: "user",
    });

    await loadMyBooks();
  } catch (error) {
    alert(error.message);
  }
}

window.deleteMyBook = deleteMyBook;

// ============================================================
// BROWSE BOOKS
// ============================================================

async function initBrowseBooksPage() {
  await loadCategorySelect("categoryFilter");

  const urlSearch = App.getQueryParam("search");

  const urlCategory = App.getQueryParam("category");

  if (urlSearch) {
    setValue("browseSearch", urlSearch);
  }

  const searchInput = document.getElementById("browseSearch");

  const searchButton = document.getElementById("browseSearchBtn");

  const category = document.getElementById("categoryFilter");

  const condition = document.getElementById("conditionFilter");

  const location = document.getElementById("locationFilter");

  const sort = document.getElementById("sortBooks");

  [searchInput, category, condition, location, sort].forEach((element) => {
    if (element) {
      element.addEventListener(
        element.tagName === "SELECT" ? "change" : "input",
        filterBrowseBooks,
      );
    }
  });

  if (searchButton) {
    searchButton.addEventListener("click", filterBrowseBooks);
  }

  await loadBrowseBooks();

  if (urlCategory && category) {
    Array.from(category.options).forEach((option) => {
      if (
        option.textContent.trim().toLowerCase() ===
        urlCategory.trim().toLowerCase()
      ) {
        category.value = option.value;
      }
    });

    filterBrowseBooks();
  }
}

// ============================================================
// LOAD BROWSE BOOKS
// ============================================================

async function loadBrowseBooks() {
  const container = document.getElementById("browseBooksGrid");

  if (!container) {
    return;
  }

  try {
    const response = await App.apiFetch("/books", {
      auth: "user",
    });

    browseBooksCache = App.getArray(response, "books");

    renderBrowseBooks(browseBooksCache);
  } catch (error) {
    container.innerHTML = `
            <div class="empty-state">

                <h3>Unable to load books</h3>

                <p>
                    ${App.escapeHtml(error.message)}
                </p>

            </div>
        `;
  }
}

// ============================================================
// FILTER BROWSE BOOKS
// ============================================================

function filterBrowseBooks() {
  const search = getValue("browseSearch").toLowerCase();

  const category = getValue("categoryFilter");

  const condition = getValue("conditionFilter").toLowerCase();

  const location = getValue("locationFilter").toLowerCase();

  const sort = getValue("sortBooks");

  let filtered = browseBooksCache.filter((book) => {
    const searchable = `${book.title || ""}
                     ${book.author || ""}
                     ${book.category_name || ""}
                     ${book.category || ""}`.toLowerCase();

    const matchesSearch = !search || searchable.includes(search);

    const bookCategory = String(book.category_id || book.categoryId || "");

    const matchesCategory = !category || bookCategory === String(category);

    const matchesCondition =
      !condition || String(book.condition || "").toLowerCase() === condition;

    const matchesLocation =
      !location ||
      String(book.location || book.owner_location || "")
        .toLowerCase()
        .includes(location);

    return (
      matchesSearch && matchesCategory && matchesCondition && matchesLocation
    );
  });

  if (sort === "title") {
    filtered.sort((a, b) =>
      String(a.title || "").localeCompare(String(b.title || "")),
    );
  }

  if (sort === "author") {
    filtered.sort((a, b) =>
      String(a.author || "").localeCompare(String(b.author || "")),
    );
  }

  if (sort === "latest") {
    filtered.sort(
      (a, b) =>
        new Date(b.created_at || b.createdAt || 0) -
        new Date(a.created_at || a.createdAt || 0),
    );
  }

  renderBrowseBooks(filtered);
}

// ============================================================
// RENDER BROWSE BOOKS
// ============================================================

function renderBrowseBooks(books) {
  const container = document.getElementById("browseBooksGrid");

  setText("browseBookCount", books.length);

  if (!container) {
    return;
  }

  if (!books.length) {
    container.innerHTML = `
            <div class="empty-state">

                <img
                    src="../assets/images/book-placeholder.svg"
                    alt="No Books"
                >

                <h3>No books found</h3>

                <p>
                    Try changing your search
                    or filters.
                </p>

            </div>
        `;

    return;
  }

  container.innerHTML = books.map(userBookCard).join("");
}

// ============================================================
// BOOK CARD
// ============================================================

function userBookCard(book) {
  const id = getBookId(book);

  return `
        <article class="book-card">

            <div class="book-image">

                <img
                    src="${bookImage(book)}"
                    alt="${App.escapeHtml(book.title)}"
                    onerror="this.src='../assets/images/book-placeholder.svg'"
                >

            </div>

            <div class="book-content">

                <h3 class="book-title">
                    ${App.escapeHtml(book.title || "Untitled Book")}
                </h3>

                <p class="book-author">
                    by ${App.escapeHtml(book.author || "Unknown Author")}
                </p>

                <div class="book-meta">

                    <span class="badge badge-primary">

                        ${App.escapeHtml(
                          book.category_name || book.category || "Book",
                        )}

                    </span>

                    ${App.statusBadge(book.status || "available")}

                </div>

                <a
                    href="book-details.html?id=${encodeURIComponent(id)}"
                    class="btn btn-dark btn-full"
                >
                    View Book
                </a>

            </div>

        </article>
    `;
}

// ============================================================
// BOOK DETAILS
// ============================================================

async function initBookDetailsPage() {
  const id = App.getQueryParam("id");

  if (!id) {
    alert("Book ID is missing.");

    window.location.href = "browse-books.html";

    return;
  }

  try {
    const response = await App.apiFetch(`/books/${encodeURIComponent(id)}`, {
      auth: "user",
    });

    const book = App.getObject(response, "book");

    fillBookDetails(book);

    await loadOfferBooks(id);

    await loadWishlistState(id);

    const wishlistButton = document.getElementById("wishlistButton");

    if (wishlistButton) {
      wishlistButton.addEventListener("click", function () {
        toggleWishlist(id, wishlistButton);
      });
    }

    const exchangeForm = document.getElementById("exchangeRequestForm");

    if (exchangeForm) {
      exchangeForm.addEventListener("submit", function (event) {
        sendExchangeRequest(event, id);
      });
    }

    const messageButton = document.getElementById("messageOwnerBtn");

    const ownerId = book.owner_id || book.user_id || book.ownerId;

    if (messageButton && ownerId) {
      messageButton.addEventListener("click", function () {
        window.location.href = `messages.html?userId=${encodeURIComponent(ownerId)}`;
      });
    }
  } catch (error) {
    alert(error.message);
  }
}

// ============================================================
// FILL BOOK DETAILS
// ============================================================

function fillBookDetails(book) {
  setText("bookTitle", book.title || "Untitled Book");

  setText("bookAuthor", `by ${book.author || "Unknown Author"}`);

  setText("bookDescription", book.description || "No description available.");

  setText("bookCategory", book.category_name || book.category || "-");

  setText("bookCondition", App.capitalize(book.condition || "-"));

  setText("bookLanguage", book.language || "-");

  setText("bookYear", book.publication_year || book.publicationYear || "-");

  setText("bookOwner", book.owner_name || book.ownerName || "-");

  setText("bookLocation", book.location || book.owner_location || "-");

  const image = document.getElementById("bookImage");

  if (image) {
    image.src = bookImage(book);
  }

  const status = document.getElementById("bookAvailability");

  if (status) {
    status.outerHTML = App.statusBadge(book.status || "available");
  }
}

// ============================================================
// LOAD OFFER BOOKS
// ============================================================

async function loadOfferBooks(requestedBookId) {
  const select = document.getElementById("offeredBook");

  if (!select) {
    return;
  }

  try {
    const response = await App.apiFetch("/books/my", {
      auth: "user",
    });

    const books = App.getArray(response, "books").filter((book) => {
      const id = String(getBookId(book));

      const status = String(book.status || "available").toLowerCase();

      return id !== String(requestedBookId) && status === "available";
    });

    select.innerHTML = `
            <option value="">
                Select Your Book
            </option>

            ${books
              .map(
                (book) => `
                    <option
                        value="${App.escapeHtml(getBookId(book))}"
                    >
                        ${App.escapeHtml(book.title)}
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
// SEND EXCHANGE REQUEST
// ============================================================

async function sendExchangeRequest(event, requestedBookId) {
  event.preventDefault();

  const offeredBookId = getValue("offeredBook");

  if (!offeredBookId) {
    App.setMessage(
      "exchangeRequestMessage",
      "Please select a book to offer.",
      "warning",
    );

    return;
  }

  const button = event.currentTarget.querySelector('button[type="submit"]');

  try {
    App.buttonLoading(button, true, "Sending...");

    const response = await App.apiFetch("/exchanges", {
      method: "POST",

      auth: "user",

      body: {
        requestedBookId,

        offeredBookId,

        message: getValue("requestMessage"),
      },
    });

    App.setMessage(
      "exchangeRequestMessage",
      response.message || "Exchange request sent successfully.",
      "success",
    );

    event.currentTarget.reset();
  } catch (error) {
    App.setMessage("exchangeRequestMessage", error.message, "danger");
  } finally {
    App.buttonLoading(button, false);
  }
}

// ============================================================
// WISHLIST STATE
// ============================================================

async function loadWishlistState(bookId) {
  const button = document.getElementById("wishlistButton");

  if (!button) {
    return;
  }

  try {
    const response = await App.apiFetch("/wishlist", {
      auth: "user",
    });

    const books = App.getArray(response, "books", "wishlist");

    const found = books.some(
      (book) => String(getBookId(book)) === String(bookId),
    );

    button.classList.toggle("active", found);

    button.textContent = found ? "♥" : "♡";
  } catch (error) {
    console.error(error);
  }
}

// ============================================================
// TOGGLE WISHLIST
// ============================================================

async function toggleWishlist(bookId, button) {
  const active = button.classList.contains("active");

  try {
    if (active) {
      await App.apiFetch(`/wishlist/${encodeURIComponent(bookId)}`, {
        method: "DELETE",
        auth: "user",
      });
    } else {
      await App.apiFetch(`/wishlist/${encodeURIComponent(bookId)}`, {
        method: "POST",
        auth: "user",
      });
    }

    button.classList.toggle("active", !active);

    button.textContent = active ? "♡" : "♥";
  } catch (error) {
    alert(error.message);
  }
}

// ============================================================
// INCOMING EXCHANGES
// ============================================================

async function initIncomingExchangePage() {
  const search = document.getElementById("requestSearch");

  const status = document.getElementById("requestStatusFilter");

  if (search) {
    search.addEventListener("input", loadIncomingExchanges);
  }

  if (status) {
    status.addEventListener("change", loadIncomingExchanges);
  }

  await loadIncomingExchanges();
}

// ============================================================
// LOAD INCOMING EXCHANGES
// ============================================================

async function loadIncomingExchanges() {
  const container = document.getElementById("incomingExchangeRequests");

  if (!container) {
    return;
  }

  try {
    const response = await App.apiFetch("/exchanges/incoming", {
      auth: "user",
    });

    let exchanges = App.getArray(response, "exchanges", "requests");

    const search = getValue("requestSearch").toLowerCase();

    const status = getValue("requestStatusFilter").toLowerCase();

    exchanges = exchanges.filter((exchange) => {
      const text = `${exchange.requester_name || ""}
                         ${exchange.requested_book_title || ""}
                         ${exchange.offered_book_title || ""}`.toLowerCase();

      return (
        (!search || text.includes(search)) &&
        (!status || String(exchange.status || "").toLowerCase() === status)
      );
    });

    renderIncomingExchanges(exchanges);
  } catch (error) {
    container.innerHTML = `
            <div class="alert alert-danger">
                ${App.escapeHtml(error.message)}
            </div>
        `;
  }
}

// ============================================================
// RENDER INCOMING EXCHANGES
// ============================================================

function renderIncomingExchanges(exchanges) {
  const container = document.getElementById("incomingExchangeRequests");

  if (!exchanges.length) {
    container.innerHTML = `
            <div class="empty-state">

                <h3>No incoming requests</h3>

                <p>
                    Requests from other users
                    will appear here.
                </p>

            </div>
        `;

    return;
  }

  container.innerHTML = exchanges
    .map((exchange) => {
      const id = exchange.id || exchange.exchange_id;

      const status = String(exchange.status || "pending").toLowerCase();

      let actions = "";

      if (status === "pending") {
        actions = `
                        <div class="exchange-actions">

                            <button
                                class="btn btn-success"
                                onclick="updateExchangeStatus('${id}','accepted')"
                            >
                                Accept
                            </button>

                            <button
                                class="btn btn-danger"
                                onclick="updateExchangeStatus('${id}','rejected')"
                            >
                                Reject
                            </button>

                        </div>
                    `;
      }

      if (status === "accepted") {
        actions = `
                        <div class="exchange-actions">

                            <button
                                class="btn btn-success"
                                onclick="updateExchangeStatus('${id}','completed')"
                            >
                                Mark Completed
                            </button>

                        </div>
                    `;
      }

      return `
                    <div class="exchange-item">

                        <div>

                            <h3>
                                ${App.escapeHtml(
                                  exchange.requested_book_title ||
                                    "Requested Book",
                                )}
                            </h3>

                            <p>
                                Requested by:
                                <strong>
                                    ${App.escapeHtml(
                                      exchange.requester_name || "User",
                                    )}
                                </strong>
                            </p>

                            <p>
                                Offered Book:
                                <strong>
                                    ${App.escapeHtml(
                                      exchange.offered_book_title || "-",
                                    )}
                                </strong>
                            </p>

                            <p>
                                ${App.formatDate(exchange.created_at)}
                            </p>

                            <br>

                            ${App.statusBadge(status)}

                        </div>

                        ${actions}

                    </div>
                `;
    })
    .join("");
}

// ============================================================
// UPDATE EXCHANGE STATUS
// ============================================================

async function updateExchangeStatus(id, status) {
  try {
    await App.apiFetch(`/exchanges/${encodeURIComponent(id)}/status`, {
      method: "PATCH",

      auth: "user",

      body: {
        status,
      },
    });

    if (App.currentPage() === "exchange-requests.html") {
      await loadIncomingExchanges();
    }

    if (App.currentPage() === "my-exchanges.html") {
      await loadMyExchanges();
    }
  } catch (error) {
    alert(error.message);
  }
}

window.updateExchangeStatus = updateExchangeStatus;

// ============================================================
// MY EXCHANGES PAGE
// ============================================================

async function initMyExchangesPage() {
  const search = document.getElementById("exchangeSearch");

  const status = document.getElementById("exchangeStatus");

  if (search) {
    search.addEventListener("input", loadMyExchanges);
  }

  if (status) {
    status.addEventListener("change", loadMyExchanges);
  }

  await loadMyExchanges();
}

// ============================================================
// LOAD MY EXCHANGES
// ============================================================

async function loadMyExchanges() {
  const container = document.getElementById("myExchangeList");

  if (!container) {
    return;
  }

  try {
    const response = await App.apiFetch("/exchanges/my", {
      auth: "user",
    });

    let exchanges = App.getArray(response, "exchanges");

    updateExchangeStatistics(exchanges);

    const search = getValue("exchangeSearch").toLowerCase();

    const status = getValue("exchangeStatus").toLowerCase();

    exchanges = exchanges.filter((exchange) => {
      const text = `${exchange.requested_book_title || ""}
                         ${exchange.offered_book_title || ""}
                         ${exchange.requester_name || ""}
                         ${exchange.owner_name || ""}`.toLowerCase();

      return (
        (!search || text.includes(search)) &&
        (!status || String(exchange.status || "").toLowerCase() === status)
      );
    });

    renderMyExchanges(exchanges);
  } catch (error) {
    container.innerHTML = `
            <div class="alert alert-danger">
                ${App.escapeHtml(error.message)}
            </div>
        `;
  }
}

// ============================================================
// EXCHANGE STATISTICS
// ============================================================

function updateExchangeStatistics(exchanges) {
  const count = (status) =>
    exchanges.filter(
      (item) => String(item.status || "").toLowerCase() === status,
    ).length;

  setText("pendingExchangeCount", count("pending"));

  setText("acceptedExchangeCount", count("accepted"));

  setText("completedExchangeCount", count("completed"));

  setText("rejectedExchangeCount", count("rejected"));
}

// ============================================================
// RENDER MY EXCHANGES
// ============================================================

function renderMyExchanges(exchanges) {
  const container = document.getElementById("myExchangeList");

  if (!exchanges.length) {
    container.innerHTML = `
            <div class="empty-state">

                <h3>No exchanges found</h3>

                <p>
                    Browse books and send
                    an exchange request.
                </p>

                <a
                    href="browse-books.html"
                    class="btn btn-dark"
                >
                    Browse Books
                </a>

            </div>
        `;

    return;
  }

  container.innerHTML = exchanges
    .map((exchange) => {
      const id = exchange.id || exchange.exchange_id;

      const status = String(exchange.status || "pending").toLowerCase();

      const cancelButton =
        status === "pending"
          ? `
                            <button
                                class="btn btn-danger"
                                onclick="updateExchangeStatus('${id}','cancelled')"
                            >
                                Cancel
                            </button>
                        `
          : "";

      return `
                    <div class="exchange-item">

                        <div>

                            <h3>
                                ${App.escapeHtml(
                                  exchange.requested_book_title ||
                                    "Requested Book",
                                )}
                            </h3>

                            <p>
                                Your Offer:
                                <strong>
                                    ${App.escapeHtml(
                                      exchange.offered_book_title || "-",
                                    )}
                                </strong>
                            </p>

                            <p>
                                ${App.formatDate(exchange.created_at)}
                            </p>

                            <br>

                            ${App.statusBadge(status)}

                        </div>

                        <div class="exchange-actions">

                            ${cancelButton}

                        </div>

                    </div>
                `;
    })
    .join("");
}

// ============================================================
// WISHLIST PAGE
// ============================================================

async function initWishlistPage() {
  await loadCategorySelect("wishlistCategory");

  const search = document.getElementById("wishlistSearch");

  const category = document.getElementById("wishlistCategory");

  if (search) {
    search.addEventListener("input", filterWishlist);
  }

  if (category) {
    category.addEventListener("change", filterWishlist);
  }

  await loadWishlist();
}

// ============================================================
// LOAD WISHLIST
// ============================================================

async function loadWishlist() {
  try {
    const response = await App.apiFetch("/wishlist", {
      auth: "user",
    });

    wishlistCache = App.getArray(response, "books", "wishlist");

    renderWishlist(wishlistCache);
  } catch (error) {
    const container = document.getElementById("wishlistGrid");

    if (container) {
      container.innerHTML = `
                <div class="alert alert-danger">
                    ${App.escapeHtml(error.message)}
                </div>
            `;
    }
  }
}

// ============================================================
// FILTER WISHLIST
// ============================================================

function filterWishlist() {
  const search = getValue("wishlistSearch").toLowerCase();

  const category = getValue("wishlistCategory");

  const filtered = wishlistCache.filter((book) => {
    const text = `${book.title || ""}
                     ${book.author || ""}`.toLowerCase();

    return (
      (!search || text.includes(search)) &&
      (!category || String(book.category_id || "") === String(category))
    );
  });

  renderWishlist(filtered);
}

// ============================================================
// RENDER WISHLIST
// ============================================================

function renderWishlist(books) {
  const container = document.getElementById("wishlistGrid");

  setText("wishlistBookCount", books.length);

  if (!container) {
    return;
  }

  if (!books.length) {
    container.innerHTML = `
            <div class="empty-state">

                <img
                    src="../assets/images/book-placeholder.svg"
                    alt="Wishlist"
                >

                <h3>Your wishlist is empty</h3>

                <p>
                    Save books that interest you.
                </p>

                <a
                    href="browse-books.html"
                    class="btn btn-dark"
                >
                    Find Books
                </a>

            </div>
        `;

    return;
  }

  container.innerHTML = books
    .map((book) => {
      const id = getBookId(book);

      return `
                    <article class="book-card">

                        <div class="book-image">

                            <img
                                src="${bookImage(book)}"
                                alt="${App.escapeHtml(book.title)}"
                                onerror="this.src='../assets/images/book-placeholder.svg'"
                            >

                        </div>

                        <div class="book-content">

                            <h3 class="book-title">
                                ${App.escapeHtml(book.title)}
                            </h3>

                            <p class="book-author">
                                by ${App.escapeHtml(
                                  book.author || "Unknown Author",
                                )}
                            </p>

                            <a
                                href="book-details.html?id=${encodeURIComponent(id)}"
                                class="btn btn-dark btn-full"
                            >
                                View Book
                            </a>

                            <br><br>

                            <button
                                class="btn btn-light btn-full"
                                onclick="removeWishlistBook('${id}')"
                            >
                                Remove
                            </button>

                        </div>

                    </article>
                `;
    })
    .join("");
}

// ============================================================
// REMOVE WISHLIST
// ============================================================

async function removeWishlistBook(id) {
  try {
    await App.apiFetch(`/wishlist/${encodeURIComponent(id)}`, {
      method: "DELETE",
      auth: "user",
    });

    await loadWishlist();
  } catch (error) {
    alert(error.message);
  }
}

window.removeWishlistBook = removeWishlistBook;

// ============================================================
// MESSAGES
// ============================================================

async function initMessagesPage() {
  const search = document.getElementById("conversationSearch");

  if (search) {
    search.addEventListener("input", loadConversations);
  }

  const form = document.getElementById("messageForm");

  if (form) {
    form.addEventListener("submit", sendMessage);
  }

  await loadConversations();

  const userId = App.getQueryParam("userId");

  if (userId) {
    await openConversation(userId);
  }
}

// ============================================================
// LOAD CONVERSATIONS
// ============================================================

async function loadConversations() {
  const container = document.getElementById("conversationList");

  if (!container) {
    return;
  }

  try {
    const response = await App.apiFetch("/messages/conversations", {
      auth: "user",
    });

    let conversations = App.getArray(response, "conversations");

    const search = getValue("conversationSearch").toLowerCase();

    if (search) {
      conversations = conversations.filter((item) =>
        String(item.name || item.user_name || "")
          .toLowerCase()
          .includes(search),
      );
    }

    if (!conversations.length) {
      container.innerHTML = `
                <div class="empty-state">

                    <h3>No conversations</h3>

                    <p>
                        Your conversations
                        will appear here.
                    </p>

                </div>
            `;

      return;
    }

    container.innerHTML = conversations
      .map((item) => {
        const userId = item.user_id || item.id;

        const name = item.user_name || item.name || "User";

        return `
                        <div
                            class="chat-user"
                            onclick="openConversation('${userId}')"
                        >

                            <img
                                src="${App.getImageUrl(
                                  item.profile_image ||
                                    "assets/images/logo.png",
                                  "assets/images/logo.png",
                                )}"
                                alt="User"
                            >

                            <div class="chat-user-info">

                                <strong>
                                    ${App.escapeHtml(name)}
                                </strong>

                                <small>
                                    ${App.escapeHtml(
                                      item.last_message || "Open conversation",
                                    )}
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
// OPEN CONVERSATION
// ============================================================

async function openConversation(userId) {
  currentChatUserId = userId;

  try {
    const response = await App.apiFetch(
      `/messages/${encodeURIComponent(userId)}`,
      {
        auth: "user",
      },
    );

    const messages = App.getArray(response, "messages");

    const otherUser = response.user || response.otherUser || {};

    setText(
      "chatHeader",
      otherUser.name ||
        otherUser.full_name ||
        response.userName ||
        "Conversation",
    );

    renderMessages(messages);
  } catch (error) {
    alert(error.message);
  }
}

window.openConversation = openConversation;

// ============================================================
// RENDER MESSAGES
// ============================================================

function renderMessages(messages) {
  const container = document.getElementById("chatMessages");

  if (!container) {
    return;
  }

  if (!messages.length) {
    container.innerHTML = `
            <div class="empty-state">

                <h3>No messages yet</h3>

                <p>
                    Send the first message.
                </p>

            </div>
        `;

    return;
  }

  const currentUser = App.getUserData() || {};

  const currentUserId = currentUser.id || currentUser.user_id;

  container.innerHTML = messages
    .map((message) => {
      const senderId = message.sender_id || message.senderId;

      const sent = String(senderId) === String(currentUserId);

      return `
                    <div
                        class="message ${sent ? "sent" : "received"}"
                    >

                        ${App.escapeHtml(
                          message.message || message.content || "",
                        )}

                        <span class="message-time">

                            ${App.formatDateTime(message.created_at)}

                        </span>

                    </div>
                `;
    })
    .join("");

  container.scrollTop = container.scrollHeight;
}

// ============================================================
// SEND MESSAGE
// ============================================================

async function sendMessage(event) {
  event.preventDefault();

  if (!currentChatUserId) {
    alert("Please select a conversation first.");

    return;
  }

  const input = document.getElementById("messageInput");

  const message = input.value.trim();

  if (!message) {
    return;
  }

  const button = event.currentTarget.querySelector('button[type="submit"]');

  try {
    App.buttonLoading(button, true, "Send");

    await App.apiFetch("/messages", {
      method: "POST",

      auth: "user",

      body: {
        receiverId: currentChatUserId,

        message,
      },
    });

    input.value = "";

    await openConversation(currentChatUserId);

    await loadConversations();
  } catch (error) {
    alert(error.message);
  } finally {
    App.buttonLoading(button, false);
  }
}

// ============================================================
// GENERAL HELPERS
// ============================================================

function getBookId(book) {
  return book.id || book.book_id || book.bookId || "";
}

function bookImage(book) {
  return App.getImageUrl(
    book.image_url ||
      book.image ||
      book.cover_image ||
      "assets/images/book-placeholder.svg",
  );
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value ?? "";
  }
}

function setValue(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.value = value ?? "";
  }
}

function getValue(id) {
  const element = document.getElementById(id);

  if (!element) {
    return "";
  }

  return String(element.value || "").trim();
}
