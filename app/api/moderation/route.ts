import { getChatGPTUser } from "@/app/chatgpt-auth";
import { moderatorIds } from "@/app/moderation/access";
import { getD1 } from "@/db";
import { moderationHandlers } from "@/lib/moderation";

// Reading the panel never initiates data deletion. Maintenance belongs to the
// separately gated and logged agent operation.
const handlers = moderationHandlers({ identity: getChatGPTUser, allowlist: moderatorIds, database: getD1 });
export const GET = handlers.GET;
export const POST = handlers.POST;
