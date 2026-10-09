import { getChatGPTUser } from "@/app/chatgpt-auth";
import { moderatorIds } from "@/app/moderation/access";
import { getD1 } from "@/db";
import { moderationMcpHandler } from "@/lib/moderation-mcp";
import { env } from "cloudflare:workers";

export const POST = moderationMcpHandler({ identity: getChatGPTUser, allowlist: moderatorIds, database: getD1,
  configuration: () => {
    const config = env as unknown as { MODERATION_AGENT_ENABLED?: string; DATA_RETENTION_ENABLED?: string };
    return { execution: config.MODERATION_AGENT_ENABLED, retention: config.DATA_RETENTION_ENABLED };
  } });
