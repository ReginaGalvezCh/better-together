"use client";
import { useEffect, useState } from "react";
import type { EventSessionId } from "@/lib/events";
import { isConcertMoment, type ConcertMoment } from "@/lib/quick-actions";

// Keep each day's choice separate, including when storage is unavailable.
export function useConcertMoment(sessionId: EventSessionId) {
  const [choices, setChoices] = useState<Partial<Record<EventSessionId, ConcertMoment>>>({});
  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(`better-together:moment:${sessionId}`);
        if (isConcertMoment(saved)) setChoices((current) => current[sessionId] ? current : { ...current, [sessionId]: saved });
      } catch { /* The controls still work without persistent storage. */ }
    }, 0);
    return () => window.clearTimeout(restore);
  }, [sessionId]);
  function selectMoment(next: ConcertMoment) {
    setChoices((current) => ({ ...current, [sessionId]: next }));
    try { localStorage.setItem(`better-together:moment:${sessionId}`, next); } catch { /* In-memory choice remains available. */ }
  }
  return { moment: choices[sessionId] ?? "before", selectMoment };
}
