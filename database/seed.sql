-- ============================================================
-- LOCAL BOOK EXCHANGE
-- Initial Database Seed
-- File: database/seed.sql
-- ============================================================


-- ============================================================
-- BOOK CATEGORIES
-- ============================================================

INSERT INTO categories
(
    name,
    description,
    status
)
VALUES

(
    'Fiction',
    'Novels, stories and fictional literature.',
    'active'
),

(
    'Non-Fiction',
    'Informational and factual books.',
    'active'
),

(
    'Academic',
    'School, college and university academic books.',
    'active'
),

(
    'Science & Technology',
    'Science, computers, programming and technology books.',
    'active'
),

(
    'History',
    'Historical events, civilizations and world history.',
    'active'
),

(
    'Biography',
    'Biographies, autobiographies and memoirs.',
    'active'
),

(
    'Self Help',
    'Personal development, motivation and self-improvement books.',
    'active'
),

(
    'Business & Finance',
    'Business, economics, entrepreneurship and finance books.',
    'active'
),

(
    'Children',
    'Books and stories for children.',
    'active'
),

(
    'Comics & Graphic Novels',
    'Comics, manga and graphic novels.',
    'active'
),

(
    'Competitive Exams',
    'Books for competitive examinations and entrance tests.',
    'active'
),

(
    'Marathi Literature',
    'Marathi novels, stories, poetry and literature.',
    'active'
),

(
    'English Literature',
    'English novels, poetry, drama and literary works.',
    'active'
),

(
    'Reference',
    'Reference books, dictionaries, encyclopedias and guides.',
    'active'
),

(
    'Other',
    'Books that do not belong to another category.',
    'active'
)

ON CONFLICT DO NOTHING;


-- ============================================================
-- VERIFY CATEGORIES
-- ============================================================

SELECT
    id,
    name,
    status,
    created_at

FROM categories

ORDER BY
    name ASC;