"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Ticket } from "lucide-react";
import { eventSessions, type EventSessionId } from "@/lib/events";
import { sectors, isZone, type Zone } from "@/lib/sectors";
import { Button } from "@/components/ui/button";

export type TicketPreference = { sessionId: EventSessionId; zone: Zone };

export function TicketSetup({ initial, onComplete, onCancel }: {
  initial: TicketPreference | null;
  onComplete: (preference: TicketPreference) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState(1);
  const [sessionId, setSessionId] = useState<EventSessionId | null>(initial?.sessionId ?? null);
  const [zone, setZone] = useState<Zone | "">(initial?.zone ?? "");
  const selectedSector = sectors.find((sector) => sector.id === zone);

  return <section className="ticket-setup" aria-labelledby="ticket-setup-title">
    <span className="ticket-setup-icon"><Ticket aria-hidden="true" /></span>
    <p className="eyebrow">Tu concierto · Paso {step} de 2</p>
    <h1 id="ticket-setup-title">{step === 1 ? "¿Qué día vas?" : "¿Qué sector dice tu entrada?"}</h1>
    <p className="ticket-setup-description">{step === 1 ? "Elige la fecha para ver la información de tu concierto." : "Usaremos este sector para mostrarte solicitudes relevantes. Podrás cambiarlo si te mueves."}</p>
    {step === 1 ? <div className="session-strip" aria-label="Fecha de tu entrada">{eventSessions.map((session) => <button key={session.id} type="button" className={`session-button ${sessionId === session.id ? "selected" : ""}`} aria-pressed={sessionId === session.id} onClick={() => setSessionId(session.id)}><span>{session.shortDate}</span><small>Octubre 2026</small></button>)}</div> : <div className="ticket-sector-field">
      <label htmlFor="ticket-sector">Sector de la entrada</label>
      <select id="ticket-sector" value={zone} onChange={(event) => { if (isZone(event.target.value)) setZone(event.target.value); }}>
        <option value="" disabled>Selecciona tu sector</option>
        {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.id}</option>)}
      </select>
      {selectedSector && <p className="ticket-sector-preview"><span style={{ background: selectedSector.color }} aria-hidden="true" />{selectedSector.id}</p>}
      <p className="text-sm text-muted-foreground">Solo necesitas el nombre del sector. No subas tu entrada ni su QR.</p>
    </div>}
    <div className="ticket-setup-buttons">
      {step === 2 && <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft aria-hidden="true" /> Atrás</Button>}
      <Button className="h-12 flex-1" disabled={step === 1 ? !sessionId : !zone} onClick={() => {
        if (step === 1) setStep(2);
        else if (sessionId && isZone(zone)) onComplete({ sessionId, zone });
      }}>{step === 1 ? "Continuar" : "Ver mi concierto"}<ArrowRight aria-hidden="true" /></Button>
    </div>
    <p className="ticket-local-note">Tu elección se recuerda en este dispositivo.</p>
    {onCancel && <button className="ticket-cancel" type="button" onClick={onCancel}>Volver sin cambiar</button>}
  </section>;
}
