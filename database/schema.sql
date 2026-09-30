-- ============================================================
-- LOCAL BOOK EXCHANGE
-- PostgreSQL / Neon Database Schema
-- File: database/schema.sql
-- ============================================================


-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users
(
    id SERIAL PRIMARY KEY,

    full_name VARCHAR(150) NOT NULL,

    email VARCHAR(255) NOT NULL,

    phone VARCHAR(20),

    location VARCHAR(255) NOT NULL,

    bio TEXT,

    profile_image TEXT,

    password_hash TEXT NOT NULL,

    status VARCHAR(20)
        NOT NULL
        DEFAULT 'active',

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT users_status_check
        CHECK
        (
            status IN
            (
                'active',
                'inactive',
                'blocked'
            )
        )
);


-- Email must be unique even if letter case differs
CREATE UNIQUE INDEX IF NOT EXISTS
users_email_lower_unique
ON users
(
    LOWER(email)
);


-- ============================================================
-- ADMINS
-- ============================================================

CREATE TABLE IF NOT EXISTS admins
(
    id SERIAL PRIMARY KEY,

    full_name VARCHAR(150) NOT NULL,

    email VARCHAR(255) NOT NULL,

    phone VARCHAR(20),

    password_hash TEXT NOT NULL,

    status VARCHAR(20)
        NOT NULL
        DEFAULT 'active',

    last_login TIMESTAMPTZ,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT admins_status_check
        CHECK
        (
            status IN
            (
                'active',
                'inactive'
            )
        )
);


CREATE UNIQUE INDEX IF NOT EXISTS
admins_email_lower_unique
ON admins
(
    LOWER(email)
);


-- ============================================================
-- CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS categories
(
    id SERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    description TEXT,

    status VARCHAR(20)
        NOT NULL
        DEFAULT 'active',

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT categories_status_check
        CHECK
        (
            status IN
            (
                'active',
                'inactive'
            )
        )
);


CREATE UNIQUE INDEX IF NOT EXISTS
categories_name_lower_unique
ON categories
(
    LOWER(name)
);


-- ============================================================
-- BOOKS
-- ============================================================

CREATE TABLE IF NOT EXISTS books
(
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    category_id INTEGER,

    title VARCHAR(200) NOT NULL,

    author VARCHAR(150) NOT NULL,

    book_condition VARCHAR(20) NOT NULL,

    language VARCHAR(100),

    publication_year INTEGER,

    description TEXT NOT NULL,

    image_url TEXT,

    status VARCHAR(20)
        NOT NULL
        DEFAULT 'available',

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT books_user_fk
        FOREIGN KEY
        (
            user_id
        )
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT books_category_fk
        FOREIGN KEY
        (
            category_id
        )
        REFERENCES categories(id)
        ON DELETE RESTRICT,

    CONSTRAINT books_condition_check
        CHECK
        (
            book_condition IN
            (
                'new',
                'good',
                'fair',
                'poor'
            )
        ),

    CONSTRAINT books_status_check
        CHECK
        (
            status IN
            (
                'available',
                'reserved',
                'exchanged',
                'inactive'
            )
        ),

    CONSTRAINT books_year_check
        CHECK
        (
            publication_year IS NULL
            OR
            (
                publication_year >= 1000
                AND
                publication_year <= 2100
            )
        )
);


-- ============================================================
-- EXCHANGE REQUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS exchange_requests
(
    id SERIAL PRIMARY KEY,

    requester_id INTEGER NOT NULL,

    owner_id INTEGER NOT NULL,

    requested_book_id INTEGER NOT NULL,

    offered_book_id INTEGER NOT NULL,

    message TEXT,

    status VARCHAR(20)
        NOT NULL
        DEFAULT 'pending',

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT exchange_requester_fk
        FOREIGN KEY
        (
            requester_id
        )
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT exchange_owner_fk
        FOREIGN KEY
        (
            owner_id
        )
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT exchange_requested_book_fk
        FOREIGN KEY
        (
            requested_book_id
        )
        REFERENCES books(id)
        ON DELETE CASCADE,

    CONSTRAINT exchange_offered_book_fk
        FOREIGN KEY
        (
            offered_book_id
        )
        REFERENCES books(id)
        ON DELETE CASCADE,

    CONSTRAINT exchange_status_check
        CHECK
        (
            status IN
            (
                'pending',
                'accepted',
                'rejected',
                'completed',
                'cancelled'
            )
        ),

    CONSTRAINT exchange_different_users_check
        CHECK
        (
            requester_id <> owner_id
        ),

    CONSTRAINT exchange_different_books_check
        CHECK
        (
            requested_book_id <> offered_book_id
        )
);


