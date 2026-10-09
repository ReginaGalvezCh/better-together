import { getChatGPTUser } from "@/app/chatgpt-auth";
import { moderatorIds } from "@/app/moderation/access";
import { getD1 } from "@/db";
import { agentPreviewHandler } from "@/lib/moderation-agent";

export const POST = agentPreviewHandler({ identity: getChatGPTUser, allowlist: moderatorIds, database: getD1 });
