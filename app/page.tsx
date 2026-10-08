"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Clock3, Droplets, ExternalLink, HeartHandshake, Info, Map as MapIcon, MapPin, Moon, Newspaper, RefreshCw, ShieldCheck, Snowflake, Sparkles, Sun, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { categoryLabels, enabledAlertCategories, type AlertInput, type CommunityAlert } from "@/lib/alerts";
import { activities, eventSessions, getCountdownParts, getDefaultSession, getSessionPhase, informationItems, pulseItems, type EventSessionId } from "@/lib/events";
import { filterByZone, isZone, sectors, zones, type Zone } from "@/lib/sectors";
import { forecastForDate, weatherApiUrl, type WeatherForecast, type WeatherKind, type WeatherResponse } from "@/lib/weather";

const alertIcons = { "safe-point": MapPin, supplies: HeartHandshake, information: Sparkles };
const pendingKey = "better-together:pending-alerts:v2";
const selectedZoneKey = "better-together:selected-zone:v1";
const cacheKey = (sessionId: EventSessionId) => `better-together:alerts:${sessionId}`;
type FeedState = "loading" | "ready" | "cached" | "error";
type CachedFeed = { alerts: CommunityAlert[]; fetchedAt: string };
type WeatherState = "loading" | "ready" | "unavailable" | "error";

const weatherIcons: Record<WeatherKind, typeof Sun> = {
  clear: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  storm: CloudLightning,
  snow: Snowflake,
};

class PublishError extends Error {
  constructor(public status: number) { super("publish_failed"); }
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "Ahora";
  if (minutes === 1) return "Hace 1 min";
  return `Hace ${minutes} min`;
}

function readPending(): AlertInput[] {
  try { return JSON.parse(localStorage.getItem(pendingKey) || "[]") as AlertInput[]; }
  catch { return []; }
}
function savePending(items: AlertInput[]) { localStorage.setItem(pendingKey, JSON.stringify(items)); }
function readCached(sessionId: EventSessionId): CachedFeed | null {
  try { return JSON.parse(localStorage.getItem(cacheKey(sessionId)) || "null") as CachedFeed | null; }
  catch { return null; }
}
function saveCached(sessionId: EventSessionId, alerts: CommunityAlert[]) {
  localStorage.setItem(cacheKey(sessionId), JSON.stringify({ alerts, fetchedAt: new Date().toISOString() }));
}

