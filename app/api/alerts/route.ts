import { getD1 } from "@/db";
import { eventSessionIds } from "@/lib/events";
import { publicRequestsSql, readBoundedJson, receiveRequest, RequestValidationError } from "@/lib/community-requests";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session");
  if (!eventSessionIds.includes(sessionId as (typeof eventSessionIds)[number])) {
    return Response.json({ error: "Sesión no válida." }, { status: 400, headers: noStore });
  }
  try {
    const now = new Date().toISOString();
    const rows = await getD1().prepare(publicRequestsSql).bind(sessionId, now, now).all();
    return Response.json({ alerts: rows.results }, { headers: noStore });
  } catch {
    return Response.json({ error: "Las solicitudes no están disponibles." }, { status: 503, headers: noStore });
  }
}

export async function POST(request: Request) {
  try {
    const body = await readBoundedJson(request);
    const result = await receiveRequest(body, getD1());
    return Response.json({ receipt: result.receipt }, { status: result.status, headers: noStore });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return Response.json({ error: error.message }, { status: error.status, headers: noStore });
    }
    return Response.json({ error: "No pudimos confirmar la recepción. Intenta nuevamente." }, { status: 503, headers: noStore });
  }
}
