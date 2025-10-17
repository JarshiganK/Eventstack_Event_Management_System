-- demo admin user
INSERT INTO users (id, email, password_hash, role)
VALUES ('cadminuserdemo0000000000000', 'admin@example.com', '$2a$10$C7JpDgT3E2bM7k9F4m5m3e1iJrPp6QOqg8xk9w2z1y0v3u4t5s6yK', 'ADMIN')
ON CONFLICT (id) DO NOTHING;

-- one venue
INSERT INTO venues (id, name, address, lat, lng, zone, subzone)
VALUES ('cvenue00000000000000000000', 'Main Hall', '123 Center St', 37.7749, -122.4194, 'Central', 'Downtown')
ON CONFLICT (id) DO NOTHING;

-- one event
INSERT INTO events (id, title, summary, starts_at, ends_at, venue_id, categories, searchable)
VALUES (
  'cevent000000000000000000000',
  'Tech Conference',
  'A demo tech event',
  now() + interval '1 day',
  now() + interval '1 day' + interval '2 hours',
  'cvenue00000000000000000000',
  '{tech,conference}',
  lower('Tech Conference A demo tech event Main Hall tech conference')
)
ON CONFLICT (id) DO NOTHING;

-- demo organizer and regular user
INSERT INTO users (id, email, password_hash, role)
VALUES
  ('corganizer000000000000000000', 'organizer@example.com', '1234', 'ORGANIZER')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, password_hash, role)
VALUES ('cuserdemo0000000000000000000', 'user@example.com', '$2a$10$mnopqrstuvwxyzabcdefghi', 'USER')
ON CONFLICT (id) DO NOTHING;

-- second event
INSERT INTO events (id, title, summary, starts_at, ends_at, venue_id, categories, searchable)
VALUES (
  'cevent000000000000000000001',
  'Community Meetup',
  'A local community meetup',
  now() + interval '3 days',
  now() + interval '3 days' + interval '3 hours',
  'cvenue00000000000000000000',
  '{community,meetup}',
  lower('Community Meetup A local community meetup Main Hall community meetup')
)
ON CONFLICT (id) DO NOTHING;

-- event image for first event
INSERT INTO event_images (id, event_id, url, width, height, ord)
VALUES ('cimg000000000000000000000', 'cevent000000000000000000000', '/uploads/demo.jpg', 800, 600, 0)
ON CONFLICT (id) DO NOTHING;

-- a bookmark by demo user
INSERT INTO bookmarks (id, user_id, event_id)
VALUES ('cbookmark00000000000000000', 'cuserdemo0000000000000000000', 'cevent000000000000000000000')
ON CONFLICT (id) DO NOTHING;

-- a notification for demo user
INSERT INTO notifications (id, user_id, title, body)
VALUES ('cnotif00000000000000000000', 'cuserdemo0000000000000000000', 'Welcome', 'Thanks for signing up!')
ON CONFLICT (id) DO NOTHING;


