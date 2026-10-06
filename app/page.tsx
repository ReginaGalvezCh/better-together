"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CircleCheck,
  HeartHandshake,
  Info,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRoundSearch,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  alertCategories,
  categoryLabels,
  type AlertInput,
  type CommunityAlert,
  zones,
} from "@/lib/alerts";

const demos: CommunityAlert[] = [
  {
    id: "demo-safe",
    alias: "PurpleMoon",
    category: "safe-point",
    title: "Punto seguro: acceso norte",
    details: "Nos reunimos junto al letrero morado, sin bloquear el paso.",
    zone: "Acceso Norte",
    connectivity: "online",
    status: "active",
    createdAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 90 * 60_000).toISOString(),
  },
  {
    id: "demo-help",
    alias: "Borahae",
    category: "supplies",
    title: "¿Alguien tiene una toalla higiénica?",
    details: "Estoy cerca del baño del nivel 1. Puedo esperar aquí.",
    zone: "Nivel 1",
    connectivity: "online",
    status: "active",
    createdAt: new Date(Date.now() - 7 * 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 80 * 60_000).toISOString(),
  },
  {
    id: "demo-info",
    alias: "Mikrokosmos",
    category: "information",
    title: "Baños disponibles sin fila",
    details: "Los del acceso oriente están abiertos y con poca espera.",
    zone: "Acceso Oriente",
    connectivity: "online",
    status: "active",
    createdAt: new Date(Date.now() - 11 * 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 70 * 60_000).toISOString(),
  },
];

const icons = {
  emergency: BellRing,
  "missing-person": UserRoundSearch,
  medical: Stethoscope,
  security: ShieldAlert,
  "safe-point": MapPin,
  supplies: HeartHandshake,
  information: Sparkles,
};

const pendingKey = "better-together:pending-alerts";

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "Ahora";
  if (minutes === 1) return "Hace 1 min";
  return `Hace ${minutes} min`;
}

function readPending(): AlertInput[] {
  try {
    return JSON.parse(localStorage.getItem(pendingKey) || "[]") as AlertInput[];
  } catch {
    return [];
  }
}

function savePending(items: AlertInput[]) {
  localStorage.setItem(pendingKey, JSON.stringify(items));
}

