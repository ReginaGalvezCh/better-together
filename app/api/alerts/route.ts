import { getD1 } from "@/db";
import { eventSessionIds } from "@/lib/events";
import { publicRequestsSql, readBoundedJson, receiveRequest } from "@/lib/community-requests";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { env } from "cloudflare:workers";
import { communityActor, communityFailure, communityHeaders, consumeWriteBudget, requireCommunityOrigin } from "@/lib/community-protection";

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
  let cookie: string | null = null;
  try {
    requireCommunityOrigin(request);
    const actor = await communityActor(request, await getChatGPTUser(), (env as unknown as { COMMUNITY_HMAC_KEY?: string }).COMMUNITY_HMAC_KEY);
    cookie = actor.cookie;
    const body = await readBoundedJson(request);
    const db = getD1();
    const result = await receiveRequest(body, db, Date.now(), () => consumeWriteBudget(db, actor.actorKey, "request"));
    return Response.json({ receipt: result.receipt }, { status: result.status, headers: { ...communityHeaders, ...(cookie ? { "Set-Cookie": cookie } : {}) } });
  } catch (error) {
    return communityFailure(error, cookie);
  }
}
