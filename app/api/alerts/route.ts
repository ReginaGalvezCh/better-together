import { and, desc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { alerts, anonymousEvents } from "@/db/schema";
import { alertInputSchema } from "@/lib/alerts";

export async function GET() {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const rows = await db
      .select()
      .from(alerts)
      .where(and(eq(alerts.status, "active"), gt(alerts.expiresAt, now)))
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

    const now = new Date();
    const record = {
      id: crypto.randomUUID(),
      alias: parsed.data.alias,
      category: parsed.data.category,
      title: parsed.data.title,
      details: parsed.data.details,
      zone: parsed.data.zone,
      connectivity: parsed.data.connectivity,
      status: "active",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    };

    const db = getDb();
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

