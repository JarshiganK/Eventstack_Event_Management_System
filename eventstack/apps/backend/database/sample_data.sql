-- Sample data for EventStack (safe minimal set)
-- Password for all sample users should be set via your app; here we only create identities.

-- Users
INSERT INTO users (id, email, password_hash, role, created_at) VALUES
('u_admin_1','admin@eventstack.com','$2b$10$Lxg2M2p6n0qv0yXQ6iB9ueO0xJt0a0H0Y3eK0f4yT8Sx1d9pO3x8S','ADMIN', NOW()),
('u_org_1','organizer@eventstack.com','$2b$10$Lxg2M2p6n0qv0yXQ6iB9ueO0xJt0a0H0Y3eK0f4yT8Sx1d9pO3x8S','ORGANIZER', NOW()),
('u_user_1','user1@example.com','$2b$10$Lxg2M2p6n0qv0yXQ6iB9ueO0xJt0a0H0Y3eK0f4yT8Sx1d9pO3x8S','USER', NOW());

-- Events (ids: ev_a1 .. ev_a8)
INSERT INTO events (id, title, summary, starts_at, ends_at, venue_name, categories, searchable, created_at, updated_at) VALUES
('ev_a1','Tech Conference 2025','Two day tech talks and workshops','2025-11-15 09:00:00','2025-11-16 18:00:00','SV Convention Center', ARRAY['Technology','Conference'],'tech conference 2025 sv convention center', NOW(), NOW()),
('ev_a2','Summer Music Fest','Outdoor live music across genres','2025-07-20 14:00:00','2025-07-20 23:00:00','Riverside Park', ARRAY['Music','Festival'],'summer music fest riverside park', NOW(), NOW()),
('ev_a3','Startup Pitch Night','Startups pitch to investors','2025-11-01 18:00:00','2025-11-01 21:00:00','Innovation Hub', ARRAY['Business','Networking'],'startup pitch investors innovation hub', NOW(), NOW()),
('ev_a4','Food and Wine Expo','Taste cuisines with wine pairings','2025-12-10 11:00:00','2025-12-10 20:00:00','Grand Hall', ARRAY['Food','Wine'],'food wine expo grand hall', NOW(), NOW()),
('ev_a5','City Marathon','5K, 10K and full marathon','2025-09-05 06:00:00','2025-09-05 14:00:00','City Center', ARRAY['Sports','Fitness'],'city marathon running sports', NOW(), NOW()),
('ev_a6','Art Gallery Opening','Contemporary art showcase','2025-11-08 19:00:00','2025-11-08 22:00:00','Modern Art Museum', ARRAY['Art','Culture'],'art gallery opening modern art museum', NOW(), NOW()),
('ev_a7','Coding Bootcamp','Weekend full‑stack workshop','2025-10-28 09:00:00','2025-10-29 17:00:00','Tech Academy', ARRAY['Technology','Workshop'],'coding bootcamp full stack tech academy', NOW(), NOW()),
('ev_a8','Jazz Night Live','Evening of live jazz','2025-11-12 20:00:00','2025-11-12 23:00:00','Blue Note Club', ARRAY['Music','Entertainment'],'jazz night live blue note', NOW(), NOW());

-- Event images (Unsplash sample links)
INSERT INTO event_images (id, event_id, url, width, height, ord) VALUES
('img_a1','ev_a1','https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1280',1280,720,0),
('img_a2','ev_a2','https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1280',1280,720,0),
('img_a3','ev_a3','https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1280',1280,720,0),
('img_a4','ev_a4','https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1280',1280,720,0),
('img_a5','ev_a5','https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1280',1280,720,0),
('img_a6','ev_a6','https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=1280',1280,720,0),
('img_a7','ev_a7','https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1280',1280,720,0),
('img_a8','ev_a8','https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=1280',1280,720,0);

-- Bookmarks
INSERT INTO bookmarks (id, user_id, event_id, created_at) VALUES
('bm_a1','u_user_1','ev_a1', NOW()),
('bm_a2','u_user_1','ev_a7', NOW());

-- Notifications
INSERT INTO notifications (id, user_id, title, body, read_flag, created_at) VALUES
('nt_a1','u_user_1','Reminder','Tech Conference starts soon', false, NOW()),
('nt_a2','u_org_1','New Listing','Your Coding Bootcamp is live', false, NOW());