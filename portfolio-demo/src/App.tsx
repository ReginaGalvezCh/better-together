import { useState } from "react";
import { sectors, sectorSource, type Zone } from "../../lib/sectors";
import { eventAccessSource, parkApproaches, parkArrivalSource, type ParkApproachId } from "../../lib/arrival-guide";

type View = "sectors" | "arrival";
const guidePdf = "https://info.dgmedios.com/content/uploads/2026/10/GUIA_BTS_WORLD_TOUR_ARIRANG_EN_SANTIAGO.pdf";

export function App() {
  const [view, setView] = useState<View>("sectors");
  const [zone, setZone] = useState<Zone | null>(null);
  const [approachId, setApproachId] = useState<ParkApproachId>(parkApproaches[0].id);
  const approach = parkApproaches.find((item) => item.id === approachId)!;

  return <div className="site-shell">
    <header className="topbar">
      <a className="brand" href="#inicio" aria-label="Better Together, ir al inicio"><span className="brand-mark" aria-hidden="true">✳</span><span>better<br />together</span></a>
      <span className="topbar-tag">ARCHIVO INTERACTIVO · 2026</span>
    </header>

    <main id="inicio">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="eyebrow">BTS Santiago · Estadio Nacional</p><h1 id="hero-title">Encontrarnos empieza por <em>orientarnos.</em></h1><p>Explora el mapa de sectores y compara accesos generales al Parque. Una muestra navegable del trabajo de interfaz de Better Together.</p><div className="hero-badges"><span>16 sectores</span><span>3 accesos generales</span><span>Sin GPS</span></div></div>
        <div className="hero-art" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="hero-art-heart">♥</span><span className="art-label label-one">PACÍFICO</span><span className="art-label label-two">ANDES</span></div>
      </section>

      <div className="archive-note" role="note"><strong>Proyecto de portafolio.</strong> Los conciertos de octubre de 2026 ya pasaron. Este sitio no ofrece ayuda activa ni confirma puertas, recorridos o condiciones de ingreso. Consulta siempre tu entrada y las fuentes oficiales.</div>

      <section className="explore" aria-labelledby="explore-title">
        <div className="section-top"><div><p className="eyebrow">01 / EXPLORAR</p><h2 id="explore-title">Tu punto de partida</h2></div><p>Dos diagramas con propósitos distintos. Selecciona una opción para ver el detalle y la fuente.</p></div>
        <div className="view-tabs" role="tablist" aria-label="Diagramas">
          <button type="button" role="tab" id="tab-sectors" aria-selected={view === "sectors"} aria-controls="panel-sectors" onClick={() => setView("sectors")}>Mapa de sectores <span>↗</span></button>
          <button type="button" role="tab" id="tab-arrival" aria-selected={view === "arrival"} aria-controls="panel-arrival" onClick={() => setView("arrival")}>Cómo llegar <span>↗</span></button>
        </div>

        {view === "sectors" ? <div role="tabpanel" id="panel-sectors" aria-labelledby="tab-sectors" className="content-panel">
          <div className="panel-heading"><div><p className="eyebrow">SECTORES · ENTRADA</p><h3>Elige tu sector</h3><p>Una interpretación gráfica de los sectores publicados para BTS. La selección sirve para explorar el diseño; no modifica una entrada.</p></div><span className="no-gps">◎ Sin ubicación precisa</span></div>
          <div className="sector-map-shell"><div className="map-orientation"><span>← Pacífico</span><span>Andes →</span></div><div className="sector-map" aria-label="Mapa esquemático interactivo de sectores">
            {sectors.map((item) => <button key={item.id} type="button" className={`sector sector-${item.position}`} style={{ backgroundColor: item.color, color: item.ink }} aria-pressed={zone === item.id} onClick={() => setZone(item.id)}>{item.shortLabel}</button>)}
            <span className="stage" aria-hidden="true">ESCENARIO<br />360°</span>
          </div></div>
          <div className="selection" aria-live="polite"><div><span className="eyebrow">SELECCIÓN ACTUAL</span><strong>{zone ?? "Todos los sectores"}</strong><p>Esquema referencial, no a escala.</p></div><button type="button" aria-pressed={zone === null} onClick={() => setZone(null)}>Ver todos</button></div>
          <div className="source-strip"><p>Los colores y nombres siguen las fuentes del evento. El dibujo no muestra puertas, rutas ni distancias.</p><a href={sectorSource} target="_blank" rel="noreferrer">Sectores en Ticketmaster ↗</a><a href={guidePdf} target="_blank" rel="noreferrer">Guía oficial BTS ↗</a></div>
        </div> : <div role="tabpanel" id="panel-arrival" aria-labelledby="tab-arrival" className="content-panel arrival-panel">
          <div className="panel-heading"><div><p className="eyebrow">PARQUE ESTADIO NACIONAL · ORIENTACIÓN GENERAL</p><h3>Compara cómo llegar</h3><p>Estos son accesos generales publicados por el Parque. Tu puerta para un concierto depende de tu entrada y de la información oficial del evento.</p></div><span className="no-gps">◎ Sin GPS</span></div>
          <div className="arrival-diagram" aria-label="Tres accesos generales al Parque Estadio Nacional"><span className="arrival-core" aria-hidden="true">PARQUE<br />ESTADIO<br />NACIONAL</span>{parkApproaches.map((item, index) => <button key={item.id} type="button" className="arrival-node" aria-pressed={approachId === item.id} onClick={() => setApproachId(item.id)}><small>0{index + 1}</small><span>{item.label}</span></button>)}</div>
          <div className="arrival-detail" aria-live="polite"><span className="eyebrow">OPCIÓN PARA COMPARAR</span><strong>{approach.label}</strong><p>{approach.transit}. {approach.note}</p></div>
          <div className="source-strip"><p>Este esquema no relaciona accesos con sectores de BTS ni confirma una puerta de ingreso.</p><a href={parkArrivalSource} target="_blank" rel="noreferrer">Accesos del Parque ↗</a><a href={eventAccessSource} target="_blank" rel="noreferrer">Información del evento ↗</a></div>
        </div>}
      </section>
    </main>

    <footer><div><strong>better together</strong><p>Demo visual independiente · React + TypeScript</p></div><a href="https://github.com/ReginaGalvezCh/better-together" target="_blank" rel="noreferrer">Ver código en GitHub ↗</a></footer>
  </div>;
}
