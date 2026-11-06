export const parkArrivalSource = "https://parqueestadionacional.cl/como-llegar";
export const eventAccessSource = "https://help.ticketmaster.cl/hc/es-cl/articles/45167383157905-BTS-WORLD-TOUR-ARIRANG";

// Park access points are general orientation, not event-specific ticket gates.
export const parkApproaches = [
  { id: "pedro-de-valdivia", label: "Pedro de Valdivia", transit: "Metro Estadio Nacional · L6", note: "Acceso general publicado por el Parque." },
  { id: "guillermo-mann", label: "Guillermo Mann", transit: "Paraderos Red Movilidad cercanos", note: "Acceso general publicado por el Parque." },
  { id: "avenida-grecia", label: "Avenida Grecia", transit: "Metro Estadio Nacional · L6", note: "Acceso general publicado por el Parque." },
] as const;

export type ParkApproachId = (typeof parkApproaches)[number]["id"];
