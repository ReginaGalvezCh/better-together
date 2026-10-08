"use client";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, Radio, ShieldCheck } from "lucide-react";
import { armyPulseTopics, pulseReviewedAt, pulseReviewLabel, selectPulseTopics, type PulseOrigin } from "@/lib/army-pulse";
import type { EventSessionId } from "@/lib/events";

export function ArmyPulse({ sessionId, dateLabel, online }: { sessionId: EventSessionId; dateLabel: string; online: boolean }) {
  const [origin, setOrigin] = useState<PulseOrigin>("official");
  const [current, setCurrent] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const topics = selectPulseTopics(armyPulseTopics, sessionId, origin);
  function select(index: number) {
    const card = cards.current[index];
    if (!card || !track.current) return;
    setCurrent(index);
    track.current.scrollTo({ left: card.offsetLeft, behavior: "instant" });
  }
  function changeOrigin(next: PulseOrigin) { setOrigin(next); setCurrent(0); }
  return <section className="army-pulse" aria-labelledby="army-pulse-title">
    <div className="pulse-heading"><span className="pulse-mark"><Radio aria-hidden="true" /></span><div><p className="eyebrow">Tu concierto · {dateLabel}</p><h2 id="army-pulse-title">Pulso ARMY</h2></div><span className="pulse-mode">Curado</span></div>
    <p className="pulse-intro">Lo importante, sin perderte entre publicaciones.</p>
    <p className="pulse-freshness">Revisión editorial · <time dateTime={pulseReviewedAt}>{pulseReviewLabel(pulseReviewedAt)}</time> · Santiago</p>
    <div className="pulse-origins" role="group" aria-label="Origen del Pulso ARMY"><button type="button" aria-pressed={origin === "official"} onClick={() => changeOrigin("official")}>Oficial</button><button type="button" aria-pressed={origin === "community"} onClick={() => changeOrigin("community")}>Comunidad</button></div>
    {topics.length ? <>
      <div className="pulse-track" ref={track} role="region" aria-roledescription="carrusel" aria-label="Temas del concierto" onScroll={() => {
        const viewport = track.current;
        if (!viewport) return;
        const closest = topics.reduce((best, _, index) => Math.abs((cards.current[index]?.offsetLeft ?? 0) - viewport.scrollLeft) < Math.abs((cards.current[best]?.offsetLeft ?? 0) - viewport.scrollLeft) ? index : best, 0);
        setCurrent(closest);
      }}>
        {topics.map((item, index) => <article className="pulse-topic" key={item.id} ref={(element) => { cards.current[index] = element; }} role="group" aria-roledescription="tarjeta" aria-label={`${index + 1} de ${topics.length}: ${item.topic}`}>
          <div className="pulse-topic-top"><span>{item.topic}</span><span className="pulse-trust"><ShieldCheck size={15} aria-hidden="true" /> {item.origin === "official" ? "Fuente oficial" : "Comunidad · Sin confirmar"}</span></div>
          <h3>{item.title}</h3><p className="pulse-summary">{item.summary}</p>
          <details className="pulse-detail"><summary>Ver contexto</summary><p>{item.detail}</p></details>
          <div className="pulse-source"><strong>{item.source}</strong><span>Revisado · <time dateTime={item.reviewedAt}>{pulseReviewLabel(item.reviewedAt)}</time></span><a href={item.url} target="_blank" rel="noopener noreferrer">Abrir fuente <ExternalLink size={15} aria-hidden="true" /></a></div>
        </article>)}
      </div>
      <div className="pulse-navigation"><button type="button" disabled={current === 0} onClick={() => select(current - 1)} aria-label="Tema anterior"><ArrowLeft aria-hidden="true" /></button><p role="status" aria-live="polite">Tema {current + 1} de {topics.length}<small>Desliza o usa las flechas</small></p><button type="button" disabled={current === topics.length - 1} onClick={() => select(current + 1)} aria-label="Tema siguiente"><ArrowRight aria-hidden="true" /></button></div>
    </> : <div className="pulse-empty"><Radio aria-hidden="true" /><h3>Aún no hay temas de la comunidad</h3><p>Todavía no conectamos redes sociales. Aquí aparecerán publicaciones seleccionadas con su fuente y hora, marcadas como no confirmadas cuando corresponda.</p></div>}
    <p className="pulse-disclosure">{online ? "Selección editorial, no monitoreo en vivo." : "Sin señal: estás viendo la selección guardada con la app; los enlaces pueden no abrir."} No mide popularidad ni la seguridad del recinto.</p>
  </section>;
}
