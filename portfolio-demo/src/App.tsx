import { useState } from "react";
import { sectors, sectorSource, type Zone } from "./sectors";
import { eventAccessSource, parkApproaches, parkArrivalSource, type ParkApproachId } from "./arrival-guide";
import "./flow.css";

type Stage = "date" | "sector" | "app";
type Section = "home" | "pulse" | "help";

const sessions = [
  { id: "2026-10-14", short: "Mié 14", label: "Miércoles 14 de octubre" },
  { id: "2026-10-16", short: "Vie 16", label: "Viernes 16 de octubre" },
  { id: "2026-10-17", short: "Sáb 17", label: "Sábado 17 de octubre" },
] as const;
type SessionId = (typeof sessions)[number]["id"];

const guidePdf = "https://info.dgmedios.com/content/uploads/2026/10/GUIA_BTS_WORLD_TOUR_ARIRANG_EN_SANTIAGO.pdf";

export function App() {
  const [stage, setStage] = useState<Stage>("date");
  const [sessionId, setSessionId] = useState<SessionId | null>(null);
  const [ticketZone, setTicketZone] = useState<Zone | "">("");
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [section, setSection] = useState<Section>("home");
  const [approachId, setApproachId] = useState<ParkApproachId>(parkApproaches[0].id);
  const session = sessions.find((item) => item.id === sessionId);
  const approach = parkApproaches.find((item) => item.id === approachId)!;

  function showConcert() {
    if (!session || !ticketZone) return;
    setSelectedZone(ticketZone);
    setSection("home");
    setStage("app");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function changeTicket() {
    setStage("date");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  return <div className="site-shell">
    <header className="topbar">
      <a className="brand" href="#inicio" aria-label="Better Together, ir al inicio"><span className="brand-mark" aria-hidden="true">✳</span><span>better<br />together</span></a>
      <span className="topbar-tag">ARCHIVO INTERACTIVO · 2026</span>
    </header>

    <main id="inicio">
      {stage !== "app" && <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="eyebrow">BTS Santiago · Estadio Nacional</p><h1 id="hero-title">Encontrarnos empieza por <em>orientarnos.</em></h1><p>Explora cómo se pensó Better Together para acompañar a fans en un evento grande.</p><div className="hero-badges"><span>3 conciertos</span><span>16 sectores</span><span>Sin GPS</span></div></div>
        <div className="hero-art" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="hero-art-heart">♥</span><span className="art-label label-one">PACÍFICO</span><span className="art-label label-two">ANDES</span></div>
      </section>}

      <div className="archive-note" role="note"><strong>Proyecto de portafolio.</strong> Los conciertos de octubre de 2026 ya pasaron. Esta demo no ofrece ayuda activa ni confirma puertas, recorridos o condiciones de ingreso. Consulta siempre tu entrada y las fuentes oficiales.</div>

      {stage !== "app" ? <section className="setup-section" aria-labelledby="setup-title">
        <div className="setup-card">
          <span className="setup-icon" aria-hidden="true">✳</span>
          <p className="eyebrow">Tu concierto · Paso {stage === "date" ? "1" : "2"} de 2</p>
          <h2 id="setup-title">{stage === "date" ? "¿Qué día vas?" : "¿Qué sector dice tu entrada?"}</h2>
          <p className="setup-description">{stage === "date" ? "Elige una de las fechas para recorrer la interfaz tal como se planteó." : "Elige un sector para ver cómo se personalizaba el inicio y el filtro de ayuda."}</p>
          {stage === "date" ? <div className="session-strip" aria-label="Fecha de tu entrada">
            {sessions.map((item) => <button key={item.id} type="button" aria-pressed={sessionId === item.id} onClick={() => setSessionId(item.id)}><strong>{item.short}</strong><span>Octubre 2026</span></button>)}
          </div> : <div className="sector-field">
            <label htmlFor="ticket-sector">Sector de la entrada</label>
            <select id="ticket-sector" value={ticketZone} onChange={(event) => setTicketZone(event.target.value as Zone)}>
              <option value="" disabled>Selecciona tu sector</option>
              {sectors.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
            </select>
            <p>Solo se usa el nombre del sector en esta visita. No subas tu entrada ni su QR.</p>
          </div>}
          <div className="setup-actions">
            {stage === "sector" && <button type="button" className="secondary-button" onClick={() => setStage("date")}>← Atrás</button>}
            <button type="button" className="primary-button" disabled={stage === "date" ? !sessionId : !ticketZone} onClick={stage === "date" ? () => setStage("sector") : showConcert}>{stage === "date" ? "Continuar" : "Ver mi concierto"} →</button>
          </div>
          <p className="setup-footnote">Esta demo no guarda tu elección ni se conecta al servicio original.</p>
        </div>
      </section> : <section className="app-flow" aria-labelledby="concert-title">
        <div className="app-flow-heading"><div><p className="eyebrow">BTS WORLD TOUR ARIRANG · SANTIAGO</p><h1 id="concert-title">Tu concierto, a mano</h1></div><span className="archive-pill">Vista de archivo</span></div>
        <div className="ticket-summary-demo"><div><span className="eyebrow">MI ENTRADA · {session?.short}</span><strong>{ticketZone}</strong></div><button type="button" onClick={changeTicket}>Cambiar mi entrada</button></div>
        <div className="event-summary-demo"><span className="eyebrow">EVENTO FINALIZADO</span><h2>{session?.label}</h2><p>Coliseo Central · Estadio Nacional</p><a href={eventAccessSource} target="_blank" rel="noreferrer">Consultar información oficial del evento ↗</a></div>
        <nav className="section-nav" aria-label="Secciones del concierto">
          <button type="button" aria-current={section === "home" ? "page" : undefined} onClick={() => setSection("home")}>Inicio</button>
          <button type="button" aria-current={section === "pulse" ? "page" : undefined} onClick={() => setSection("pulse")}>Pulso</button>
          <button type="button" aria-current={section === "help" ? "page" : undefined} onClick={() => setSection("help")}>Ayuda</button>
        </nav>

        {section === "home" && <div className="home-content">
          <div className="content-panel">
            <div className="panel-heading"><div><p className="eyebrow">INICIO · SECTORES DE LA ENTRADA</p><h3>Explora los sectores</h3><p>Elige un sector para cambiar el filtro de Ayuda. Esto no modifica los datos de tu entrada.</p></div><span className="no-gps">◎ Sin ubicación precisa</span></div>
            <div className="sector-map-shell"><div className="map-orientation"><span>← Pacífico</span><span>Andes →</span></div><div className="sector-map" aria-label="Mapa esquemático interactivo de sectores">
              {sectors.map((item) => <button key={item.id} type="button" className={`sector sector-${item.position}`} style={{ backgroundColor: item.color, color: item.ink }} aria-pressed={selectedZone === item.id} onClick={() => setSelectedZone(item.id)}>{item.shortLabel}</button>)}
              <span className="stage" aria-hidden="true">ESCENARIO<br />360°</span>
            </div></div>
            <div className="selection" aria-live="polite"><div><span className="eyebrow">FILTRO DE AYUDA</span><strong>{selectedZone ?? "Todos los sectores"}</strong><p>Esquema referencial, no a escala.</p></div><button type="button" aria-pressed={selectedZone === null} onClick={() => setSelectedZone(null)}>Ver todos</button></div>
            <div className="source-strip"><p>Los colores y nombres siguen las fuentes del evento. El dibujo no muestra puertas, rutas ni distancias.</p><a href={sectorSource} target="_blank" rel="noreferrer">Sectores en Ticketmaster ↗</a><a href={guidePdf} target="_blank" rel="noreferrer">Guía oficial BTS ↗</a></div>
          </div>
          <div className="flow-shortcuts"><button type="button" onClick={() => setSection("pulse")}><strong>Pulso ARMY</strong><span>Ver novedades del proyecto →</span></button><button type="button" onClick={() => setSection("help")}><strong>Comunidad</strong><span>Ver Ayuda en {selectedZone ?? "todos los sectores"} →</span></button></div>
          <div className="content-panel arrival-panel">
            <div className="panel-heading"><div><p className="eyebrow">ANTES DE SALIR · ORIENTACIÓN GENERAL</p><h3>Explora cómo llegar al Parque</h3><p>Estos son accesos generales publicados por el Parque. Tu puerta para un concierto depende de tu entrada y de la información oficial.</p></div><span className="no-gps">◎ Sin GPS</span></div>
            <div className="arrival-diagram" aria-label="Tres accesos generales al Parque Estadio Nacional"><span className="arrival-core" aria-hidden="true">PARQUE<br />ESTADIO<br />NACIONAL</span>{parkApproaches.map((item, index) => <button key={item.id} type="button" className="arrival-node" aria-pressed={approachId === item.id} onClick={() => setApproachId(item.id)}><small>0{index + 1}</small><span>{item.label}</span></button>)}</div>
            <div className="arrival-detail" aria-live="polite"><span className="eyebrow">OPCIÓN PARA COMPARAR</span><strong>{approach.label}</strong><p>{approach.transit}. {approach.note}</p></div>
            <div className="source-strip"><p>Este esquema no relaciona accesos con sectores de BTS ni confirma una puerta de ingreso.</p><a href={parkArrivalSource} target="_blank" rel="noreferrer">Accesos del Parque ↗</a><a href={eventAccessSource} target="_blank" rel="noreferrer">Información del evento ↗</a></div>
          </div>
        </div>}

        {section === "pulse" && <div className="archive-section"><p className="eyebrow">PULSO ARMY · VISTA DE ARCHIVO</p><h2>Las novedades necesitaban revisión.</h2><p>El Pulso original estaba pensado para mostrar temas con fuente y fecha, separados de avisos de la comunidad. Esta demo no carga publicaciones actuales ni presenta contenido antiguo como si estuviera vigente.</p><div className="archive-actions"><a href={guidePdf} target="_blank" rel="noreferrer">Ver guía oficial del evento ↗</a><button type="button" onClick={() => setSection("home")}>Volver a Inicio</button></div></div>}

        {section === "help" && <div className="archive-section"><p className="eyebrow">AYUDA COTIDIANA · VISTA DE ARCHIVO</p><h2>Sin solicitudes activas en esta demo.</h2><p>Filtro seleccionado: <strong>{selectedZone ?? "Todos los sectores"}</strong>. La versión original contemplaba avisos revisados y solicitudes cotidianas entre fans. No se activó como servicio público y aquí no mostramos avisos inventados ni aceptamos solicitudes.</p><div className="archive-actions"><button type="button" onClick={() => setSection("home")}>Volver al mapa de sectores</button><a href="https://github.com/ReginaGalvezCh/better-together" target="_blank" rel="noreferrer">Conocer el proyecto en GitHub ↗</a></div></div>}
      </section>}
    </main>

    <footer><div><strong>better together</strong><p>Demo visual independiente · React + TypeScript</p></div><a href="https://github.com/ReginaGalvezCh/better-together" target="_blank" rel="noreferrer">Ver código en GitHub ↗</a></footer>
  </div>;
}
