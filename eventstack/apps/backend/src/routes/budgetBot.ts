import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireOrganizerOrAdmin } from "../auth.js";
import { env } from "../env.js";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SYSTEM_PROMPT =
  "You are Budget Bot, an expert financial analyst for live events. Use the event snapshot to deliver precise, actionable insights, highlight risks, and suggest next steps. Never invent numbers beyond the supplied data.";

const historySchema = z.array(
  z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1)
  })
);

const requestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  context: z.string().min(1),
  history: historySchema.optional()
});

function buildContents(context: string, prompt: string, history?: z.infer<typeof historySchema>) {
  const contents: any[] = [
    {
      role: "user",
      parts: [
        {
          text: `${SYSTEM_PROMPT}\n\nEvent data snapshot:\n${context}`
        }
      ]
    }
  ];

  history?.forEach((msg) => {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    });
  });

  contents.push({ role: "user", parts: [{ text: prompt }] });
  return contents;
}

async function callGemini(contents: any[]) {
  if (!env.GEMINI_API_KEY) {
    throw new Error("Gemini API key missing");
  }
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Gemini API error");
  }
  const data = (await response.json()) as any;
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part?.text ?? "")
    .join("\n")
    .trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

const budgetBotRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/events/:eventId/budget-bot",
    { preHandler: requireOrganizerOrAdmin },
    async (req, reply) => {
      const parsed = requestSchema.parse(req.body);
      try {
        const trimmedContext =
          parsed.context.length > 12000 ? parsed.context.slice(parsed.context.length - 12000) : parsed.context;
        const contents = buildContents(trimmedContext, parsed.prompt, parsed.history);
        const answer = await callGemini(contents);
        return { message: answer };
      } catch (err: any) {
        app.log.error({ err }, "Budget bot error");
        reply.code(500).send({ error: err?.message || "Unable to get AI response" });
      }
    }
  );
};

export default budgetBotRoutes;

