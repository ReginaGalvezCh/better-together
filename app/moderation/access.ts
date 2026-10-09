import { env } from "cloudflare:workers";

// Server-only configuration. An empty list never grants moderator access.
export function moderatorIds() {
  return (env as unknown as { MODERATOR_USER_IDS?: string }).MODERATOR_USER_IDS;
}
