"use client";

import { ExternalLink, Map as MapIcon, ShieldCheck } from "lucide-react";
import { sectors, sectorSource, type Zone } from "@/lib/sectors";

type Props = {
  selectedZone: Zone | null;
  activeCounts: Partial<Record<Zone, number>>;
  onSelect: (zone: Zone | null) => void;
};

const officialGuide = "https://info.dgmedios.com/content/uploads/2026/10/GUIA_BTS_WORLD_TOUR_ARIRANG_EN_SANTIAGO.pdf";

export function SectorExplorer({ selectedZone, activeCounts, onSelect }: Props) {
  return <section className="sector-panel sector-explorer" aria-labelledby="sector-map-title">
    <div className="sector-panel-heading">
      <span className="sector-heading-icon"><MapIcon aria-hidden="true" /></span>
      <div><p className="eyebrow">Mapa interactivo · BTS Santiago 2026</p><h3 id="sector-map-title">Encuentra tu sector</h3><p>Toca la zona de tu entrada para destacarla y filtrar los avisos de la comunidad.</p></div>
      <span className="privacy-chip"><ShieldCheck aria-hidden="true" /> Sin GPS</span>
    </div>
    <div className="sector-map-shell">
      <div className="sector-map-orientation" aria-hidden="true"><span>← Pacífico</span><span>Andes →</span></div>
      <div className="sector-map" aria-label="Mapa esquemático interactivo de sectores de BTS en el Estadio Nacional">
        {sectors.map((sector) => {
          const selected = selectedZone === sector.id;
          const activeCount = activeCounts[sector.id] ?? 0;
          return <button key={sector.id} style={{ backgroundColor: sector.color, color: sector.ink }} className={`sector-button sector-${sector.position} ${selected ? "selected" : ""}`} type="button" aria-pressed={selected} aria-label={`${sector.id}${selected ? ". Seleccionado" : ""}${activeCount ? `. ${activeCount} solicitud${activeCount === 1 ? " activa" : "es activas"}` : ". Sin solicitudes activas"}`} onClick={() => onSelect(sector.id)}>
            <span>{selected && <span aria-hidden="true">✓ </span>}{sector.shortLabel}</span>{activeCount > 0 && <strong aria-hidden="true">{activeCount}</strong>}
          </button>;
        })}
        <span className="sector-stage" aria-hidden="true">Escenario<br />360°</span>
      </div>
    </div>
    <div className="sector-selection" aria-live="polite">
      <div><span className="eyebrow">Tu selección</span><strong>{selectedZone ?? "Todos los sectores"}</strong><p>Se guarda solo en este dispositivo.</p></div>
      <button className="all-zones-button" type="button" aria-pressed={selectedZone === null} onClick={() => onSelect(null)}>Ver todos</button>
    </div>
    <div className="sector-reference"><p>Esquema original y referencial basado en los sectores publicados para BTS. No representa recorridos, distancias ni puertas de ingreso. Verifica tu acceso en la entrada y la guía oficial del concierto.</p><div className="sector-source-links"><a href={sectorSource} target="_blank" rel="noreferrer">Sectores en Ticketmaster <ExternalLink size={13} aria-hidden="true" /></a><a href={officialGuide} target="_blank" rel="noreferrer">Guía oficial BTS (PDF) <ExternalLink size={13} aria-hidden="true" /></a></div></div>
  </section>;
}
