import { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db.js";
import { cuid } from "../utils.js";
import { requireAdmin } from "../auth.js";

export default async function venueRoutes(app: FastifyInstance) {
  const venueSchema = z.object({
    name: z.string().min(1),
    address: z.string().optional().nullable(),
    lat: z.number(),
    lng: z.number(),
    zone: z.string().optional().nullable(),
    subzone: z.string().optional().nullable()
  });

  app.get("/venues", async () => {
    const { rows } = await query("SELECT * FROM venues ORDER BY created_at DESC");
    return rows;
  });

  app.post("/admin/venues", { preHandler: requireAdmin }, async (req) => {
    const body = venueSchema.parse(req.body);
    const id = cuid();
    await query(
      `INSERT INTO venues (id,name,address,lat,lng,zone,subzone) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, body.name, body.address ?? null, body.lat, body.lng, body.zone ?? null, body.subzone ?? null]
    );
    return { id };
  });

  app.put<{ Params: { id: string } }>("/admin/venues/:id", { preHandler: requireAdmin }, async (req) => {
    const body = venueSchema.parse(req.body);
    const { id } = req.params;
    await query(
      `UPDATE venues SET name=$2,address=$3,lat=$4,lng=$5,zone=$6,subzone=$7,updated_at=now() WHERE id=$1`,
      [id, body.name, body.address ?? null, body.lat, body.lng, body.zone ?? null, body.subzone ?? null]
    );
    return { id };
  });

  app.delete<{ Params: { id: string } }>("/admin/venues/:id", { preHandler: requireAdmin }, async (req) => {
    const { id } = req.params;
    await query(`DELETE FROM venues WHERE id=$1`, [id]);
    return { id };
  });
}


