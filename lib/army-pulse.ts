import type { EventSessionId } from "./events.ts";

export type PulseOrigin = "official" | "community";
export type PulseTopic = {
  id: string; topic: string; title: string; summary: string; detail: string;
  origin: PulseOrigin; source: string; url: string; reviewedAt: string;
  sessions: "all" | readonly EventSessionId[];
};
const eventHelp = "https://help.ticketmaster.cl/hc/es-cl/articles/45167383157905-BTS-WORLD-TOUR-ARIRANG";
export const pulseReviewedAt = "2026-10-08T20:03:29Z";

// Editorial snapshot: no social scraping, popularity metrics, or live feed implied.
export const armyPulseTopics: readonly PulseTopic[] = [
  { id: "entry", topic: "Tu entrada", title: "Entrada e identificación, a mano", summary: "Ten tu ticket y tu documento de identidad preparados.", detail: "La guía de Ticketmaster indica presentar la entrada en Quentro o E-ticket junto con cédula de identidad o pasaporte. Revisa el formato de tu compra antes de salir.", origin: "official", source: "Ticketmaster Chile · Guía del evento", url: eventHelp, reviewedAt: pulseReviewedAt, sessions: "all" },
  { id: "access", topic: "Accesos", title: "Confirma tu acceso en los canales oficiales", summary: "No hay una puerta de ingreso validada aquí para tu sector.", detail: "Ticketmaster indica que horarios, accesos y artículos permitidos se comunicarán por sus canales y los de la productora. No deduzcas una puerta a partir del plano de Better Together.", origin: "official", source: "Ticketmaster Chile · Día del evento", url: eventHelp, reviewedAt: pulseReviewedAt, sessions: "all" },
  { id: "quentro", topic: "Quentro", title: "¿No aparece tu entrada? Revisa el correo", summary: "Quentro debe usar el mismo correo de tu compra en Ticketmaster.", detail: "La ayuda oficial explica cómo vincular la compra desde Mis Entradas en Ticketmaster y verla en Quentro. Better Together no solicita tu correo, tu entrada ni su QR.", origin: "official", source: "Ticketmaster Chile · Ayuda Quentro", url: "https://help.ticketmaster.cl/hc/es-cl/articles/49169818942609--Qu%C3%A9-es-y-c%C3%B3mo-usar-Quentro", reviewedAt: pulseReviewedAt, sessions: "all" },
];

export function selectPulseTopics(topics: readonly PulseTopic[], session: EventSessionId, origin: PulseOrigin) {
  return topics.filter((item) => item.origin === origin && (item.sessions === "all" || item.sessions.includes(session))).slice(0, 3);
}
export function pulseReviewLabel(value: string) {
  return new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
