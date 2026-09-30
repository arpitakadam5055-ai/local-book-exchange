// ============================================================
// LOCAL BOOK EXCHANGE
// Validation Helper
// File: lib/helpers/validation.js
// ============================================================

// ============================================================
// STRING
// ============================================================

function cleanString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

// ============================================================
// EMAIL
// ============================================================

function normalizeEmail(value) {
  return cleanString(value).toLowerCase();
}

function isValidEmail(value) {
  const email = normalizeEmail(value);

  if (!email) {
    return false;
  }

  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return pattern.test(email);
}

// ============================================================
// PHONE
// ============================================================

function normalizePhone(value) {
  return cleanString(value).replace(/[^\d+]/g, "");
}

function isValidPhone(value) {
  const phone = normalizePhone(value);

  if (!phone) {
    return true;
  }

  return /^\+?[0-9]{10,15}$/.test(phone);
}

// ============================================================
// PASSWORD
// ============================================================

function isValidPassword(password, minimumLength = 6) {
  if (typeof password !== "string") {
    return false;
  }

  return password.length >= minimumLength;
}

function passwordsMatch(password, confirmPassword) {
  return String(password || "") === String(confirmPassword || "");
}

// ============================================================
// REQUIRED VALUE
// ============================================================

function isRequired(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}

// ============================================================
// INTEGER
// ============================================================

function isPositiveInteger(value) {
  const number = Number(value);

  return Number.isInteger(number) && number > 0;
}

// ============================================================
// POSTGRESQL INTEGER ID
// ============================================================

function isValidId(value) {
  return isPositiveInteger(value);
}

// ============================================================
// NUMBER RANGE
// ============================================================

function isNumberBetween(value, minimum, maximum) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return false;
  }

  return number >= minimum && number <= maximum;
}

// ============================================================
// YEAR
// ============================================================

function isValidYear(value) {
  if (value === null || value === undefined || value === "") {
    return true;
  }

  const year = Number(value);

  const currentYear = new Date().getFullYear();

  return Number.isInteger(year) && year >= 1000 && year <= currentYear + 1;
}

// ============================================================
// TEXT LENGTH
// ============================================================

function hasMinimumLength(value, minimum) {
  return cleanString(value).length >= minimum;
}

function hasMaximumLength(value, maximum) {
  return cleanString(value).length <= maximum;
}

function isLengthBetween(value, minimum, maximum) {
  const length = cleanString(value).length;

  return length >= minimum && length <= maximum;
}

// ============================================================
// ALLOWED VALUE
// ============================================================

function isAllowedValue(value, allowedValues) {
  if (!Array.isArray(allowedValues)) {
    return false;
  }

  const normalized = cleanString(value).toLowerCase();

  return allowedValues
    .map((item) => String(item).toLowerCase())
    .includes(normalized);
}

// ============================================================
// USER STATUS
// ============================================================

function isValidUserStatus(value) {
  return isAllowedValue(value, ["active", "inactive", "blocked"]);
}

// ============================================================
// ADMIN STATUS
// ============================================================

function isValidAdminStatus(value) {
  return isAllowedValue(value, ["active", "inactive"]);
}

// ============================================================
// CATEGORY STATUS
// ============================================================

function isValidCategoryStatus(value) {
  return isAllowedValue(value, ["active", "inactive"]);
}

// ============================================================
// BOOK CONDITION
// ============================================================

function isValidBookCondition(value) {
  return isAllowedValue(value, ["new", "good", "fair", "poor"]);
}

// ============================================================
// BOOK STATUS
// ============================================================

function isValidBookStatus(value) {
  return isAllowedValue(value, [
    "available",
    "reserved",
    "exchanged",
    "inactive",
  ]);
}

// ============================================================
// EXCHANGE STATUS
// ============================================================

function isValidExchangeStatus(value) {
  return isAllowedValue(value, [
    "pending",
    "accepted",
    "rejected",
    "completed",
    "cancelled",
  ]);
}

// ============================================================
// IMAGE MIME TYPE
// ============================================================

function isImageMimeType(value) {
  const type = cleanString(value).toLowerCase();

  return [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ].includes(type);
}

// ============================================================
// FILE SIZE
// ============================================================

function isFileSizeAllowed(bytes, maxMegabytes = 2) {
  const size = Number(bytes);

  if (Number.isNaN(size) || size < 0) {
    return false;
  }

  const maximum = maxMegabytes * 1024 * 1024;

  return size <= maximum;
}

// ============================================================
// VALIDATE REGISTRATION
// ============================================================

function validateRegistration(data) {
  const errors = [];

  const fullName = cleanString(data.fullName || data.full_name);

  const email = normalizeEmail(data.email);

  const phone = cleanString(data.phone);

  const location = cleanString(data.location);

  const password = String(data.password || "");

  if (!fullName) {
    errors.push("Full name is required.");
  }

  if (fullName && fullName.length < 2) {
    errors.push("Full name must contain at least 2 characters.");
  }

  if (!email) {
    errors.push("Email address is required.");
  } else if (!isValidEmail(email)) {
    errors.push("Please enter a valid email address.");
  }

  if (phone && !isValidPhone(phone)) {
    errors.push("Please enter a valid phone number.");
  }

  if (!location) {
    errors.push("Location is required.");
  }

  if (!isValidPassword(password)) {
    errors.push("Password must contain at least 6 characters.");
  }

  return {
    valid: errors.length === 0,

    errors,

    data: {
      fullName,

      email,

      phone: normalizePhone(phone),

      location,

      password,
    },
  };
}

// ============================================================
// VALIDATE LOGIN
// ============================================================

