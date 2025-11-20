BEGIN;

-- ============================================================================
-- USERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL,
  status        text NOT NULL DEFAULT 'ACTIVE',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN','USER','ORGANIZER'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('ACTIVE','SUSPENDED'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  id          text PRIMARY KEY,
  title       text NOT NULL,
  summary     text,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  venue_name  text,
  categories  text[] NOT NULL DEFAULT '{}'::text[],
  searchable  text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_name text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE events ALTER COLUMN categories SET DEFAULT '{}'::text[];
ALTER TABLE events ADD COLUMN IF NOT EXISTS searchable text NOT NULL DEFAULT '';
ALTER TABLE events ALTER COLUMN searchable SET DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_categories ON events USING GIN (categories);

-- ============================================================================
-- EVENT IMAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_images (
  id        text PRIMARY KEY,
  event_id  text REFERENCES events(id) ON DELETE CASCADE,
  url       text NOT NULL,
  width     int,
  height    int,
  ord       int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_images_event_ord ON event_images(event_id, ord);

-- ============================================================================
-- EVENT EXPENSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_expenses (
  id             text PRIMARY KEY,
  event_id       text REFERENCES events(id) ON DELETE CASCADE,
  label          text NOT NULL,
  category       text NOT NULL DEFAULT 'GENERAL',
  vendor         text,
  quantity       numeric(12,2) DEFAULT 1,
  estimated_cost numeric(14,2) DEFAULT 0,
  actual_cost    numeric(14,2) DEFAULT 0,
  status         text NOT NULL DEFAULT 'PLANNED',
  incurred_on    date,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_expenses_status_check CHECK (status IN ('PLANNED','COMMITTED','PAID'))
);

CREATE INDEX IF NOT EXISTS idx_event_expenses_event ON event_expenses(event_id);

-- ============================================================================
-- BOOKMARKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookmarks (
  id         text PRIMARY KEY,
  user_id    text REFERENCES users(id) ON DELETE CASCADE,
  event_id   text REFERENCES events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text NOT NULL,
  read_flag  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- ============================================================================
-- DEFAULT ADMIN USER
-- ============================================================================
-- Default admin account: admin@eventstack.com / admin123
-- Password hash generated with bcrypt (10 rounds)
INSERT INTO users (id, email, password_hash, role, status, created_at)
VALUES (
  'admin-default',
  'admin@eventstack.com',
  '$2b$10$McEVzXS23l6V5RQsAgdNx.tfxPwSlUtx/dVz.FjkpKwo6vfHYvOPW',
  'ADMIN',
  'ACTIVE',
  NOW()
)
ON CONFLICT (email) DO NOTHING;

COMMIT;
