"use client";
import { useState } from "react";
import { Backpack, Car, HeartHandshake, MapPin, Navigation, ShieldCheck, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { actionsByMoment, arrivalUrl, momentLabels, moments, returnUrl, safeMessage, uberUrl } from "@/lib/quick-actions";
import { TicketGuide } from "@/components/ticket-access";
import type { EventSessionId } from "@/lib/events";
import { useConcertMoment } from "@/hooks/use-concert-moment";
import type { WeatherForecast } from "@/lib/weather";
import { packingBasics, packingOfficialSource, packingPracticalTips, packingWeatherTips } from "@/lib/packing-guide";

const actionInfo = {
  arrival: { label: "Cómo llegar", icon: Navigation, href: arrivalUrl },
  ticket: { label: "Mi entrada", icon: Ticket },
  prepare: { label: "Qué llevar", icon: Backpack },
  meeting: { label: "Encuentro", icon: MapPin },
  help: { label: "Ayuda", icon: HeartHandshake },
  uber: { label: "Abrir Uber", icon: Car, href: uberUrl },
  return: { label: "Cómo volver", icon: Navigation, href: returnUrl },
  safe: { label: "Estoy a salvo", icon: ShieldCheck },
};

export function QuickAccessDock({ sessionId, sessionDate, dateLabel, forecast, online, onMeeting, onHelp }: {
  sessionId: EventSessionId; sessionDate: string; dateLabel: string; forecast?: WeatherForecast;
  online: boolean; onMeeting: () => void; onHelp: () => void;
}) {
  const { moment, selectMoment } = useConcertMoment(sessionId);
  const [panel, setPanel] = useState<"ticket" | "prepare" | "safe" | null>(null);
  const weatherTips = packingWeatherTips(forecast, sessionDate);
  const dayForecast = forecast?.date === sessionDate ? forecast : null;
  async function shareSafe() {
    try { await navigator.share({ text: safeMessage }); }
    catch (error) { if ((error as Error).name !== "AbortError") toast.info("No pudimos abrir compartir. Puedes copiar el mensaje."); }
  }
  async function copySafe() {
    try { await navigator.clipboard.writeText(safeMessage); toast.success("Mensaje copiado. Envíalo a alguien de confianza."); }
    catch { toast.info("Selecciona el texto y cópialo manualmente."); }
  }
  return <>
    <nav className="quick-dock" data-moment={moment} aria-label="Accesos rápidos del concierto"><div className="quick-dock-inner">
      <div className="moment-selector" role="group" aria-label="Tu momento en el concierto">
        {moments.map((item) => <button type="button" key={item} data-moment={item} aria-pressed={moment === item} onClick={() => selectMoment(item)}>{momentLabels[item]}</button>)}
      </div>
      <div className="dock-actions">{actionsByMoment[moment].map((action) => {
        const info = actionInfo[action]; const Icon = info.icon;
        const contents = <><Icon size={21} aria-hidden="true" /><span>{info.label}</span></>;
        return "href" in info
          ? <a key={action} href={info.href} target="_blank" rel="noopener noreferrer" aria-label={`${info.label} · servicio externo`}>{contents}</a>
          : <button key={action} type="button" onClick={() => {
            if (action === "meeting") onMeeting();
            else if (action === "help") onHelp();
            else if (action === "ticket" || action === "prepare" || action === "safe") setPanel(action);
          }}>{contents}</button>;
      })}</div>
      <p className="dock-note">{momentLabels[moment]} · {online ? "Servicios externos pueden necesitar señal" : "Sin señal; servicios externos pueden no abrir"}</p>
    </div></nav>
    <Dialog open={panel !== null} onOpenChange={(open) => { if (!open) setPanel(null); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{panel === "ticket" ? "Tu entrada en Quentro" : panel === "prepare" ? "Qué llevar" : "Avisa a alguien de confianza"}</DialogTitle><DialogDescription>{panel === "ticket" ? "Better Together no guarda tu entrada ni su QR." : panel === "prepare" ? `${dateLabel} · Lleva lo esencial y revisa qué permite el recinto.` : "Este aviso es personal. No se publica en Better Together ni avisa a seguridad."}</DialogDescription></DialogHeader>
        {panel === "ticket" && <TicketGuide />}
        {panel === "prepare" && <div className="dock-guide packing-guide">
          <section className="packing-group"><h3>Para entrar · Oficial</h3><ul>{packingBasics.map((tip) => <li key={tip}>{tip}</li>)}</ul><a href={packingOfficialSource} target="_blank" rel="noopener noreferrer">Revisar indicaciones de Ticketmaster</a></section>
          <section className="packing-group"><h3>Para la espera · Sugerencias</h3><ul>{packingPracticalTips.map((tip) => <li key={tip}>{tip}</li>)}</ul><p className="packing-caption">Consejos de Better Together. Las recomendaciones de la comunidad se incorporarán cuando estén revisadas.</p></section>
          <section className="packing-group"><h3>Según el clima de tu día</h3>{dayForecast ? <><p>{dayForecast.label} · {dayForecast.max}° / {dayForecast.min}° · {dayForecast.rainProbability}% de lluvia</p><ul>{weatherTips.map((tip) => <li key={tip}>{tip}</li>)}</ul><p className="packing-caption">Pronóstico de Open-Meteo para {dayForecast.date}. Puede cambiar; no es una alerta meteorológica.</p><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Ver fuente del pronóstico</a></> : <p>No tenemos un pronóstico disponible para tu fecha. Revisa el clima antes de salir; no asumimos sol ni lluvia.</p>}</section>
          <details className="packing-group"><summary>Deja tu teléfono listo</summary><ul><li>Abre Quentro y comprueba tu entrada antes de llegar.</li><li>Guarda la información esencial mientras tengas señal.</li><li>Activa el ahorro de batería y acuerda un punto de encuentro.</li></ul><p className="packing-caption">Better Together no necesita tu ubicación precisa.</p></details>
          <p className="packing-caption">Esta lista no confirma que puedas ingresar con cada artículo. Ticketmaster indica que los artículos permitidos y prohibidos se comunicarán por los canales oficiales.</p>
        </div>}
        {panel === "safe" && <div className="dock-guide"><p className="safe-message">{safeMessage}</p><p>No incluye tu sector ni ubicación. Elige a quién enviarlo; compartir no garantiza que el mensaje se haya entregado.</p>{typeof navigator !== "undefined" && typeof navigator.share === "function" && <button type="button" onClick={() => void shareSafe()}>Elegir contacto o app</button>}<button type="button" onClick={() => void copySafe()}>Copiar mensaje</button></div>}
      </DialogContent>
    </Dialog>
  </>;
}
