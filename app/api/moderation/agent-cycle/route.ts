import { getChatGPTUser } from "@/app/chatgpt-auth";
import { moderatorIds } from "@/app/moderation/access";
import { getD1 } from "@/db";
import { agentCycleHandler } from "@/lib/moderation-agent";
import { env } from "cloudflare:workers";

export const POST = agentCycleHandler({ identity: getChatGPTUser, allowlist: moderatorIds, database: getD1,
  configuration: () => {
    const config = env as unknown as { MODERATION_AGENT_ENABLED?: string; DATA_RETENTION_ENABLED?: string };
    return { execution: config.MODERATION_AGENT_ENABLED, retention: config.DATA_RETENTION_ENABLED };
  } });
