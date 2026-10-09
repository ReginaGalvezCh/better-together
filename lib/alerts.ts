import { z } from "zod";
import { eventSessionIds } from "./events.ts";
import { zones } from "./sectors.ts";

export const alertCategories = [
  "emergency",
  "missing-person",
  "medical",
  "security",
  "safe-point",
  "supplies",
  "information",
] as const;

export { zones } from "./sectors.ts";

export const categoryLabels: Record<(typeof alertCategories)[number], string> = {
  emergency: "Emergencia",
  "missing-person": "Persona perdida",
  medical: "Ayuda médica",
  security: "Seguridad o robo",
  "safe-point": "Punto seguro",
  supplies: "Necesito algo",
  information: "Aviso útil",
};

export const enabledAlertCategories = ["safe-point", "supplies", "information"] as const;

export const alertInputSchema = z.object({
  sessionId: z.enum(eventSessionIds),
  clientRequestId: z.string().uuid(),
  createdAt: z.string().datetime(),
  alias: z.string().trim().min(2).max(24),
  category: z.enum(enabledAlertCategories),
  title: z.string().trim().min(4).max(80),
  details: z.string().trim().max(240).default(""),
  zone: z.enum(zones),
  connectivity: z.enum(["online", "queued"]).default("online"),
  website: z.string().max(0).optional(),
}).strict();

export type AlertInput = z.infer<typeof alertInputSchema>;

export type CommunityAlert = Omit<AlertInput, "website" | "clientRequestId"> & {
  id: string;
  status: "pending-review" | "active" | "resolved" | "hidden" | "rejected";
  reviewedAt: string | null;
  expiresAt: string;
};

export const receiptSchema = z.object({ received: z.literal(true) }).strict();

export const publicAlertSchema = alertInputSchema.omit({ website: true, clientRequestId: true }).extend({
  id: z.string().uuid(), status: z.literal("active"),
  reviewedAt: z.string().datetime(), expiresAt: z.string().datetime(),
});

export function parsePublicAlerts(value: unknown): CommunityAlert[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = publicAlertSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export function parsePending(value: unknown): AlertInput[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = alertInputSchema.safeParse(item);
    return parsed.success && !containsPersonalData(parsed.data) ? [parsed.data] : [];
  });
}

export function removeHandledRequests(current: AlertInput[], handled: Set<string>) {
  return current.filter((item) => !handled.has(item.clientRequestId));
}

export function isPublicAlert(alert: CommunityAlert, now = Date.now()) {
  return alert.status === "active" && typeof alert.reviewedAt === "string"
    && Number.isFinite(Date.parse(alert.reviewedAt)) && Date.parse(alert.reviewedAt) <= now
    && Date.parse(alert.expiresAt) > now;
}

// Conservative triage only; all accepted requests still require human review.
export function containsPersonalData(input: Pick<AlertInput, "alias" | "title" | "details">) {
  const text = `${input.alias} ${input.title} ${input.details}`;
  return /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text)
    || /(?:\+?56\s*)?\b9[\s.-]*(?:\d[\s.-]*){8}\b/.test(text)
    || /\b\d{1,2}[.]?\d{3}[.]?\d{3}-[\dk]\b/i.test(text)
    || /-?\d{1,3}\.\d{4,}\s*[,;]\s*-?\d{1,3}\.\d{4,}/.test(text);
}
