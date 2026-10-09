import { getChatGPTUser } from "@/app/chatgpt-auth";
import { moderatorIds } from "@/app/moderation/access";
import { getD1 } from "@/db";
import { moderationHandlers } from "@/lib/moderation";

const handlers = moderationHandlers({ identity: getChatGPTUser, allowlist: moderatorIds, database: getD1 });
export const GET = handlers.GET;
export const POST = handlers.POST;