-- ============================================================
-- WISHLIST
-- ============================================================

CREATE TABLE IF NOT EXISTS wishlist
(
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    book_id INTEGER NOT NULL,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT wishlist_user_fk
        FOREIGN KEY
        (
            user_id
        )
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT wishlist_book_fk
        FOREIGN KEY
        (
            book_id
        )
        REFERENCES books(id)
        ON DELETE CASCADE,

    CONSTRAINT wishlist_unique_book
        UNIQUE
        (
            user_id,
            book_id
        )
);


-- ============================================================
-- MESSAGES
--
-- sender_type / receiver_type:
--
-- user  -> user
-- user  -> admin
-- admin -> user
--
-- sender_id and receiver_id cannot use normal foreign keys
-- because their table depends on sender_type/receiver_type.
-- ============================================================

CREATE TABLE IF NOT EXISTS messages
(
    id SERIAL PRIMARY KEY,

    sender_type VARCHAR(20) NOT NULL,

    sender_id INTEGER NOT NULL,

    receiver_type VARCHAR(20) NOT NULL,

    receiver_id INTEGER NOT NULL,

    message TEXT NOT NULL,

    is_read BOOLEAN
        NOT NULL
        DEFAULT FALSE,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT messages_sender_type_check
        CHECK
        (
            sender_type IN
            (
                'user',
                'admin'
            )
        ),

    CONSTRAINT messages_receiver_type_check
        CHECK
        (
            receiver_type IN
            (
                'user',
                'admin'
            )
        ),

    CONSTRAINT messages_valid_pair_check
        CHECK
        (
            (
                sender_type = 'user'
                AND
                receiver_type = 'user'
            )
            OR
            (
                sender_type = 'user'
                AND
                receiver_type = 'admin'
            )
            OR
            (
                sender_type = 'admin'
                AND
                receiver_type = 'user'
            )
        ),

    CONSTRAINT messages_not_empty_check
        CHECK
        (
            LENGTH(
                TRIM(message)
            ) > 0
        )
);


