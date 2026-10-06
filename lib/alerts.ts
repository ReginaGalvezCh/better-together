import { z } from "zod";

export const alertCategories = [
  "emergency",
  "missing-person",
  "medical",
  "security",
  "safe-point",
  "supplies",
  "information",
] as const;

export const zones = [
  "Acceso Norte",
  "Acceso Oriente",
  "Nivel 1",
  "Nivel 2",
  "Cancha",
  "Punto de encuentro",
] as const;

export const categoryLabels: Record<(typeof alertCategories)[number], string> = {
  emergency: "Emergencia",
  "missing-person": "Persona perdida",
  medical: "Ayuda médica",
  security: "Seguridad o robo",
  "safe-point": "Punto seguro",
  supplies: "Necesito algo",
  information: "Aviso útil",
};

export const alertInputSchema = z.object({
  alias: z.string().trim().min(2).max(24),
  category: z.enum(alertCategories),
  title: z.string().trim().min(4).max(80),
  details: z.string().trim().max(240).default(""),
  zone: z.enum(zones),
  connectivity: z.enum(["online", "queued"]).default("online"),
  website: z.string().max(0).optional(),
});

export type AlertInput = z.infer<typeof alertInputSchema>;

export type CommunityAlert = Omit<AlertInput, "website"> & {
  id: string;
  status: "active" | "resolved";
  createdAt: string;
  expiresAt: string;
};

