-- Users
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN','USER','ORGANIZER')),
  created_at timestamptz DEFAULT now()
);

-- Ensure role constraint includes ORGANIZER even if table already existed
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN','USER','ORGANIZER'));

-- Ensure any legacy venue column is removed and new venue_name column exists
CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY,
  title text NOT NULL,
  summary text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  venue_name text,
  categories text[] DEFAULT '{}',
  searchable text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE events DROP COLUMN IF EXISTS venue_id;
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_name text;

-- Event Images
CREATE TABLE IF NOT EXISTS event_images (
  id text PRIMARY KEY,
  event_id text REFERENCES events(id) ON DELETE CASCADE,
  url text NOT NULL,
  width int,
  height int,
  ord int DEFAULT 0
);

-- Event Expenses
CREATE TABLE IF NOT EXISTS event_expenses (
  id text PRIMARY KEY,
  event_id text REFERENCES events(id) ON DELETE CASCADE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'GENERAL',
  vendor text,
  quantity numeric(12,2) DEFAULT 1,
  estimated_cost numeric(14,2) DEFAULT 0,
  actual_cost numeric(14,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'PLANNED',
  incurred_on date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT event_expenses_status_check CHECK (status IN ('PLANNED','COMMITTED','PAID'))
);

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  event_id text REFERENCES events(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  -- user_id should reference users
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  read_flag boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes
-- (zone/subzone removed)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_categories ON events USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_event_images_event_ord ON event_images(event_id, ord);
CREATE INDEX IF NOT EXISTS idx_event_expenses_event ON event_expenses(event_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
