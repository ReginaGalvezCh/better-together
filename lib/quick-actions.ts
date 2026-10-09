export const moments = ["before", "during", "leaving"] as const;
export type ConcertMoment = (typeof moments)[number];
export const momentLabels: Record<ConcertMoment, string> = { before: "Antes", during: "Durante", leaving: "Al salir" };
export function isConcertMoment(value: unknown): value is ConcertMoment {
  return moments.some((moment) => moment === value);
}
const venue = "Estadio Nacional Julio Martínez Prádanos, Ñuñoa, Santiago, Chile";
export const arrivalUrl = `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: venue, travelmode: "transit" })}`;
export const returnUrl = `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", origin: venue })}`;
export const uberUrl = "https://m.uber.com/looking";
export const quentroUrl = "https://www.quentro.com/";
export const ticketHelpUrl = "https://help.ticketmaster.cl/hc/es-cl/articles/49169818942609--Qu%C3%A9-es-y-c%C3%B3mo-usar-Quentro";
export const safeMessage = "Estoy a salvo al salir del concierto. Te aviso para que estés tranquila/o 💜";
export const actionsByMoment = {
  before: ["arrival", "ticket", "prepare"],
  during: ["ticket", "meeting", "help"],
  leaving: ["uber", "return", "safe"],
} as const;
