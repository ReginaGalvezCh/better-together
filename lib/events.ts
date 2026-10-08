export const eventSessions = [
  {
    id: "santiago-2026-10-14",
    shortDate: "Mié 14",
    dateLabel: "Miércoles 14 de octubre",
    date: "2026-10-14",
    startAt: "2026-10-14T20:00:00-03:00",
  },
  {
    id: "santiago-2026-10-16",
    shortDate: "Vie 16",
    dateLabel: "Viernes 16 de octubre",
    date: "2026-10-16",
    startAt: "2026-10-16T20:00:00-03:00",
  },
  {
    id: "santiago-2026-10-17",
    shortDate: "Sáb 17",
    dateLabel: "Sábado 17 de octubre",
    date: "2026-10-17",
    startAt: "2026-10-17T20:00:00-03:00",
  },
] as const;

export type EventSession = (typeof eventSessions)[number];
export type EventSessionId = EventSession["id"];

export const eventSessionIds = eventSessions.map((session) => session.id) as [
  EventSessionId,
  ...EventSessionId[],
];

function dateInSantiago(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function getDefaultSession(now = new Date()) {
  const localDate = dateInSantiago(now);
  return (
    eventSessions.find((session) => session.date >= localDate) ??
    eventSessions[eventSessions.length - 1]
  );
}

export function getSessionPhase(session: EventSession, now = new Date()) {
  const localDate = dateInSantiago(now);

  if (localDate < session.date) return "Antes";
  if (localDate === session.date) return "Día del evento";
  return "Cierre por confirmar";
}

export function getCountdownParts(session: EventSession, now = new Date()) {
  const remaining = Math.max(0, new Date(session.startAt).getTime() - now.getTime());
  const totalMinutes = Math.floor(remaining / 60_000);
  return {
    days: Math.floor(totalMinutes / 1_440),
    hours: Math.floor((totalMinutes % 1_440) / 60),
    minutes: totalMinutes % 60,
    complete: remaining === 0,
  };
}

export const informationItems = [
  {
    id: "venue",
    title: "Recinto",
    value: "Coliseo Central del Estadio Nacional",
    status: "Confirmado",
    scope: "Todas las sesiones",
    reviewedAt: "8 oct 2026",
    sourceLabel: "Parque Estadio Nacional",
    sourceUrl: "https://parqueestadionacional.cl/cartelera",
  },
  {
    id: "arrival",
    title: "Cómo llegar",
    value: "Metro Estadio Nacional, Línea 6, como orientación general. Confirma la puerta indicada en tu entrada.",
    status: "Confirmado",
    scope: "Todas las sesiones",
    reviewedAt: "8 oct 2026",
    sourceLabel: "Cómo llegar al Parque Estadio Nacional",
    sourceUrl: "https://parqueestadionacional.cl/como-llegar",
  },
  {
    id: "start",
    title: "Hora de inicio",
    value: "20:00 aprox. La cuenta regresiva usa esta hora estimada y no confirma que el show haya comenzado.",
    status: "Estimado",
    scope: "Sesión seleccionada",
    reviewedAt: "8 oct 2026",
    sourceLabel: "Preguntas frecuentes de Ticketmaster",
    sourceUrl: "https://help.ticketmaster.cl/hc/es-cl/articles/45167383157905-BTS-WORLD-TOUR-ARIRANG",
  },
  {
    id: "doors",
    title: "Puertas y accesos",
    value: "Pendiente de confirmación específica para cada sesión. No uses esta app como indicación de una puerta de ingreso.",
    status: "Pendiente",
    scope: "Sesión seleccionada",
    reviewedAt: "8 oct 2026",
    sourceLabel: "Preguntas frecuentes de Ticketmaster",
    sourceUrl: "https://help.ticketmaster.cl/hc/es-cl/articles/45167383157905-BTS-WORLD-TOUR-ARIRANG",
  },
] as const;

export const pulseItems = [
  {
    id: "tour-dates",
    source: "BIGHIT MUSIC",
    title: "Las fechas de Santiago están publicadas en la gira oficial",
    summary: "Revisa siempre la fecha de tu entrada antes de viajar al recinto.",
    publishedLabel: "Revisado el 8 oct 2026",
    url: "https://bighitsmusic.com/bts/tour",
    kind: "Oficial",
  },
  {
    id: "ticket-info",
    source: "Ticketmaster Chile",
    title: "Información práctica y preguntas frecuentes del concierto",
    summary: "La información de ingreso puede cambiar. Better Together enlaza la fuente y conserva la fecha real de revisión.",
    publishedLabel: "Revisado el 8 oct 2026",
    url: "https://help.ticketmaster.cl/hc/es-cl/articles/45167383157905-BTS-WORLD-TOUR-ARIRANG",
    kind: "Organizador",
  },
  {
    id: "ticket-format",
    source: "Ticketmaster y Quentro",
    title: "Confirma el formato de tu entrada antes de salir",
    summary: "Un ticket recibido en Quentro usa QR dinámico y no se reemplaza por una captura. Confirma qué formato corresponde a tu entrada.",
    publishedLabel: "Revisado el 8 oct 2026",
    url: "https://help.ticketmaster.cl/hc/es-cl/articles/49169818942609--Qu%C3%A9-es-y-c%C3%B3mo-usar-Quentro",
    kind: "Información útil",
  },
] as const;

export const activities = [
  {
    id: "bts-pop-up",
    title: "BTS POP-UP en Cenco Costanera",
    schedule: "2 de octubre al 1 de noviembre · 10:00 a 20:00",
    location: "Andrés Bello 2425, Providencia",
    note: "Requiere reserva. La lista de espera presencial depende del aforo.",
    reviewedAt: "8 oct 2026",
    sourceLabel: "Aviso oficial en Weverse",
    sourceUrl: "https://weverse.io/bts/notice/39603?hl=es",
  },
] as const;
