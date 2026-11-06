"use client";

import { useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { eventAccessSource, parkApproaches, parkArrivalSource, type ParkApproachId } from "@/lib/arrival-guide";

export function ArrivalGuide() {
  const [selectedId, setSelectedId] = useState<ParkApproachId>(parkApproaches[0].id);
  const selected = parkApproaches.find((approach) => approach.id === selectedId)!;

  return <section className="arrival-guide" aria-labelledby="arrival-guide-title">
    <div className="arrival-heading">
      <span className="arrival-heading-icon"><MapPin aria-hidden="true" /></span>
      <div><p className="eyebrow">Estadio Nacional · Orientación general</p><h3 id="arrival-guide-title">Explora cómo llegar al Parque</h3></div>
    </div>
    <p className="arrival-intro">Elige un acceso para comparar las opciones que publica el recinto. Este esquema no muestra distancias, recorridos ni la puerta de tu concierto.</p>
    <div className="arrival-diagram" aria-label="Tres accesos generales al Parque Estadio Nacional">
      <span className="arrival-core" aria-hidden="true">PARQUE<br />ESTADIO<br />NACIONAL</span>
      {parkApproaches.map((approach, index) => <button
        key={approach.id}
        type="button"
        className={`arrival-node arrival-node-${index + 1} ${selectedId === approach.id ? "selected" : ""}`}
        aria-pressed={selectedId === approach.id}
        onClick={() => setSelectedId(approach.id)}
      ><span className="arrival-node-number">0{index + 1}</span><span>{approach.label}</span></button>)}
    </div>
    <div className="arrival-detail" aria-live="polite">
      <span className="eyebrow">Acceso seleccionado</span>
      <strong>{selected.label}</strong>
      <p>{selected.transit}. {selected.note}</p>
    </div>
    <p className="arrival-caution">Para BTS, verifica la puerta y los horarios en tu entrada y en los canales oficiales. Seleccionar un acceso aquí no confirma que puedas ingresar por él.</p>
    <div className="arrival-links">
      <a href={parkArrivalSource} target="_blank" rel="noopener noreferrer">Accesos del Parque <ArrowUpRight aria-hidden="true" /></a>
      <a href={eventAccessSource} target="_blank" rel="noopener noreferrer">Información del evento <ArrowUpRight aria-hidden="true" /></a>
    </div>
  </section>;
}
