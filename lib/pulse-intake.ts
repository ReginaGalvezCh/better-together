import { z } from "zod";
import { eventSessionIds } from "./events.ts";

export const pulseSubmissionSchema = z.object({
  platform: z.enum(["tiktok", "instagram", "x"]),
  url: z.string().max(500),
  // Optional context supplied by an editor or permitted API, never scraped here.
  text: z.string().max(4000).default(""),
  publishedAt: z.string().datetime({ offset: true }).nullable().default(null),
  purpose: z.enum(["pulse", "reference"]).default("pulse"),
  // Editorial validity of a guide/event, never inferred from post date or caption.
  validUntil: z.string().datetime({ offset: true }).nullable().default(null),
  sessions: z.union([z.literal("all"), z.array(z.enum(eventSessionIds)).min(1).max(3)]).default("all"),
}).strict();
export type PulseSubmission = z.infer<typeof pulseSubmissionSchema>;
export type PulseCandidate = {
  platform: PulseSubmission["platform"]; url: string;
  sessions: PulseSubmission["sessions"]; publishedAt: string | null;
  collectedAt: string; expiresAt: string;
  purpose: PulseSubmission["purpose"];
  origin: "community"; status: "pending-review" | "needs-context" | "sensitive-review";
  category: "access" | "transport" | "activities" | "tickets" | "freebies" | "fanchants" | "merchandise" | "discussion";
  // A short excerpt for private review only, not a generated or verified summary.
  excerpt: string | null;
};

export function canonicalPostUrl(platform: PulseSubmission["platform"], value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    let path = url.pathname.replace(/\/$/, "");
    if (platform === "tiktok" && ["www.tiktok.com", "tiktok.com"].includes(url.hostname) && /^\/@[\w.]+\/video\/\d+$/.test(path)) {
      return `https://www.tiktok.com${path}`;
    }
    if (platform === "instagram" && ["www.instagram.com", "instagram.com"].includes(url.hostname) && /^\/(p|reel)\/[\w-]+$/.test(path)) {
      return `https://www.instagram.com${path}/`;
    }
    if (platform === "x" && ["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(url.hostname) && /^\/\w{1,15}\/status\/\d+$/.test(path)) {
      // Post IDs are global: username changes must not defeat deduplication.
      path = `/i/web/status/${path.split("/").at(-1)}`;
      return `https://x.com${path}`;
    }
    if (platform === "x" && url.hostname === "x.com" && /^\/i\/web\/status\/\d+$/.test(path)) return `https://x.com${path}`;
    return null;
  } catch { return null; }
}

function postIdentity(url: string) {
  // Instagram can expose the same shortcode through both /p/ and /reel/.
  const parsed = new URL(url);
  return parsed.hostname === "www.instagram.com" ? `instagram:${parsed.pathname.split("/")[2]}` : url;
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function relevant(text: string) {
  const localTags = /#(?:btschile(?:2026)?|armychile)\b/;
  return localTags.test(text) || (/\b(?:bts|arirang)\b/.test(text) && /\b(?:chile|santiago|estadio nacional)\b/.test(text));
}
function sensitive(text: string) {
  // Conservative triage, not exhaustive PII detection; human review is always required.
  return /\b(?:robo|asalto|emergencia|ambulancia|medic[oa]|menor|desaparecid[oa]|perdid[oa]|herid[oa]|acoso|rut|pasaporte|direccion|ubicacion exacta|hotel|hoteles|alojamiento|vuelo|vuelos)\b/.test(text)
    || /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text)
    || /(?:\+?56[\s-]*)?9(?:[\s-]*\d){8}\b/.test(text)
    || /\b-?\d{1,3}\.\d{4,}\s*[,;]\s*-?\d{1,3}\.\d{4,}\b/.test(text);
}
function category(text: string): PulseCandidate["category"] {
  if (/\b(?:fanchant|fanchants|fan chant|fan chants)\b/.test(text)) return "fanchants";
  if (/\b(?:freebie|freebies)\b/.test(text)) return "freebies";
  if (/\b(?:merch|merchandising|merchandise|pop-up|popup|pop up)\b/.test(text)) return "merchandise";
  if (/\b(?:acceso|accesos|puerta|puertas|fila|filas|ingreso)\b/.test(text)) return "access";
  if (/\b(?:metro|uber|bus|buses|transporte|regreso)\b/.test(text)) return "transport";
  if (/\b(?:quentro|ticket|tickets|entrada|entradas)\b/.test(text)) return "tickets";
  if (/\b(?:actividad|actividades|freebie|freebies|proyecto|proyectos)\b/.test(text)) return "activities";
  return "discussion";
}

/** Pure private-review intake. Never fetches a submitted URL or publishes a card. */
export function collectPulseCandidates(input: unknown, now = new Date(), knownUrls: readonly string[] = []) {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid collection time");
  const batch = z.array(z.unknown()).max(100).parse(input);
  const seen = new Set(knownUrls.flatMap((value) => (["x", "instagram", "tiktok"] as const).map((platform) => canonicalPostUrl(platform, value)).filter((url) => url !== null).map(postIdentity)));
  const candidates: PulseCandidate[] = [];
  const skipped = { invalid: 0, duplicate: 0, stale: 0, unrelated: 0 };
  for (const value of batch) {
    const parsed = pulseSubmissionSchema.safeParse(value);
    if (!parsed.success) { skipped.invalid++; continue; }
    const post = parsed.data;
    const url = canonicalPostUrl(post.platform, post.url);
    if (!url) { skipped.invalid++; continue; }
    const identity = postIdentity(url);
    if (seen.has(identity)) { skipped.duplicate++; continue; }
    const age = post.publishedAt ? now.getTime() - Date.parse(post.publishedAt) : null;
    const maxAge = (post.purpose === "reference" ? 30 : 1) * 24 * 60 * 60_000;
    const validity = post.validUntil ? Date.parse(post.validUntil) : null;
    if (age !== null && (age > maxAge || age < -5 * 60_000)) { skipped.stale++; continue; }
    if (validity !== null && validity <= now.getTime()) { skipped.stale++; continue; }
    if (validity !== null && (post.purpose !== "reference" || validity > now.getTime() + 30 * 24 * 60 * 60_000)) { skipped.invalid++; continue; }
    const text = normalize(post.text);
    if (text.trim() && !relevant(text)) { skipped.unrelated++; continue; }
    const isSensitive = sensitive(text);
    seen.add(identity);
    candidates.push({
      platform: post.platform, url, sessions: post.sessions, publishedAt: post.publishedAt,
      collectedAt: now.toISOString(),
      purpose: post.purpose,
      expiresAt: new Date(validity ?? (post.purpose === "pulse" && post.publishedAt ? Date.parse(post.publishedAt) : now.getTime()) + 24 * 60 * 60_000).toISOString(),
      origin: "community",
      status: isSensitive ? "sensitive-review" : !text.trim() || !post.publishedAt || (post.purpose === "reference" && !post.validUntil) ? "needs-context" : "pending-review",
      category: category(text),
      excerpt: isSensitive || !text.trim() ? null : post.text.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180),
    });
  }
  return { collectedAt: now.toISOString(), candidates, skipped, publishedCount: 0 as const };
}
