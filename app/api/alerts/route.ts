import { and, desc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { alerts, anonymousEvents } from "@/db/schema";
import { alertInputSchema } from "@/lib/alerts";
import { eventSessionIds } from "@/lib/events";

export async function GET(request: Request) {
  try {
    const sessionId = new URL(request.url).searchParams.get("session");
    if (!eventSessionIds.includes(sessionId as (typeof eventSessionIds)[number])) {
      return Response.json({ error: "Sesión no válida." }, { status: 400 });
    }
    const db = getDb();
    const now = new Date().toISOString();
    const rows = await db
      .select()
      .from(alerts)
      .where(and(eq(alerts.sessionId, sessionId!), eq(alerts.status, "active"), gt(alerts.expiresAt, now)))
      .orderBy(desc(alerts.createdAt))
      .limit(50);

    return Response.json(
      { alerts: rows },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("alerts:list", error);
    return Response.json({ error: "Las alertas no están disponibles." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = alertInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Revisa los datos de la alerta." }, { status: 400 });
    }
    if (parsed.data.website) {
      return Response.json({ error: "Solicitud no válida." }, { status: 400 });
    }

    const createdAt = new Date(parsed.data.createdAt);
    const now = new Date();
    const age = now.getTime() - createdAt.getTime();
    if (age > 2 * 60 * 60 * 1000) {
      return Response.json({ error: "La solicitud guardada ya venció." }, { status: 410 });
    }
    if (age < -5 * 60 * 1000) {
      return Response.json({ error: "La fecha de la solicitud no es válida." }, { status: 400 });
    }

    const db = getDb();
    const [existing] = await db
      .select()
      .from(alerts)
      .where(eq(alerts.clientRequestId, parsed.data.clientRequestId))
      .limit(1);
    if (existing) {
      return Response.json({ alert: existing }, { status: 200 });
    }

    const record = {
      id: crypto.randomUUID(),
      sessionId: parsed.data.sessionId,
      clientRequestId: parsed.data.clientRequestId,
      alias: parsed.data.alias,
      category: parsed.data.category,
      title: parsed.data.title,
      details: parsed.data.details,
      zone: parsed.data.zone,
      connectivity: parsed.data.connectivity,
      status: "active",
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    };

    await db.insert(alerts).values(record);
    try {
      await db.insert(anonymousEvents).values({
        eventType: "alert_created",
        category: record.category,
        zone: record.zone,
        connectivity: record.connectivity,
        createdAt: record.createdAt,
      });
    } catch (metricsError) {
      console.error("alerts:metric", metricsError);
    }

    return Response.json({ alert: record }, { status: 201 });
  } catch (error) {
    console.error("alerts:create", error);
    return Response.json({ error: "No pudimos publicar la alerta." }, { status: 503 });
  }
}
