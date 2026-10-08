"use client";
import { useState } from "react";
import { Car, HeartHandshake, MapPin, Navigation, ShieldCheck, Smartphone, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { actionsByMoment, arrivalUrl, momentLabels, moments, quentroUrl, returnUrl, safeMessage, uberUrl } from "@/lib/quick-actions";
import type { EventSessionId } from "@/lib/events";
import { useConcertMoment } from "@/hooks/use-concert-moment";

const actionInfo = {
  arrival: { label: "Cómo llegar", icon: Navigation, href: arrivalUrl },
  ticket: { label: "Mi entrada", icon: Ticket },
  prepare: { label: "Mi teléfono", icon: Smartphone },
  meeting: { label: "Encuentro", icon: MapPin },
  help: { label: "Ayuda", icon: HeartHandshake },
  uber: { label: "Abrir Uber", icon: Car, href: uberUrl },
  return: { label: "Cómo volver", icon: Navigation, href: returnUrl },
  safe: { label: "Estoy a salvo", icon: ShieldCheck },
};

export function QuickAccessDock({ sessionId, online, onMeeting, onHelp }: {
  sessionId: EventSessionId; online: boolean; onMeeting: () => void; onHelp: () => void;
}) {
  const { moment, selectMoment } = useConcertMoment(sessionId);
  const [panel, setPanel] = useState<"ticket" | "prepare" | "safe" | null>(null);
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
        <DialogHeader><DialogTitle>{panel === "ticket" ? "Tu entrada en Quentro" : panel === "prepare" ? "Prepara tu teléfono" : "Avisa a alguien de confianza"}</DialogTitle><DialogDescription>{panel === "ticket" ? "Better Together no guarda tu entrada ni su QR." : panel === "prepare" ? "Hazlo antes de llegar, mientras tengas conexión." : "Este aviso es personal. No se publica en Better Together ni avisa a seguridad."}</DialogDescription></DialogHeader>
        {panel === "ticket" && <div className="dock-guide"><p>Abre Quentro desde el icono de tu teléfono y comprueba que aparece tu entrada antes de llegar.</p><p>El QR dinámico no se reemplaza con una captura. Si no ves la entrada, revisa la ayuda oficial.</p><a href={quentroUrl} target="_blank" rel="noopener noreferrer">Quentro: información y descarga ↗</a><a href="https://help.ticketmaster.cl/hc/es-cl/articles/49169818942609--Qu%C3%A9-es-y-c%C3%B3mo-usar-Quentro" target="_blank" rel="noopener noreferrer">Ayuda de Ticketmaster ↗</a><small>El acceso directo a la app está pendiente de validar en iPhone y Android.</small></div>}
        {panel === "prepare" && <div className="dock-guide"><ul><li>Carga tu teléfono y lleva batería externa si puedes.</li><li>Abre Quentro y revisa tu entrada.</li><li>Acuerda un punto de encuentro con tu grupo.</li><li>Guarda la información esencial antes de quedarte sin señal.</li><li>Activa el ahorro de batería de tu teléfono.</li></ul><p>Better Together no necesita tu GPS. Maps y Uber gestionan sus propios permisos cuando los abres.</p></div>}
        {panel === "safe" && <div className="dock-guide"><p className="safe-message">{safeMessage}</p><p>No incluye tu sector ni ubicación. Elige a quién enviarlo; compartir no garantiza que el mensaje se haya entregado.</p>{typeof navigator !== "undefined" && typeof navigator.share === "function" && <button type="button" onClick={() => void shareSafe()}>Elegir contacto o app</button>}<button type="button" onClick={() => void copySafe()}>Copiar mensaje</button></div>}
      </DialogContent>
    </Dialog>
  </>;
}
