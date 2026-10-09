"use client";

import { useRef, useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { decisionReasons, reasonLabels } from "@/lib/moderation-contract";
import { receiptSchema } from "@/lib/alerts";

export function ReportRequest({ alertId, online }: { alertId: string; online: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<typeof decisionReasons[number]>("privacy");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<{ id: string; reason: typeof reason } | null>(null);
  const lock = useRef(false);

  async function send() {
    if (lock.current || !online || blockedUntil > Date.now()) return;
    lock.current = true; setBusy(true); setError(null);
    if (!pending.current || pending.current.reason !== reason) pending.current = { id: crypto.randomUUID(), reason };
    try {
      const response = await fetch("/api/reports", { method: "POST", cache: "no-store", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-BT-Community": "1" },
        body: JSON.stringify({ alertId, clientReportId: pending.current.id, reason }) });
      const body = await response.json() as { receipt?: unknown; error?: string };
      if (!response.ok) {
        if (response.status === 429) setBlockedUntil(Date.now() + 600_000);
        throw new Error(body.error || "No pudimos confirmar la denuncia. Puedes reintentar sin duplicarla.");
      }
      receiptSchema.parse(body.receipt);
      setSent(true); setOpen(false); setNotice("Denuncia recibida para revisión. No implica retiro automático ni atención inmediata.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No pudimos confirmar la denuncia."); }
    finally { lock.current = false; setBusy(false); }
  }

  return <div className="mt-3">
    <Button variant="outline" className="min-h-11" disabled={!online || sent} onClick={() => setOpen(true)} aria-label="Denunciar esta solicitud"><Flag aria-hidden="true" />{sent ? "Denuncia recibida" : "Denunciar"}</Button>
    {!online && <p className="mt-1 text-sm text-muted-foreground">Necesitas conexión para denunciar. No guardamos denuncias sin confirmar.</p>}
    {notice && <p className="mt-2 text-sm" role="status">{notice}</p>}
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}><DialogContent className="request-dialog"><DialogHeader><DialogTitle>Denunciar solicitud</DialogTitle><DialogDescription>Elige el motivo, sin agregar datos personales. La revisará una persona; no es un canal de emergencias.</DialogDescription></DialogHeader>
      <label htmlFor={`report-${alertId}`} className="font-semibold">Motivo</label><Select value={reason} disabled={busy} onValueChange={(value) => setReason(value as typeof reason)}><SelectTrigger id={`report-${alertId}`} className="min-h-12 w-full"><SelectValue /></SelectTrigger><SelectContent>{decisionReasons.map((code) => <SelectItem key={code} value={code}>{reasonLabels[code]}</SelectItem>)}</SelectContent></Select>
      {error && <p role="alert" className="text-sm">{error}</p>}
      <Button className="min-h-12" disabled={busy || !online} onClick={() => void send()}>{busy ? "Enviando…" : "Enviar denuncia a revisión"}</Button>
    </DialogContent></Dialog>
  </div>;
}
