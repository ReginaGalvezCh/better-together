export const sectors = [
  { id: "Acceso Norte", shortLabel: "Norte", description: "Ingreso y salida por el sector norte", position: "north" },
  { id: "Acceso Oriente", shortLabel: "Oriente", description: "Ingreso y salida por el sector oriente", position: "east" },
  { id: "Nivel 1", shortLabel: "Nivel 1", description: "Anillo inferior del recinto", position: "level-one" },
  { id: "Nivel 2", shortLabel: "Nivel 2", description: "Anillo superior del recinto", position: "level-two" },
  { id: "Cancha", shortLabel: "Cancha", description: "Zona central frente al escenario", position: "field" },
  { id: "Punto de encuentro", shortLabel: "Encuentro", description: "Referencia acordada para reunirse", position: "meeting" },
] as const;

export const zones = sectors.map((sector) => sector.id) as [
  (typeof sectors)[number]["id"],
  ...(typeof sectors)[number]["id"][],
];

export type Zone = (typeof sectors)[number]["id"];

export function isZone(value: unknown): value is Zone {
  return typeof value === "string" && zones.includes(value as Zone);
}

export function filterByZone<T extends { zone: Zone }>(items: T[], zone: Zone | null) {
  return zone ? items.filter((item) => item.zone === zone) : items;
}
