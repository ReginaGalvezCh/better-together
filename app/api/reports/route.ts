import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getD1 } from "@/db";
import { env } from "cloudflare:workers";
import { reportHandler } from "@/lib/community-reports";

export const POST = reportHandler({ identity: getChatGPTUser, database: getD1,
  secret: () => (env as unknown as { COMMUNITY_HMAC_KEY?: string }).COMMUNITY_HMAC_KEY });