function validateLogin(data) {
  const errors = [];

  const email = normalizeEmail(data.email);

  const password = String(data.password || "");

  if (!email || !isValidEmail(email)) {
    errors.push("Please enter a valid email address.");
  }

  if (!password) {
    errors.push("Password is required.");
  }

  return {
    valid: errors.length === 0,

    errors,

    data: {
      email,
      password,
    },
  };
}

// ============================================================
// VALIDATE BOOK
// ============================================================

function validateBook(data) {
  const errors = [];

  const title = cleanString(data.title);

  const author = cleanString(data.author);

  const categoryId = data.categoryId || data.category_id;

  const condition = cleanString(data.condition).toLowerCase();

  const language = cleanString(data.language);

  const publicationYear = data.publicationYear || data.publication_year || null;

  const description = cleanString(data.description);

  if (!title) {
    errors.push("Book title is required.");
  }

  if (title.length > 200) {
    errors.push("Book title must not exceed 200 characters.");
  }

  if (!author) {
    errors.push("Author name is required.");
  }

  if (author.length > 150) {
    errors.push("Author name must not exceed 150 characters.");
  }

  if (!isValidId(categoryId)) {
    errors.push("Please select a valid category.");
  }

  if (!isValidBookCondition(condition)) {
    errors.push("Please select a valid book condition.");
  }

  if (publicationYear && !isValidYear(publicationYear)) {
    errors.push("Please enter a valid publication year.");
  }

  if (!description) {
    errors.push("Book description is required.");
  }

  if (description.length > 3000) {
    errors.push("Book description must not exceed 3000 characters.");
  }

  return {
    valid: errors.length === 0,

    errors,

    data: {
      title,

      author,

      categoryId: Number(categoryId),

      condition,

      language,

      publicationYear: publicationYear ? Number(publicationYear) : null,

      description,
    },
  };
}

// ============================================================
// VALIDATE CATEGORY
// ============================================================

function validateCategory(data) {
  const errors = [];

  const name = cleanString(data.name);

  const description = cleanString(data.description);

  const status = cleanString(data.status || "active").toLowerCase();

  if (!name) {
    errors.push("Category name is required.");
  }

  if (name.length > 100) {
    errors.push("Category name must not exceed 100 characters.");
  }

  if (description.length > 1000) {
    errors.push("Category description must not exceed 1000 characters.");
  }

  if (!isValidCategoryStatus(status)) {
    errors.push("Invalid category status.");
  }

  return {
    valid: errors.length === 0,

    errors,

    data: {
      name,
      description,
      status,
    },
  };
}

// ============================================================
// VALIDATE EXCHANGE REQUEST
// ============================================================

function validateExchangeRequest(data) {
  const errors = [];

  const requestedBookId = data.requestedBookId || data.requested_book_id;

  const offeredBookId = data.offeredBookId || data.offered_book_id;

  const message = cleanString(data.message);

  if (!isValidId(requestedBookId)) {
    errors.push("Requested book is invalid.");
  }

  if (!isValidId(offeredBookId)) {
    errors.push("Offered book is invalid.");
  }

  if (String(requestedBookId) === String(offeredBookId)) {
    errors.push("Requested book and offered book cannot be the same.");
  }

  if (message.length > 1000) {
    errors.push("Exchange message must not exceed 1000 characters.");
  }

  return {
    valid: errors.length === 0,

    errors,

    data: {
      requestedBookId: Number(requestedBookId),

      offeredBookId: Number(offeredBookId),

      message,
    },
  };
}

// ============================================================
// VALIDATE MESSAGE
// ============================================================

function validateMessage(data) {
  const errors = [];

  const receiverId =
    data.receiverId || data.receiver_id || data.userId || data.user_id;

  const message = cleanString(data.message);

  if (!isValidId(receiverId)) {
    errors.push("Message receiver is invalid.");
  }

  if (!message) {
    errors.push("Message cannot be empty.");
  }

  if (message.length > 2000) {
    errors.push("Message must not exceed 2000 characters.");
  }

  return {
    valid: errors.length === 0,

    errors,

    data: {
      receiverId: Number(receiverId),

      message,
    },
  };
}

// ============================================================
// VALIDATE CONTACT FORM
// ============================================================

function validateContact(data) {
  const errors = [];

  const name = cleanString(data.name);

  const email = normalizeEmail(data.email);

  const subject = cleanString(data.subject);

  const message = cleanString(data.message);

  if (!name) {
    errors.push("Name is required.");
  }

  if (!email || !isValidEmail(email)) {
    errors.push("Please enter a valid email address.");
  }

  if (!subject) {
    errors.push("Subject is required.");
  }

  if (subject.length > 200) {
    errors.push("Subject must not exceed 200 characters.");
  }

  if (!message) {
    errors.push("Message is required.");
  }

  if (message.length > 5000) {
    errors.push("Message must not exceed 5000 characters.");
  }

  return {
    valid: errors.length === 0,

    errors,

    data: {
      name,
      email,
      subject,
      message,
    },
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  cleanString,

  normalizeEmail,

  normalizePhone,

  isValidEmail,

  isValidPhone,

  isValidPassword,

  passwordsMatch,

  isRequired,

  isPositiveInteger,

  isValidId,

  isNumberBetween,

  isValidYear,

  hasMinimumLength,

  hasMaximumLength,

  isLengthBetween,

  isAllowedValue,

  isValidUserStatus,

  isValidAdminStatus,

  isValidCategoryStatus,

  isValidBookCondition,

  isValidBookStatus,

  isValidExchangeStatus,

  isImageMimeType,

  isFileSizeAllowed,

  validateRegistration,

  validateLogin,

  validateBook,

  validateCategory,

  validateExchangeRequest,

  validateMessage,

  validateContact,
};
