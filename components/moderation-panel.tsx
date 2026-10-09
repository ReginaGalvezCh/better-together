"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { eventSessions, type EventSessionId } from "@/lib/events";
import { categoryLabels } from "@/lib/alerts";
import { decisionReasons, reasonLabels, reviewStates, reviewStateLabels, queueResponseSchema, type QueueEntry, type ModerationAction, type ReviewState } from "@/lib/moderation-contract";

const actionLabels = { approve: "Aprobar y publicar", reject: "Rechazar", hide: "Ocultar" };
const formatTime = (value: string) => new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export function ModerationPanel() {
  const [session, setSession] = useState<EventSessionId>(eventSessions[0].id);
  const [status, setStatus] = useState<ReviewState>("pending-review");
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [choice, setChoice] = useState<{ entry: QueueEntry; action: ModerationAction["action"] } | null>(null);
  const [reason, setReason] = useState<typeof decisionReasons[number]>("privacy");
  const [busy, setBusy] = useState(false);
  const version = useRef(0);
  const actionLock = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    const current = ++version.current;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/moderation?session=${encodeURIComponent(session)}&status=${status}`, { cache: "no-store", credentials: "same-origin", signal });
      if (!response.ok) {
        const body = await response.json() as { error?: string };
        throw new Error(body.error || "No pudimos cargar la cola.");
      }
      const body = queueResponseSchema.parse(await response.json());
      if (version.current === current) setEntries(body.entries);
    } catch (failure) {
      if (signal?.aborted || current !== version.current) return;
      setEntries([]);
      setError(failure instanceof Error ? failure.message : "No pudimos cargar la cola.");
    } finally { if (current === version.current && !signal?.aborted) setLoading(false); }
  }, [session, status]);

  useEffect(() => {
    const controller = new AbortController();
    const first = window.setTimeout(() => void load(controller.signal), 0);
    const refresh = window.setInterval(() => void load(controller.signal), 30_000);
    // This ref is a request generation counter, not a DOM node. Incrementing
    // its current value intentionally invalidates every in-flight response.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { version.current++; controller.abort(); window.clearTimeout(first); window.clearInterval(refresh); };
  }, [load]);

  function changeFilter(nextSession: EventSessionId, nextStatus: ReviewState) {
    version.current++;
    setEntries([]); setChoice(null); setNotice(null); setError(null);
    setSession(nextSession); setStatus(nextStatus);
  }

  async function decide() {
    if (!choice || actionLock.current) return;
    actionLock.current = true;
    setBusy(true); setError(null);
    const decision = { id: choice.entry.id, expectedRevision: choice.entry.revision, action: choice.action,
      reason: choice.action === "approve" ? "reviewed" : reason };
    try {
      const response = await fetch("/api/moderation", { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json", "X-BT-Moderation": "1" }, body: JSON.stringify(decision) });
      if (!response.ok) {
        const body = await response.json() as { error?: string };
        if ([401, 403, 409].includes(response.status)) { setEntries([]); setChoice(null); }
        throw new Error(body.error || "La decisión no está confirmada. Actualiza antes de reintentar.");
      }
      setChoice(null);
      setNotice(choice.action === "approve" ? "Solicitud aprobada. Aparecerá en la próxima actualización de la comunidad, hasta su vencimiento original." : choice.action === "hide" ? "Solicitud retirada del feed. Una copia sin conexión puede seguir desactualizada hasta reconectar." : "Solicitud rechazada; no se publicará.");
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No pudimos confirmar la decisión.");
    } finally { actionLock.current = false; setBusy(false); }
  }

  return <>
    <div className="safety-note mb-5"><ShieldCheck aria-hidden="true" /><p>Revisa contexto, privacidad y vigencia antes de aprobar. El contenido es de la comunidad: no lo convierte en información oficial ni garantiza que sea cierto.</p></div>
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <div className="min-w-52 flex-1"><label htmlFor="review-session" className="mb-2 block font-semibold">Fecha del concierto</label><Select value={session} disabled={busy} onValueChange={(value) => changeFilter(value as EventSessionId, status)}><SelectTrigger id="review-session" className="h-12 w-full"><SelectValue /></SelectTrigger><SelectContent>{eventSessions.map((day) => <SelectItem key={day.id} value={day.id}>{day.dateLabel}</SelectItem>)}</SelectContent></Select></div>
      <Button variant="outline" className="h-12" onClick={() => void load()} disabled={busy || loading}><RefreshCw aria-hidden="true" /> Actualizar</Button>
    </div>
    <Tabs value={status} onValueChange={(value) => changeFilter(session, value as ReviewState)}>
      <TabsList aria-label="Estado de las solicitudes" className="moderation-tabs mb-3 w-full">{reviewStates.map((state) => <TabsTrigger key={state} value={state} disabled={busy}>{reviewStateLabels[state]}</TabsTrigger>)}</TabsList>
    <TabsContent value={status}>
    {notice && <p className="app-note mb-4" role="status">{notice}</p>}
    {error && <p className="safety-note mb-4" role="alert">{error}</p>}
    <p className="mb-4 text-sm text-muted-foreground">Hasta 50 solicitudes vigentes · Actualización cada 30 segundos · Solo funciona con conexión.</p>
    {loading ? <p role="status">Cargando la cola…</p> : !error && !entries.length ? <section className="empty-state"><ShieldCheck aria-hidden="true" /><h2>No hay solicitudes {reviewStateLabels[status].toLowerCase()}</h2><p>Las vencidas no aparecen y no pueden aprobarse.</p></section> : null}
    <div className="space-y-4">{entries.map((entry) => <article key={entry.id} className="content-card">
      <p className="eyebrow">{categoryLabels[entry.category]} · {entry.zone}</p>
      <h2 className="mt-3 break-words text-xl font-bold">{entry.title}</h2>
      {entry.details && <p className="mt-2 whitespace-pre-wrap break-words">{entry.details}</p>}
      <p className="my-4 text-sm text-muted-foreground">Alias: {entry.alias} · Creada {formatTime(entry.createdAt)} · Vence {formatTime(entry.expiresAt)}</p>
      <div className="flex flex-wrap gap-3">{(entry.status === "pending-review" ? ["approve", "reject"] as const : entry.status === "active" ? ["hide"] as const : []).map((action) => <Button key={action} variant={action === "approve" ? "default" : "outline"} className="min-h-12" disabled={busy || loading || Date.parse(entry.expiresAt) <= Date.now()} onClick={() => { setReason("privacy"); setChoice({ entry, action }); }}>{actionLabels[action]}</Button>)}</div>
    </article>)}</div>
    </TabsContent></Tabs>
    <AlertDialog open={!!choice} onOpenChange={(open) => { if (!open && !busy) setChoice(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{choice ? actionLabels[choice.action] : "Decisión"}</AlertDialogTitle><AlertDialogDescription>{choice?.action === "approve" ? "Confirmo que revisé el contenido, sus datos personales, el contexto y la vigencia. Se publicará como comunitario, sin extender sus 2 horas originales." : "Esta acción no borra el registro. Se guarda la decisión y el motivo para revisión interna."}</AlertDialogDescription></AlertDialogHeader>
        {choice?.action !== "approve" && <div><label htmlFor="review-reason" className="mb-2 block font-semibold">Motivo</label><Select value={reason} onValueChange={(value) => setReason(value as typeof reason)} disabled={busy}><SelectTrigger id="review-reason" className="h-12 w-full"><SelectValue /></SelectTrigger><SelectContent>{decisionReasons.map((code) => <SelectItem key={code} value={code}>{reasonLabels[code]}</SelectItem>)}</SelectContent></Select></div>}
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><Button disabled={busy} onClick={() => void decide()}>{busy ? "Guardando decisión…" : "Confirmar decisión"}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
