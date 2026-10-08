export const sectorSource = "https://www.ticketmaster.cl/event/bts-world-tour-arirang-live-2026-scl";

// Color families and names from Ticketmaster; positions are schematic, not routes.
export const sectors = [
  { id: "Pacífico Alto", shortLabel: "Pacífico Alto", color: "#306d35", ink: "#ffffff", position: "pacifico-alto" },
  { id: "Pacífico Medio", shortLabel: "Pacífico Medio", color: "#58b32b", ink: "#111111", position: "pacifico-medio" },
  { id: "Pacífico Bajo", shortLabel: "Pacífico Bajo", color: "#768b17", ink: "#111111", position: "pacifico-bajo" },
  { id: "Movilidad Reducida", shortLabel: "Movilidad Reducida", color: "#fff33b", ink: "#111111", position: "movilidad" },
  { id: "Pacífico Lateral Sur", shortLabel: "Pacífico Lateral Sur", color: "#c94710", ink: "#ffffff", position: "lateral-sur" },
  { id: "Pacífico Lateral Norte", shortLabel: "Pacífico Lateral Norte", color: "#3f0a87", ink: "#ffffff", position: "lateral-norte" },
  { id: "Galería Sur", shortLabel: "Galería Sur", color: "#f87319", ink: "#111111", position: "galeria-sur" },
  { id: "Galería Norte", shortLabel: "Galería Norte", color: "#8b22f5", ink: "#ffffff", position: "galeria-norte" },
  { id: "Cancha Pacífico", shortLabel: "Cancha Pacífico", color: "#e42c50", ink: "#ffffff", position: "cancha-pacifico" },
  { id: "Cancha Andes", shortLabel: "Cancha Andes", color: "#e42c50", ink: "#ffffff", position: "cancha-andes" },
  { id: "Andes Bajo Sur", shortLabel: "Andes Bajo Sur", color: "#cce6ff", ink: "#111111", position: "andes-bajo-sur" },
  { id: "Andes Bajo Centro", shortLabel: "Andes Bajo Centro", color: "#080980", ink: "#ffffff", position: "andes-bajo-centro" },
  { id: "Andes Bajo Norte", shortLabel: "Andes Bajo Norte", color: "#47b1df", ink: "#111111", position: "andes-bajo-norte" },
  { id: "Andes Alto Sur", shortLabel: "Andes Alto Sur", color: "#f4c5fb", ink: "#111111", position: "andes-alto-sur" },
  { id: "Andes Alto Centro", shortLabel: "Andes Alto Centro", color: "#ec2899", ink: "#111111", position: "andes-alto-centro" },
  { id: "Andes Alto Norte", shortLabel: "Andes Alto Norte", color: "#e889f4", ink: "#111111", position: "andes-alto-norte" },
] as const;

// Preserve earlier queued requests without assigning them an invented new location.
const legacyZones = ["Acceso Norte", "Acceso Oriente", "Nivel 1", "Nivel 2", "Cancha", "Punto de encuentro"] as const;
export const zones = [sectors[0].id, ...sectors.slice(1).map((sector) => sector.id), ...legacyZones] as [
  (typeof sectors)[number]["id"] | (typeof legacyZones)[number],
  ...((typeof sectors)[number]["id"] | (typeof legacyZones)[number])[],
];

export type Zone = (typeof sectors)[number]["id"];

export function isZone(value: unknown): value is Zone {
  return typeof value === "string" && sectors.some((sector) => sector.id === value);
}

export function filterByZone<T extends { zone: string }>(items: T[], zone: Zone | null) {
  return zone ? items.filter((item) => item.zone === zone) : items;
}
