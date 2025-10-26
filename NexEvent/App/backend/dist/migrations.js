import { query } from "./db.js";
async function tableExists(table) {
    const { rows } = await query(`SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema='public' AND table_name=$1
     ) as exists`, [table]);
    return Boolean(rows[0]?.exists);
}
async function columnExists(table, column) {
    const { rows } = await query(`SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1 AND column_name=$2
     ) as exists`, [table, column]);
    return Boolean(rows[0]?.exists);
}
export async function runMigrations() {
    // Core tables (idempotent definitions)
    await query(`CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL,
    created_at timestamptz DEFAULT now()
  )`);
    await query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
    await query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN','USER','ORGANIZER'))`);
    await query(`CREATE TABLE IF NOT EXISTS events (
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
  )`);
    await query(`CREATE TABLE IF NOT EXISTS event_images (
    id text PRIMARY KEY,
    event_id text REFERENCES events(id) ON DELETE CASCADE,
    url text NOT NULL,
    width int,
    height int,
    ord int DEFAULT 0
  )`);
    await query(`CREATE TABLE IF NOT EXISTS bookmarks (
    id text PRIMARY KEY,
    user_id text REFERENCES users(id) ON DELETE CASCADE,
    event_id text REFERENCES events(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, event_id)
  )`);
    await query(`CREATE TABLE IF NOT EXISTS notifications (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    read_flag boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
    // Ensure new venue schema is present while migrating existing data.
    const hasVenueName = await columnExists("events", "venue_name");
    if (!hasVenueName) {
        await query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_name text`);
    }
    const hasVenueId = await columnExists("events", "venue_id");
    if (hasVenueId) {
        const venuesTablePresent = await tableExists("venues");
        if (venuesTablePresent) {
            await query(`
        UPDATE events e
        SET venue_name = COALESCE(e.venue_name, v.name)
        FROM venues v
        WHERE e.venue_id = v.id AND (e.venue_name IS NULL OR e.venue_name = '')
      `);
        }
        await query(`ALTER TABLE events DROP CONSTRAINT IF EXISTS events_venue_id_fkey`);
        await query(`ALTER TABLE events DROP COLUMN IF EXISTS venue_id`);
    }
    // Keep event helper columns consistent with defaults.
    await query(`ALTER TABLE events ALTER COLUMN categories SET DEFAULT '{}'::text[]`);
    await query(`ALTER TABLE events ALTER COLUMN searchable SET DEFAULT ''::text`);
    // Secondary indexes (idempotent)
    await query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_events_categories ON events USING GIN (categories)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_event_images_event_ord ON event_images(event_id, ord)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id)`);
}
