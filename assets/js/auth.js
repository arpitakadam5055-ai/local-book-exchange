// ============================================================
// LOCAL BOOK EXCHANGE
// AUTHENTICATION JAVASCRIPT
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  initRegister();

  initUserLogin();

  initAdminLogin();

  showFlashMessages();
});

// ============================================================
// REGISTER
// ============================================================

function initRegister() {
  const form = document.getElementById("registerForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();

    const email = document.getElementById("email").value.trim();

    const phone = document.getElementById("phone").value.trim();

    const location = document.getElementById("location").value.trim();

    const password = document.getElementById("password").value;

    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      App.setMessage("registerMessage", "Passwords do not match.", "danger");

      return;
    }

    if (password.length < 6) {
      App.setMessage(
        "registerMessage",
        "Password must contain at least 6 characters.",
        "danger",
      );

      return;
    }

    const button = form.querySelector('button[type="submit"]');

    App.buttonLoading(button, true, "Creating Account...");

    try {
      const response = await App.apiFetch("/auth/register", {
        method: "POST",

        body: {
          fullName,
          email,
          phone,
          location,
          password,
        },
      });

      // Automatically login if API returns token
      if (response.token) {
        App.setUserToken(response.token);

        if (response.user) {
          App.setUserData(response.user);
        }

        window.location.href = "dashboard.html";

        return;
      }

      sessionStorage.setItem(
        "lbe_flash_message",
        response.message || "Registration successful. Please login.",
      );

      window.location.href = "login.html";
    } catch (error) {
      App.setMessage("registerMessage", error.message, "danger");
    } finally {
      App.buttonLoading(button, false);
    }
  });
}

// ============================================================
// USER LOGIN
// ============================================================

function initUserLogin() {
  const form = document.getElementById("userLoginForm");

  if (!form) {
    return;
  }

  // Already logged in
  if (App.getUserToken()) {
    window.location.href = "dashboard.html";

    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();

    const password = document.getElementById("password").value;

    const button = form.querySelector('button[type="submit"]');

    App.buttonLoading(button, true, "Logging in...");

    try {
      const response = await App.apiFetch("/auth/login", {
        method: "POST",

        body: {
          email,
          password,
        },
      });

      if (!response.token) {
        throw new Error("Login token was not returned by the server.");
      }

      App.setUserToken(response.token);

      if (response.user) {
        App.setUserData(response.user);
      }

      window.location.href = "dashboard.html";
    } catch (error) {
      App.setMessage("loginMessage", error.message, "danger");
    } finally {
      App.buttonLoading(button, false);
    }
  });
}

// ============================================================
// ADMIN LOGIN
// ============================================================

function initAdminLogin() {
  const form = document.getElementById("adminLoginForm");

  if (!form) {
    return;
  }

  if (App.getAdminToken()) {
    window.location.href = "dashboard.html";

    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();

    const password = document.getElementById("password").value;

    const button = form.querySelector('button[type="submit"]');

    App.buttonLoading(button, true, "Logging in...");

    try {
      const response = await App.apiFetch("/auth/admin-login", {
        method: "POST",

        body: {
          email,
          password,
        },
      });

      if (!response.token) {
        throw new Error("Admin login token was not returned.");
      }

      App.setAdminToken(response.token);

      if (response.admin) {
        App.setAdminData(response.admin);
      }

      window.location.href = "dashboard.html";
    } catch (error) {
      App.setMessage("loginMessage", error.message, "danger");
    } finally {
      App.buttonLoading(button, false);
    }
  });
}

// ============================================================
// FLASH MESSAGES
// ============================================================

function showFlashMessages() {
  const userMessage = App.getFlashMessage("lbe_flash_message");

  if (userMessage && document.getElementById("loginMessage")) {
    App.setMessage("loginMessage", userMessage, "success");
  }

  const adminMessage = App.getFlashMessage("lbe_admin_flash_message");

  if (adminMessage && document.getElementById("loginMessage")) {
    App.setMessage("loginMessage", adminMessage, "info");
  }
}
