import { FastifyInstance } from "fastify";
import { query } from "../db.js";

export default async function notificationRoutes(app: FastifyInstance) {
  app.get<{ Params: { userId: string } }>("/notifications/user/:userId", async (req) => {
    const { userId } = req.params;
    const { rows } = await query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC`,
      [userId]
    );
    return rows; // plain array, no wrapper
  });
}