-- ============================================================
-- CONTACT MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS contacts
(
    id SERIAL PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    email VARCHAR(255) NOT NULL,

    subject VARCHAR(200) NOT NULL,

    message TEXT NOT NULL,

    status VARCHAR(20)
        NOT NULL
        DEFAULT 'new',

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT contacts_status_check
        CHECK
        (
            status IN
            (
                'new',
                'read',
                'replied',
                'closed'
            )
        )
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
idx_books_user_id
ON books(user_id);


CREATE INDEX IF NOT EXISTS
idx_books_category_id
ON books(category_id);


CREATE INDEX IF NOT EXISTS
idx_books_status
ON books(status);


CREATE INDEX IF NOT EXISTS
idx_books_title_lower
ON books
(
    LOWER(title)
);


CREATE INDEX IF NOT EXISTS
idx_books_author_lower
ON books
(
    LOWER(author)
);


CREATE INDEX IF NOT EXISTS
idx_exchange_requester_id
ON exchange_requests(requester_id);


CREATE INDEX IF NOT EXISTS
idx_exchange_owner_id
ON exchange_requests(owner_id);


CREATE INDEX IF NOT EXISTS
idx_exchange_requested_book_id
ON exchange_requests(requested_book_id);


CREATE INDEX IF NOT EXISTS
idx_exchange_offered_book_id
ON exchange_requests(offered_book_id);


CREATE INDEX IF NOT EXISTS
idx_exchange_status
ON exchange_requests(status);


CREATE INDEX IF NOT EXISTS
idx_wishlist_user_id
ON wishlist(user_id);


CREATE INDEX IF NOT EXISTS
idx_wishlist_book_id
ON wishlist(book_id);


CREATE INDEX IF NOT EXISTS
idx_messages_sender
ON messages
(
    sender_type,
    sender_id
);


CREATE INDEX IF NOT EXISTS
idx_messages_receiver
ON messages
(
    receiver_type,
    receiver_id
);


CREATE INDEX IF NOT EXISTS
idx_messages_created_at
ON messages(created_at);


CREATE INDEX IF NOT EXISTS
idx_contacts_status
ON contacts(status);


-- ============================================================
-- PREVENT DUPLICATE PENDING REQUEST
--
-- A user cannot create two pending requests for the same book.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
exchange_unique_pending_request
ON exchange_requests
(
    requester_id,
    requested_book_id
)
WHERE status = 'pending';


-- ============================================================
-- AUTOMATIC updated_at FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION
set_updated_at()
RETURNS TRIGGER
AS
$$
BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;
$$
LANGUAGE plpgsql;


-- ============================================================
-- USERS UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS
trigger_users_updated_at
ON users;


CREATE TRIGGER
trigger_users_updated_at

BEFORE UPDATE
ON users

FOR EACH ROW

EXECUTE FUNCTION
set_updated_at();


-- ============================================================
-- ADMINS UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS
trigger_admins_updated_at
ON admins;


CREATE TRIGGER
trigger_admins_updated_at

BEFORE UPDATE
ON admins

FOR EACH ROW

EXECUTE FUNCTION
set_updated_at();


-- ============================================================
-- CATEGORIES UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS
trigger_categories_updated_at
ON categories;


CREATE TRIGGER
trigger_categories_updated_at

BEFORE UPDATE
ON categories

FOR EACH ROW

EXECUTE FUNCTION
set_updated_at();


-- ============================================================
-- BOOKS UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS
trigger_books_updated_at
ON books;


CREATE TRIGGER
trigger_books_updated_at

BEFORE UPDATE
ON books

FOR EACH ROW

EXECUTE FUNCTION
set_updated_at();


-- ============================================================
-- EXCHANGE UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS
trigger_exchange_updated_at
ON exchange_requests;


CREATE TRIGGER
trigger_exchange_updated_at

BEFORE UPDATE
ON exchange_requests

FOR EACH ROW

EXECUTE FUNCTION
set_updated_at();


-- ============================================================
-- CONTACT UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS
trigger_contacts_updated_at
ON contacts;


CREATE TRIGGER
trigger_contacts_updated_at

BEFORE UPDATE
ON contacts

FOR EACH ROW

EXECUTE FUNCTION
set_updated_at();


-- ============================================================
-- MESSAGE CLEANUP WHEN USER IS DELETED
--
-- messages has polymorphic sender/receiver IDs,
-- so this trigger removes messages belonging to deleted users.
-- ============================================================

CREATE OR REPLACE FUNCTION
delete_user_messages()
RETURNS TRIGGER
AS
$$
BEGIN

    DELETE FROM messages
    WHERE
        (
            sender_type = 'user'
            AND
            sender_id = OLD.id
        )
        OR
        (
            receiver_type = 'user'
            AND
            receiver_id = OLD.id
        );

    RETURN OLD;

END;
$$
LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS
trigger_delete_user_messages
ON users;


CREATE TRIGGER
trigger_delete_user_messages

BEFORE DELETE
ON users

FOR EACH ROW

EXECUTE FUNCTION
delete_user_messages();


-- ============================================================
-- MESSAGE CLEANUP WHEN ADMIN IS DELETED
-- ============================================================

CREATE OR REPLACE FUNCTION
delete_admin_messages()
RETURNS TRIGGER
AS
$$
BEGIN

    DELETE FROM messages
    WHERE
        (
            sender_type = 'admin'
            AND
            sender_id = OLD.id
        )
        OR
        (
            receiver_type = 'admin'
            AND
            receiver_id = OLD.id
        );

    RETURN OLD;

END;
$$
LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS
trigger_delete_admin_messages
ON admins;


CREATE TRIGGER
trigger_delete_admin_messages

BEFORE DELETE
ON admins

FOR EACH ROW

EXECUTE FUNCTION
delete_admin_messages();


-- ============================================================
-- DATABASE SCHEMA COMPLETE
-- ============================================================