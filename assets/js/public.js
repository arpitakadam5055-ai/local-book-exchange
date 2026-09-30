// ============================================================
// LOCAL BOOK EXCHANGE
// PUBLIC WEBSITE JAVASCRIPT
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  initPublicSearch();

  initContactForm();

  loadPublicBooks();

  loadPublicCategories();

  updatePublicNavigation();
});

// ============================================================
// PUBLIC NAVIGATION
// ============================================================

function updatePublicNavigation() {
  const userToken = App.getUserToken();

  const loginLinks = document.querySelectorAll("[data-login-link]");

  const dashboardLinks = document.querySelectorAll("[data-dashboard-link]");

  loginLinks.forEach((link) => {
    link.style.display = userToken ? "none" : "";
  });

  dashboardLinks.forEach((link) => {
    link.style.display = userToken ? "" : "none";
  });
}

// ============================================================
// PUBLIC SEARCH
// ============================================================

function initPublicSearch() {
  const searchBox = document.querySelector(".search-box input");

  const searchButton = document.querySelector(".search-box button");

  if (!searchBox) {
    return;
  }

  function search() {
    const value = searchBox.value.trim();

    if (!value) {
      window.location.href = "user/browse-books.html";

      return;
    }

    window.location.href =
      "user/browse-books.html?search=" + encodeURIComponent(value);
  }

  if (searchButton) {
    searchButton.addEventListener("click", search);
  }

  searchBox.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();

      search();
    }
  });
}

// ============================================================
// LOAD PUBLIC BOOKS
// ============================================================

async function loadPublicBooks() {
  const container = document.getElementById("featuredBooks");

  if (!container) {
    return;
  }

  try {
    const response = await App.apiFetch("/books");

    const books = App.getArray(response, "books", "items");

    const available = books
      .filter((book) => !book.status || book.status === "available")
      .slice(0, 8);

    if (available.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <h3>No books available</h3>
                    <p>
                        Books added by users will appear here.
                    </p>
                </div>
            `;

      return;
    }

    container.innerHTML = available.map(publicBookCard).join("");
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
// PUBLIC BOOK CARD
// ============================================================

function publicBookCard(book) {
  const id = book.id || book.book_id;

  const title = book.title || "Untitled Book";

  const author = book.author || "Unknown Author";

  const image = App.getImageUrl(
    book.image_url || book.image || book.cover_image,
  );

  const category = book.category_name || book.category || "Book";

  const condition = App.capitalize(book.condition || "Available");

  return `
        <article class="book-card">

            <div class="book-image">

                <img
                    src="${App.escapeHtml(image)}"
                    alt="${App.escapeHtml(title)}"
                    onerror="this.src='assets/images/book-placeholder.svg'"
                >

            </div>

            <div class="book-content">

                <h3 class="book-title">
                    ${App.escapeHtml(title)}
                </h3>

                <p class="book-author">
                    by ${App.escapeHtml(author)}
                </p>

                <div class="book-meta">

                    <span class="badge badge-primary">
                        ${App.escapeHtml(category)}
                    </span>

                    <span class="badge badge-success">
                        ${App.escapeHtml(condition)}
                    </span>

                </div>

                <a
                    href="user/book-details.html?id=${encodeURIComponent(id)}"
                    class="btn btn-dark btn-full"
                >
                    View Book
                </a>

            </div>

        </article>
    `;
}

// ============================================================
// LOAD CATEGORIES
// ============================================================

async function loadPublicCategories() {
  const container = document.getElementById("publicCategories");

  if (!container) {
    return;
  }

  try {
    const response = await App.apiFetch("/categories");

    const categories = App.getArray(response, "categories");

    container.innerHTML = categories
      .map((category) => {
        const name = category.name || category.category_name;

        return `
                        <a
                            class="card"
                            href="user/browse-books.html?category=${encodeURIComponent(name)}"
                        >
                            <h3>
                                ${App.escapeHtml(name)}
                            </h3>

                            <p>
                                Browse available books
                            </p>
                        </a>
                    `;
      })
      .join("");
  } catch (error) {
    console.error(error);
  }
}

// ============================================================
// CONTACT FORM
// ============================================================

function initContactForm() {
  const form = document.getElementById("contactForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = new FormData(form);

    const body = {
      name: formData.get("name"),

      email: formData.get("email"),

      subject: formData.get("subject"),

      message: formData.get("message"),
    };

    const button = form.querySelector('button[type="submit"]');

    App.buttonLoading(button, true, "Sending...");

    try {
      const response = await App.apiFetch("/contact", {
        method: "POST",
        body,
      });

      App.setMessage(
        "contactMessage",
        response.message || "Message sent successfully.",
        "success",
      );

      form.reset();
    } catch (error) {
      App.setMessage("contactMessage", error.message, "danger");
    } finally {
      App.buttonLoading(button, false);
    }
  });
}
