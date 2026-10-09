import { z } from "zod";
import { eventSessionIds } from "./events.ts";
import { enabledAlertCategories } from "./alerts.ts";
import { zones } from "./sectors.ts";

export const reviewStates = ["pending-review", "active", "hidden", "rejected"] as const;
export type ReviewState = typeof reviewStates[number];
export const reviewStateLabels: Record<ReviewState, string> = {
  "pending-review": "Pendientes", active: "Publicadas", hidden: "Ocultas", rejected: "Rechazadas",
};
export const decisionReasons = ["privacy", "safety", "spam", "unverified", "other"] as const;
export const reasonLabels: Record<typeof decisionReasons[number], string> = {
  privacy: "Datos personales o ubicación precisa", safety: "Violencia, odio o riesgo",
  spam: "Spam, estafa o enlace riesgoso", unverified: "Información sin confirmar", other: "Fuera del apoyo cotidiano",
};
const base = { id: z.string().uuid(), expectedRevision: z.number().int().min(0).max(1_000_000) };
export const moderationActionSchema = z.discriminatedUnion("action", [
  z.object({ ...base, action: z.literal("approve"), reason: z.literal("reviewed") }).strict(),
  z.object({ ...base, action: z.literal("reject"), reason: z.enum(decisionReasons) }).strict(),
  z.object({ ...base, action: z.literal("hide"), reason: z.enum(decisionReasons) }).strict(),
  z.object({ ...base, action: z.literal("keep"), reason: z.literal("reviewed"), reportIds: z.array(z.string().uuid()).min(1).max(50) }).strict(),
]);
export type ModerationAction = z.infer<typeof moderationActionSchema>;
export const queueEntrySchema = z.object({
  id: z.string().uuid(), sessionId: z.enum(eventSessionIds), alias: z.string().max(24),
  title: z.string().max(80), details: z.string().max(240), category: z.enum(enabledAlertCategories),
  zone: z.enum(zones), status: z.enum(reviewStates), createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(), reviewedAt: z.string().datetime().nullable(),
  revision: z.number().int().nonnegative(),
  reportCount: z.number().int().nonnegative().default(0),
  reportReasons: z.array(z.enum(decisionReasons)).max(5).default([]),
  reportIds: z.array(z.string().uuid()).max(50).default([]),
}).strict();
export type QueueEntry = z.infer<typeof queueEntrySchema>;
export const queueResponseSchema = z.object({ entries: z.array(queueEntrySchema).max(50) }).strict();
