#!/usr/bin/env tsx
import { hashPassword } from '../src/auth.js'
import { pool } from '../src/db.js'
import { cuid } from '../src/utils.js'

async function run() {
  try {
    // demo organizer
    const orgId = 'corganizer000000000000000000'
    const orgEmail = 'organizer@example.com'
    const orgPass = 'password123'
    const orgHash = await hashPassword(orgPass)

    await pool.query(
      `INSERT INTO users (id,email,password_hash,role) VALUES ($1,$2,$3,'ORGANIZER') ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, password_hash=EXCLUDED.password_hash, role=EXCLUDED.role`,
      [orgId, orgEmail, orgHash]
    )
    console.log('Created organizer', orgEmail, 'password=', orgPass)

    // demo user
    const userId = 'cuserdemo0000000000000000000'
    const userEmail = 'user@example.com'
    const userPass = 'password123'
    const userHash = await hashPassword(userPass)
    await pool.query(
      `INSERT INTO users (id,email,password_hash,role) VALUES ($1,$2,$3,'USER') ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, password_hash=EXCLUDED.password_hash, role=EXCLUDED.role`,
      [userId, userEmail, userHash]
    )
    console.log('Created user', userEmail, 'password=', userPass)

  } catch (err) {
    console.error(err)
  } finally {
    await pool.end()
  }
}

run()
