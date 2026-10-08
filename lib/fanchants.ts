export type ChantCue = { id: string; when: string; shout: string; note: string };
export type ChantGuide = { id: string; title: string; status: "demo"; source: string; cues: readonly ChantCue[] };

// Original interface sample, not a concert setlist or a song's actual guide.
export const demoChant: ChantGuide = {
  id: "reader-demo",
  title: "Prueba el ritmo",
  status: "demo",
  source: "Ejemplo original de Better Together. No corresponde a una canción.",
  cues: [
    { id: "intro", when: "Ejemplo: al terminar la intro", shout: "¡BTS!", note: "Un grito corto, todos juntos." },
    { id: "pause", when: "Ejemplo: en una pausa", shout: "¡ARMY!", note: "Espera el espacio antes de gritar." },
    { id: "repeat", when: "Ejemplo: al repetir el ritmo", shout: "¡BTS! ¡BTS!", note: "Dos gritos cortos." },
    { id: "end", when: "Ejemplo: al cerrar", shout: "¡Gracias!", note: "Cierra con tu comunidad." },
  ],
};

export function nextCueIndex(current: number, direction: -1 | 1, count: number) {
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, current + direction));
}
