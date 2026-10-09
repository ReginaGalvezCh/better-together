"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { quentroUrl, ticketHelpUrl } from "@/lib/quick-actions";

export function TicketGuide() {
  return <div className="dock-guide">
    <p>Abre Quentro desde el icono de tu teléfono y comprueba que aparece tu entrada antes de llegar.</p>
    <p>Revisa la puerta indicada en tu entrada. Elegir un sector en Better Together no confirma tu acceso.</p>
    <p>El QR dinámico no se reemplaza con una captura. Si no ves la entrada, revisa la ayuda oficial.</p>
    <a href={quentroUrl} target="_blank" rel="noopener noreferrer">Quentro: información y descarga ↗</a>
    <a href={ticketHelpUrl} target="_blank" rel="noopener noreferrer">Ayuda de Ticketmaster ↗</a>
    <small>Estos enlaces abren páginas web. El acceso directo a la app sigue pendiente de validar en iPhone y Android.</small>
  </div>;
}

export function TicketAccess() {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="event-ticket-access" onClick={() => setOpen(true)} aria-haspopup="dialog">
      <Ticket size={20} aria-hidden="true" /><span>Mi entrada · Quentro</span>
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Tu entrada en Quentro</DialogTitle><DialogDescription>Better Together no guarda tu entrada ni su QR. Este acceso ofrece orientación y descarga; no abre la app automáticamente.</DialogDescription></DialogHeader>
        <TicketGuide />
      </DialogContent>
    </Dialog>
  </>;
}