export default function Home() {
  const [alerts, setAlerts] = useState<CommunityAlert[]>(demos);
  const [online, setOnline] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AlertInput["category"]>("safe-point");
  const [submitting, setSubmitting] = useState(false);
  const [helped, setHelped] = useState<string[]>([]);

  const loadAlerts = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const response = await fetch("/api/alerts", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { alerts: CommunityAlert[] };
      setAlerts(data.alerts);
    } catch {
      // Keep the last useful view; connectivity status already explains the state.
    }
  }, []);

  const publish = useCallback(async (input: AlertInput) => {
    const response = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("publish_failed");
    return ((await response.json()) as { alert: CommunityAlert }).alert;
  }, []);

  const syncPending = useCallback(async () => {
    const pending = readPending();
    if (!pending.length || !navigator.onLine) return;
    const remaining: AlertInput[] = [];
    let synced = 0;
    for (const item of pending) {
      try {
        const alert = await publish({ ...item, connectivity: "queued" });
        setAlerts((current) => [alert, ...current.filter((entry) => entry.id !== alert.id)]);
        synced += 1;
      } catch {
        remaining.push(item);
      }
    }
    savePending(remaining);
    if (synced) toast.success(`${synced} alerta${synced > 1 ? "s" : ""} sincronizada${synced > 1 ? "s" : ""}`);
  }, [publish]);

  useEffect(() => {
    const updateStatus = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void syncPending();
    };
    setOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    void loadAlerts();
    const interval = window.setInterval(loadAlerts, 15_000);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
      window.clearInterval(interval);
    };
  }, [loadAlerts, syncPending]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: "create_community_alert",
          title: "Crear alerta comunitaria",
          description: "Publica una alerta anónima en Better Together usando una zona aproximada.",
          inputSchema: {
            type: "object",
            properties: {
              alias: { type: "string", minLength: 2, maxLength: 24 },
              category: { type: "string", enum: alertCategories },
              title: { type: "string", minLength: 4, maxLength: 80 },
              details: { type: "string", maxLength: 240 },
              zone: { type: "string", enum: zones },
            },
            required: ["alias", "category", "title", "zone"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          async execute(input: unknown) {
            const value = input as AlertInput;
            const alert = await publish({ ...value, details: value.details || "", connectivity: "online" });
            setAlerts((current) => [alert, ...current]);
            return { id: alert.id, status: alert.status, zone: alert.zone };
          },
        },
        { signal: lifecycle.signal }
      )
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, [publish]);

  const activeCount = useMemo(() => alerts.filter((item) => item.status === "active").length, [alerts]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const input: AlertInput = {
      alias: String(form.get("alias") || "").trim(),
      category: selectedCategory,
      title: String(form.get("title") || "").trim(),
      details: String(form.get("details") || "").trim(),
      zone: String(form.get("zone") || zones[0]) as AlertInput["zone"],
      connectivity: online ? "online" : "queued",
      website: String(form.get("website") || ""),
    };

    if (input.alias.length < 2 || input.title.length < 4) {
      toast.error("Completa el alias y un título claro.");
      setSubmitting(false);
      return;
    }

    if (!online) {
      savePending([...readPending(), input]);
      const optimistic: CommunityAlert = {
        ...input,
        id: crypto.randomUUID(),
        status: "active",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      };
      setAlerts((current) => [optimistic, ...current]);
      setOpen(false);
      toast.info("Alerta guardada. Se enviará cuando vuelva la señal.");
      setSubmitting(false);
      return;
    }

    try {
      const alert = await publish(input);
      setAlerts((current) => [alert, ...current]);
      setOpen(false);
      toast.success("Alerta publicada por 2 horas.");
      event.currentTarget.reset();
    } catch {
      savePending([...readPending(), { ...input, connectivity: "queued" }]);
      toast.info("No hubo conexión. Guardamos la alerta para enviarla después.");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen pb-28">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[var(--background)]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_30px_rgb(124_58_237/35%)]">
              <HeartHandshake size={21} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-violet-300">ARMY se cuida</p>
              <p className="font-semibold leading-tight">Better Together</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${online ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-amber-300/20 bg-amber-300/10 text-amber-100"}`}>
            {online ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{online ? "En línea" : "Sin señal"}</span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-medium text-violet-300">Estadio · Hoy</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">¿Qué está pasando cerca?</h1>
          </div>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-sm font-medium text-emerald-200">
            {activeCount} activas
          </span>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button className="quick-card danger" type="button" onClick={() => { setSelectedCategory("emergency"); setOpen(true); }}><BellRing size={20} /> Emergencia</button>
          <button className="quick-card" type="button" onClick={() => { setSelectedCategory("safe-point"); setOpen(true); }}><MapPin size={20} /> Punto seguro</button>
          <button className="quick-card" type="button" onClick={() => { setSelectedCategory("supplies"); setOpen(true); }}><HeartHandshake size={20} /> Necesito algo</button>
          <button className="quick-card" type="button" onClick={() => { setSelectedCategory("information"); setOpen(true); }}><ShieldCheck size={20} /> Aviso útil</button>
        </div>

        {!online && (
          <div className="mb-4 flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-amber-50">
            <WifiOff className="mt-0.5 shrink-0" size={20} />
            <p><strong>Sigues acompañada.</strong> Puedes consultar lo último cargado y crear alertas; se enviarán al recuperar señal.</p>
          </div>
        )}

        <div className="space-y-3" aria-label="Alertas cercanas">
          {alerts.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-10 text-center">
              <ShieldCheck className="mx-auto mb-3 text-emerald-300" size={32} />
              <h2 className="text-lg font-semibold">No hay alertas activas en esta zona</h2>
              <p className="mt-1 text-muted-foreground">Si necesitas comunicar algo, crea una alerta breve y usa solo una ubicación aproximada.</p>
            </div>
          )}
          {alerts.map((alert) => {
            const Icon = icons[alert.category];
            const wasHelped = helped.includes(alert.id);
            return (
              <article className={`alert-card ${alert.category}`} key={alert.id}>
                <div className="alert-icon"><Icon size={22} aria-hidden="true" /></div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-violet-200">{categoryLabels[alert.category]}</span>
                    <span className="text-sm text-muted-foreground">{relativeTime(alert.createdAt)} · {alert.zone}</span>
                  </div>
                  <h2 className="text-lg font-semibold leading-snug">{alert.title}</h2>
                  {alert.details && <p className="mt-1 leading-relaxed text-muted-foreground">{alert.details}</p>}
                  <p className="mt-2 text-sm text-violet-200/70">Publicado por {alert.alias}</p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setHelped((current) => current.includes(alert.id) ? current : [...current, alert.id]);
                        toast.success("Gracias. La persona sabrá que alguien puede ayudar.");
                      }}
                      disabled={wasHelped}
                    >
                      {wasHelped ? <CircleCheck size={16} /> : <HeartHandshake size={16} />}
                      {wasHelped ? "Avisado" : "Puedo ayudar"}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-5 flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
          <Info className="shrink-0 text-violet-300" size={19} />
          <p>Better Together no reemplaza a los servicios de emergencia. Ante peligro inmediato, contacta al personal del recinto o a emergencias.</p>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0b0714]/92 p-3 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="h-14 w-full rounded-2xl text-base font-bold shadow-[0_12px_40px_rgb(124_58_237/38%)]" />}>
              <BellRing size={20} /> Crear una alerta
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#171026] text-white sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Crear una alerta</DialogTitle>
                <DialogDescription className="text-violet-200/70">
                  Usa una zona aproximada. No compartas nombres reales, teléfonos ni ubicaciones exactas.
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <Label className="mb-2">Tipo de alerta</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {alertCategories.map((category) => (
                      <button
                        key={category}
                        className={`category-choice ${category === "emergency" ? "urgent" : ""} ${selectedCategory === category ? "selected" : ""}`}
                        type="button"
                        onClick={() => setSelectedCategory(category)}
                      >
                        {categoryLabels[category]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="alias">Alias anónimo</Label>
                  <Input id="alias" name="alias" maxLength={24} placeholder="Ej. PurpleMoon" required autoComplete="off" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="title">¿Qué está pasando?</Label>
                  <Input id="title" name="title" maxLength={80} placeholder="Un mensaje corto y claro" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="details">Detalle opcional</Label>
                  <Textarea id="details" name="details" maxLength={240} placeholder="Agrega solo lo necesario para poder ayudar" rows={3} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="zone">Zona aproximada</Label>
                  <Select name="zone" defaultValue={zones[0]}>
                    <SelectTrigger id="zone" className="h-11 w-full bg-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((zone) => <SelectItem key={zone} value={zone}>{zone}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <input className="hidden" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                <Button className="h-12 w-full text-base font-bold" type="submit" disabled={submitting}>
                  {submitting ? "Guardando…" : online ? "Publicar por 2 horas" : "Guardar para enviar después"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </main>
  );
}
