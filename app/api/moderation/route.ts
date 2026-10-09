import { getChatGPTUser } from "@/app/chatgpt-auth";
import { moderatorIds } from "@/app/moderation/access";
import { getD1 } from "@/db";
import { moderationHandlers } from "@/lib/moderation";
import { purgeExpiredData } from "@/lib/data-retention";
import { env } from "cloudflare:workers";

const handlers = moderationHandlers({ identity: getChatGPTUser, allowlist: moderatorIds, database: getD1,
  maintenance: async () => {
    if ((env as unknown as { DATA_RETENTION_ENABLED?: string }).DATA_RETENTION_ENABLED === "true") await purgeExpiredData(getD1());
  } });
export const GET = handlers.GET;
export const POST = handlers.POST;
