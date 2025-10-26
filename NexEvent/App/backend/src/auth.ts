// Backwards-compatible surface for auth helpers.
// The real implementations are split into smaller modules under ./auth/*
export { hashPassword, verifyPassword } from "./auth/crypto.js";
export { signJwt, verifyJwt } from "./auth/jwt.js";
export { requireUser, requireAdmin, requireOrganizerOrAdmin } from "./auth/middleware.js";