export default function Home() {
  const [selectedSessionId, setSelectedSessionId] = useState<EventSessionId>(() => getDefaultSession().id);
  const [activeSection, setActiveSection] = useState("home");
  const [now, setNow] = useState(() => new Date());
  const [alerts, setAlerts] = useState<CommunityAlert[]>([]);
  const [feedState, setFeedState] = useState<FeedState>("loading");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AlertInput["category"]>("safe-point");
  const [submitting, setSubmitting] = useState(false);
  const [weather, setWeather] = useState<Record<string, WeatherForecast>>({});
  const [weatherState, setWeatherState] = useState<WeatherState>("loading");
  const [darkMode, setDarkMode] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [requestZone, setRequestZone] = useState<Zone>(zones[0]);

  const selectedSession = useMemo(() => eventSessions.find((session) => session.id === selectedSessionId) ?? eventSessions[0], [selectedSessionId]);
  const phase = getSessionPhase(selectedSession, now);
  const countdown = getCountdownParts(selectedSession, now);
  const selectedWeather = weather[selectedSession.date];
  const WeatherIcon = selectedWeather ? weatherIcons[selectedWeather.kind] : CloudSun;
  const visibleAlerts = useMemo(() => filterByZone(alerts, selectedZone), [alerts, selectedZone]);

  const publish = useCallback(async (input: AlertInput) => {
    const response = await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    if (!response.ok) throw new PublishError(response.status);
    return ((await response.json()) as { alert: CommunityAlert }).alert;
  }, []);

  const loadAlerts = useCallback(async (sessionId: EventSessionId, silent = false) => {
    const cached = readCached(sessionId);
    if (!silent) {
      if (cached) {
        setAlerts(cached.alerts.filter((alert) => new Date(alert.expiresAt).getTime() > Date.now()));
        setLastUpdatedAt(cached.fetchedAt);
        setFeedState("cached");
      } else {
        setAlerts([]);
        setFeedState(navigator.onLine ? "loading" : "error");
      }
    }
    if (!navigator.onLine) return;
    try {
      const response = await fetch(`/api/alerts?session=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("load_failed");
      const data = (await response.json()) as { alerts: CommunityAlert[] };
      const fetchedAt = new Date().toISOString();
      setAlerts(data.alerts);
      setLastUpdatedAt(fetchedAt);
      setFeedState("ready");
      saveCached(sessionId, data.alerts);
    } catch { setFeedState(cached ? "cached" : "error"); }
  }, []);

  const syncPending = useCallback(async () => {
    const pending = readPending();
    if (!pending.length || !navigator.onLine) return;
    const remaining: AlertInput[] = [];
    let synced = 0;
    let expired = 0;
    for (const item of pending) {
      try {
        const alert = await publish({ ...item, connectivity: "queued" });
        if (alert.sessionId === selectedSessionId) setAlerts((current) => [alert, ...current.filter((entry) => entry.id !== alert.id)]);
        synced += 1;
      } catch (error) {
        if (error instanceof PublishError && error.status >= 400 && error.status < 500) expired += 1;
        else remaining.push(item);
      }
    }
    savePending(remaining);
    if (synced) toast.success(`${synced} solicitud${synced > 1 ? "es" : ""} sincronizada${synced > 1 ? "s" : ""}`);
    if (expired) toast.info(`${expired} solicitud${expired > 1 ? "es" : ""} guardada${expired > 1 ? "s" : ""} ya había${expired > 1 ? "n" : ""} vencido`);
  }, [publish, selectedSessionId]);

  useEffect(() => {
    const restoreTheme = window.setTimeout(() => {
      const useDark = localStorage.getItem("better-together:theme") === "dark";
      setDarkMode(useDark);
      document.documentElement.dataset.theme = useDark ? "dark" : "light";
    }, 0);
    return () => window.clearTimeout(restoreTheme);
  }, []);

  useEffect(() => {
    const restoreZone = window.setTimeout(() => {
      const savedZone = localStorage.getItem(selectedZoneKey);
      if (isZone(savedZone)) {
        setSelectedZone(savedZone);
        setRequestZone(savedZone);
      }
    }, 0);
    return () => window.clearTimeout(restoreZone);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadWeather = window.setTimeout(async () => {
      try {
        const response = await fetch(weatherApiUrl, { signal: controller.signal });
        if (!response.ok) throw new Error("weather_failed");
        const payload = (await response.json()) as WeatherResponse;
        const available = Object.fromEntries(eventSessions.flatMap((session) => {
          const forecast = forecastForDate(payload, session.date);
          return forecast ? [[session.date, forecast]] : [];
        }));
        setWeather(available);
        setWeatherState(Object.keys(available).length ? "ready" : "unavailable");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setWeatherState("error");
      }
    }, 0);
    return () => {
      window.clearTimeout(loadWeather);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadAlerts(selectedSessionId), 0);
    const interval = window.setInterval(() => void loadAlerts(selectedSessionId, true), 15_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadAlerts, selectedSessionId]);

  useEffect(() => {
    const updateStatus = () => { setOnline(navigator.onLine); if (navigator.onLine) void syncPending(); };
    const updateTime = () => setNow(new Date());
    const initialStatus = window.setTimeout(updateStatus, 0);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    document.addEventListener("visibilitychange", updateTime);
    const interval = window.setInterval(updateTime, 60_000);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
      document.removeEventListener("visibilitychange", updateTime);
      window.clearTimeout(initialStatus);
      window.clearInterval(interval);
    };
  }, [syncPending]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "create_community_request",
      title: "Crear solicitud comunitaria",
      description: "Publica una solicitud cotidiana y anónima para una sesión de Better Together.",
      inputSchema: {
        type: "object",
        properties: {
          alias: { type: "string", minLength: 2, maxLength: 24 },
          category: { type: "string", enum: enabledAlertCategories },
          title: { type: "string", minLength: 4, maxLength: 80 },
          details: { type: "string", maxLength: 240 },
          zone: { type: "string", enum: zones },
          sessionId: { type: "string", enum: eventSessions.map((session) => session.id) },
        },
        required: ["alias", "category", "title", "zone", "sessionId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input: unknown) {
        const value = input as Omit<AlertInput, "clientRequestId" | "createdAt" | "connectivity">;
        const alert = await publish({ ...value, details: value.details || "", clientRequestId: crypto.randomUUID(), createdAt: new Date().toISOString(), connectivity: "online" });
        if (alert.sessionId === selectedSessionId) setAlerts((current) => [alert, ...current]);
        return { id: alert.id, status: alert.status, zone: alert.zone, sessionId: alert.sessionId };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [publish, selectedSessionId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSubmitting(true);
    const form = new FormData(formElement);
    const input: AlertInput = {
      sessionId: selectedSessionId,
      clientRequestId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      alias: String(form.get("alias") || "").trim(),
      category: selectedCategory,
      title: String(form.get("title") || "").trim(),
      details: String(form.get("details") || "").trim(),
      zone: requestZone,
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
        sessionId: input.sessionId,
        clientRequestId: input.clientRequestId,
        createdAt: input.createdAt,
        alias: input.alias,
        category: input.category,
        title: input.title,
        details: input.details,
        zone: input.zone,
        connectivity: input.connectivity,
        id: `pending-${input.clientRequestId}`,
        status: "active",
        expiresAt: new Date(new Date(input.createdAt).getTime() + 2 * 60 * 60 * 1000).toISOString(),
      };
      setAlerts((current) => [optimistic, ...current]);
      setFeedState("cached");
      setOpen(false);
      formElement.reset();
      toast.info("Solicitud guardada en este dispositivo. Se intentará enviar al recuperar señal.");
      setSubmitting(false);
      return;
    }
    try {
      const alert = await publish(input);
      setAlerts((current) => [alert, ...current]);
      setFeedState("ready");
      setOpen(false);
      formElement.reset();
      toast.success("Solicitud publicada para esta sesión por 2 horas.");
    } catch (error) {
      if (error instanceof PublishError && error.status >= 400 && error.status < 500) toast.error("No pudimos publicar: revisa el contenido e inténtalo nuevamente.");
      else {
        savePending([...readPending(), { ...input, connectivity: "queued" }]);
        toast.info("No pudimos confirmar el envío. Quedó pendiente en este dispositivo.");
        setOpen(false);
      }
    } finally { setSubmitting(false); }
  }

  function startRequest(category: AlertInput["category"]) {
    setSelectedCategory(category);
    if (selectedZone) setRequestZone(selectedZone);
    setActiveSection("help");
    setOpen(true);
  }

  function chooseZone(zone: Zone | null) {
    setSelectedZone(zone);
    if (zone) {
      setRequestZone(zone);
      localStorage.setItem(selectedZoneKey, zone);
    } else {
      localStorage.removeItem(selectedZoneKey);
    }
  }

  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      document.documentElement.dataset.theme = next ? "dark" : "light";
      localStorage.setItem("better-together:theme", next ? "dark" : "light");
      return next;
    });
  }

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-30 border-b bg-[var(--background)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="brand-mark"><HeartHandshake size={21} aria-hidden="true" /></span>
            <div><p className="brand-kicker">ARMY se cuida</p><p className="font-semibold leading-tight">Better Together</p></div>
          </div>
          <div className="header-tools">
            <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={darkMode ? "Usar modo claro" : "Usar modo nocturno"}>{darkMode ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}</button>
            <div className={`connection-pill ${online ? "online" : "offline"}`}>
              {online ? <Wifi size={16} aria-hidden="true" /> : <WifiOff size={16} aria-hidden="true" />}<span>{online ? "En línea" : "Sin señal"}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-4"><p className="eyebrow mb-1">BTS WORLD TOUR ARIRANG · Santiago</p><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tu concierto, a mano</h1></div>
        <div className="session-strip mb-4" aria-label="Sesiones del concierto">
          {eventSessions.map((session) => {
            const selected = session.id === selectedSessionId;
            return <button key={session.id} className={`session-button ${selected ? "selected" : ""}`} type="button" aria-pressed={selected} onClick={() => setSelectedSessionId(session.id)}><span>{session.shortDate}</span><small>20:00 aprox.</small></button>;
          })}
        </div>

        <div className="event-moment mb-5">
          <div className="event-summary"><span className="phase-label">{phase}</span><h2 className="mt-2 text-2xl font-bold">{selectedSession.dateLabel}</h2><p className="mt-1 text-muted-foreground">Coliseo Central · Estadio Nacional</p></div>
          <div className="countdown" aria-label="Tiempo hasta el inicio estimado">
            {countdown.complete ? <p>La hora estimada ya pasó. Revisa las actualizaciones; esto no confirma que el show haya comenzado.</p> : <><span><strong>{countdown.days}</strong><small>días</small></span><span><strong>{countdown.hours}</strong><small>horas</small></span><span><strong>{countdown.minutes}</strong><small>min</small></span></>}
          </div>
          <div className="weather-card" aria-live="polite">
            <span className="weather-icon"><WeatherIcon aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <p className="weather-label">Pronóstico para ese día</p>
              {selectedWeather ? <><p className="weather-main">{selectedWeather.label} · {selectedWeather.max}° / {selectedWeather.min}°</p><p className="weather-detail"><Droplets size={14} aria-hidden="true" /> {selectedWeather.rainProbability}% de lluvia · Puede cambiar</p></> : <><p className="weather-main">{weatherState === "loading" ? "Consultando el clima…" : weatherState === "error" ? "No pudimos actualizarlo" : "Disponible más cerca de la fecha"}</p><p className="weather-detail">El pronóstico solo aparece cuando hay datos para este día.</p></>}
            </div>
            <a className="weather-source" href="https://open-meteo.com/" target="_blank" rel="noreferrer" aria-label="Fuente del pronóstico: Open-Meteo">Open-Meteo <ExternalLink /></a>
          </div>
          <p className="event-time"><Clock3 size={16} aria-hidden="true" /> Inicio estimado · 20:00</p>
        </div>

        <section className="quick-actions mb-5" aria-labelledby="quick-actions-title">
          <div className="quick-actions-heading"><p className="eyebrow">Acciones rápidas</p><h2 id="quick-actions-title">¿Qué necesitas ahora?</h2></div>
          <button className="primary-action" type="button" onClick={() => startRequest("supplies")}><span className="action-icon"><HeartHandshake aria-hidden="true" /></span><span><strong>Necesito ayuda</strong><small>Agua, cargador o artículos básicos</small></span></button>
          <button className="primary-action meeting" type="button" onClick={() => startRequest("safe-point")}><span className="action-icon"><MapPin aria-hidden="true" /></span><span><strong>Punto de encuentro</strong><small>Comparte una zona fácil de reconocer</small></span></button>
        </section>

        <Tabs value={activeSection} onValueChange={setActiveSection}>
          <TabsList className="section-tabs mb-5 h-auto w-full" aria-label="Secciones del evento">
            <TabsTrigger value="home"><Info /> Inicio</TabsTrigger><TabsTrigger value="pulse"><Newspaper /> Avisos</TabsTrigger><TabsTrigger value="help"><HeartHandshake /> Ayuda</TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="space-y-3">
            <div className="community-status">
              <span className={`signal-dot ${online ? "online" : "offline"}`} aria-hidden="true" />
              <div><p className="eyebrow">Comunidad · {selectedSession.shortDate}</p><h2>{feedState === "loading" ? "Buscando actividad reciente" : visibleAlerts.length ? `${visibleAlerts.length} solicitud${visibleAlerts.length === 1 ? "" : "es"} ${selectedZone ? `en ${selectedZone}` : "activa" + (visibleAlerts.length === 1 ? "" : "s")}` : selectedZone ? `Sin solicitudes en ${selectedZone}` : "Todo tranquilo por ahora"}</h2></div>
              <button type="button" onClick={() => setActiveSection("help")}>Ver comunidad</button>
            </div>
            <div className="section-heading"><div><p>Antes de salir</p><h2>Lo esencial para llegar</h2></div><span>Información revisada</span></div>
            {informationItems.slice(0, 2).map((item) => <article className="content-card essential-card" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-2"><h3>{item.title}</h3><span className={`status-chip status-${item.status.toLowerCase()}`}>{item.status}</span></div>
              <p className="mt-2 leading-relaxed text-muted-foreground">{item.value}</p>
              <div className="source-row"><span>{item.scope} · Revisado {item.reviewedAt}</span><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceLabel}<ExternalLink /></a></div>
            </article>)}
            <details className="more-details">
              <summary>Ver horarios, accesos y actividades</summary>
              <div className="space-y-3 pt-3">
                {informationItems.slice(2).map((item) => <article className="content-card" key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2"><h3>{item.title}</h3><span className={`status-chip status-${item.status.toLowerCase()}`}>{item.status}</span></div>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{item.value}</p>
                  <div className="source-row"><span>{item.scope} · Revisado {item.reviewedAt}</span><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceLabel}<ExternalLink /></a></div>
                </article>)}
                {activities.map((activity) => <article className="content-card" key={activity.id}>
                  <div className="flex gap-3"><span className="content-icon"><CalendarDays /></span><div><h3>{activity.title}</h3><p className="mt-2 font-medium text-foreground">{activity.schedule}</p><p className="mt-1 text-muted-foreground">{activity.location}</p></div></div>
                  <p className="mt-4 leading-relaxed text-muted-foreground">{activity.note}</p><div className="source-row"><span>Revisado {activity.reviewedAt}</span><a href={activity.sourceUrl} target="_blank" rel="noreferrer">{activity.sourceLabel}<ExternalLink /></a></div>
                </article>)}
              </div>
            </details>
          </TabsContent>

          <TabsContent value="pulse" className="space-y-3">
            <div className="section-heading"><div><p>Lo importante ahora</p><h2>Avisos para tu fecha</h2></div><span>Con fuente y fecha</span></div>
            {pulseItems.map((item) => <article className="content-card pulse-card" key={item.id}>
              <div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-primary">{item.source}</span><span className="status-chip">{item.kind}</span></div>
              <h3 className="mt-3">{item.title}</h3><p className="mt-2 leading-relaxed text-muted-foreground">{item.summary}</p>
              <div className="source-row"><span>{item.publishedLabel}</span><a href={item.url} target="_blank" rel="noreferrer">Abrir fuente<ExternalLink /></a></div>
            </article>)}
          </TabsContent>

          <TabsContent value="help" className="space-y-3">
            <div className="section-heading"><div><p>Ayuda cotidiana · En prueba</p><h2>Solicitudes de {selectedSession.shortDate}</h2></div><span>{visibleAlerts.length} visibles</span></div>
            <section className="sector-panel" aria-labelledby="sector-map-title">
              <div className="sector-panel-heading">
                <span className="sector-heading-icon"><MapIcon aria-hidden="true" /></span>
                <div><p className="eyebrow">Mapa sin GPS</p><h3 id="sector-map-title">¿En qué sector estás?</h3><p>Elige una zona para ver avisos cercanos. Puedes cambiarla cuando quieras.</p></div>
                <span className="privacy-chip"><ShieldCheck aria-hidden="true" /> Sin ubicación exacta</span>
              </div>
              <div className="sector-map" aria-label="Sectores aproximados del recinto">
                {sectors.map((sector) => {
                  const selected = selectedZone === sector.id;
                  const activeCount = alerts.filter((alert) => alert.zone === sector.id).length;
                  return <button key={sector.id} className={`sector-button sector-${sector.position} ${selected ? "selected" : ""}`} type="button" aria-pressed={selected} aria-label={`${sector.id}. ${sector.description}${activeCount ? `. ${activeCount} solicitudes activas` : ". Sin solicitudes activas"}`} onClick={() => chooseZone(sector.id)}>
                    <span>{sector.shortLabel}</span>{activeCount > 0 && <strong aria-hidden="true">{activeCount}</strong>}
                  </button>;
                })}
                <span className="sector-stage" aria-hidden="true">Escenario</span>
              </div>
              <div className="sector-selection">
                <div><strong>{selectedZone ? `Viendo ${selectedZone}` : "Viendo todos los sectores"}</strong><p>La selección queda guardada únicamente en este dispositivo.</p></div>
                <button className="all-zones-button" type="button" aria-pressed={selectedZone === null} onClick={() => chooseZone(null)}>Ver todos</button>
              </div>
            </section>
            <div className="safety-note"><ShieldCheck aria-hidden="true" /><p><strong>Solo necesidades cotidianas.</strong> Para una urgencia, una persona perdida, riesgo médico o de seguridad, acude al personal del recinto o a los canales oficiales.</p></div>
            {!online && <div className="offline-note"><WifiOff aria-hidden="true" /><p>{feedState === "cached" ? "Ves contenido guardado en este dispositivo. Puede estar desactualizado." : "Sin una carga anterior no podemos mostrar solicitudes. Puedes guardar una nueva para intentar enviarla al recuperar señal."}</p></div>}
            {feedState === "loading" && <div className="empty-state"><RefreshCw className="animate-spin" /><h3>Cargando solicitudes</h3><p>Consultando esta sesión.</p></div>}
            {feedState === "error" && alerts.length === 0 && <div className="empty-state"><WifiOff /><h3>No pudimos cargar las solicitudes</h3><p>No mostraremos ejemplos como si fueran actividad real.</p><Button variant="secondary" onClick={() => void loadAlerts(selectedSessionId)}>Reintentar</Button></div>}
            {feedState !== "loading" && feedState !== "error" && visibleAlerts.length === 0 && <div className="empty-state"><ShieldCheck /><h3>{selectedZone ? `No hay solicitudes en ${selectedZone}` : "No hay solicitudes activas"}</h3><p>{selectedZone ? "Puedes revisar todos los sectores o publicar una solicitud para esta zona." : "Este estado es real para la sesión seleccionada."}</p></div>}
            {visibleAlerts.map((alert) => {
              const Icon = alertIcons[alert.category];
              const pending = alert.id.startsWith("pending-");
              return <article className="alert-card" key={alert.id}><div className="alert-icon"><Icon aria-hidden="true" /></div><div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-primary">{categoryLabels[alert.category]}</span><span className="text-sm text-muted-foreground">{relativeTime(alert.createdAt)} · {alert.zone}</span></div>
                <h3 className="text-lg font-semibold leading-snug">{alert.title}</h3>{alert.details && <p className="mt-1 leading-relaxed text-muted-foreground">{alert.details}</p>}<p className="mt-2 text-sm text-primary">Alias: {alert.alias}</p>
                {pending && <span className="mt-3 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-sm text-amber-900">Pendiente de envío en este dispositivo</span>}
              </div></article>;
            })}
            {lastUpdatedAt && <p className="text-center text-sm text-muted-foreground">Última carga: {new Date(lastUpdatedAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</p>}

            <Button className="mt-2 h-14 w-full rounded-2xl text-base font-bold" onClick={() => setOpen(true)}><HeartHandshake /> Crear solicitud para {selectedSession.shortDate}</Button>
          </TabsContent>
        </Tabs>

        <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="request-dialog max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader><DialogTitle>Crear solicitud cotidiana</DialogTitle><DialogDescription className="text-muted-foreground">Se publicará solo en {selectedSession.dateLabel}. No compartas nombres reales, teléfonos ni ubicaciones exactas.</DialogDescription></DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div><Label className="mb-2">Tipo de solicitud</Label><div className="grid grid-cols-3 gap-2">{enabledAlertCategories.map((category) => <button key={category} className={`category-choice ${selectedCategory === category ? "selected" : ""}`} type="button" onClick={() => setSelectedCategory(category)}>{categoryLabels[category]}</button>)}</div></div>
                  <div className="grid gap-2"><Label htmlFor="alias">Alias anónimo</Label><Input id="alias" name="alias" maxLength={24} placeholder="Ej. PurpleMoon" required autoComplete="off" /></div>
                  <div className="grid gap-2"><Label htmlFor="title">¿Qué necesitas compartir?</Label><Input id="title" name="title" maxLength={80} placeholder="Un mensaje corto y claro" required /></div>
                  <div className="grid gap-2"><Label htmlFor="details">Detalle opcional</Label><Textarea id="details" name="details" maxLength={240} placeholder="Agrega solo lo necesario" rows={3} /></div>
                  <div className="grid gap-2"><Label htmlFor="zone">Zona aproximada</Label><Select name="zone" value={requestZone} onValueChange={(value) => { if (isZone(value)) setRequestZone(value); }}><SelectTrigger id="zone" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{zones.map((zone) => <SelectItem key={zone} value={zone}>{zone}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Publicamos solo el nombre del sector, nunca coordenadas.</p></div>
                  <input className="hidden" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                  <Button className="h-12 w-full text-base font-bold" type="submit" disabled={submitting}>{submitting ? "Guardando…" : online ? "Publicar por 2 horas" : "Guardar para intentar después"}</Button>
                </form>
              </DialogContent>
        </Dialog>

        <div className="app-note mt-5"><Info className="shrink-0 text-primary" size={19} aria-hidden="true" /><p>Better Together reúne orientación comunitaria; no reemplaza al organizador, al personal del recinto ni a los servicios de emergencia.</p></div>
        <footer className="site-footer">
          <p><strong>Better Together</strong><span>Hecho con cuidado para la comunidad.</span></p>
          <nav className="social-links" aria-label="Enlaces de Better Together">
            <a href="https://github.com/ReginaGalvezCh/better-together" target="_blank" rel="noreferrer" aria-label="Ver Better Together en GitHub"><span aria-hidden="true">GH</span></a>
            <a href="https://cl.linkedin.com/in/regina-galvez" target="_blank" rel="noreferrer" aria-label="Ver el perfil de Regina en LinkedIn"><span aria-hidden="true">in</span></a>
          </nav>
        </footer>
      </section>
    </main>
  );
}
