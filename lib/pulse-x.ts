import { z } from "zod";
import { collectPulseCandidates } from "./pulse-intake.ts";

const searchOptions = z.object({
  enabled: z.boolean().default(false),
  bearerToken: z.string().min(1).max(4096).regex(/^[^\s]+$/),
  hashtags: z.array(z.string().regex(/^[a-zA-Z0-9_]{1,50}$/)).min(1).max(8).default(["BTSChile", "BTSChile2026", "ARMYChile"]),
  // X handles must be explicitly supplied; never reuse TikTok handles by assumption.
  accounts: z.array(z.string().regex(/^[a-zA-Z0-9_]{1,15}$/)).max(8).default([]),
  sinceId: z.string().regex(/^\d{1,19}$/).optional(),
});
export type XSearchOptions = z.input<typeof searchOptions>;
const xResponseSchema = z.object({
  data: z.array(z.object({ id: z.string().regex(/^\d{1,19}$/), text: z.string().max(4000), created_at: z.string().datetime({ offset: true }) })).max(10).optional(),
  meta: z.object({ result_count: z.number().int().min(0).max(10).optional(), next_token: z.string().optional(), newest_id: z.string().regex(/^\d{1,19}$/).optional() }).optional(),
  errors: z.array(z.unknown()).optional(),
}).refine((payload) => payload.data !== undefined || payload.meta?.result_count === 0 || Boolean(payload.errors?.length))
  .refine((payload) => payload.meta?.result_count === undefined || payload.meta.result_count === (payload.data?.length ?? 0));

async function readBoundedJson(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("X returned no body");
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 256_000) throw new Error("X response too large");
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } finally { await reader.cancel(); }
}

/** One bounded, operator-enabled request. No polling, pagination, retry or publishing. */
export async function collectFromX(options: XSearchOptions, fetcher: typeof fetch = fetch, now = new Date(), knownUrls: readonly string[] = []) {
  // Gate before token validation or any network activity.
  if (options.enabled !== true) throw new Error("X collection is disabled");
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid collection time");
  const parsed = searchOptions.safeParse(options);
  if (!parsed.success) throw new Error("Invalid X configuration");
  const config = parsed.data;
  const tags = config.hashtags.map((tag) => `#${tag}`).join(" OR ");
  const accounts = config.accounts.length ? ` OR ((${config.accounts.map((account) => `from:${account}`).join(" OR ")}) (BTS OR Arirang))` : "";
  const query = `(${tags}${accounts} OR ((BTS OR Arirang) (Chile OR Santiago OR "Estadio Nacional"))) -is:retweet -is:reply lang:es`;
  if (query.length > 512) throw new Error("X query too long");
  const url = new URL("https://api.x.com/2/tweets/search/recent");
  url.searchParams.set("query", query);
  url.searchParams.set("max_results", "10");
  url.searchParams.set("post.fields", "created_at");
  url.searchParams.set("sort_order", "recency");
  if (config.sinceId) url.searchParams.set("since_id", config.sinceId);
  else url.searchParams.set("start_time", new Date(now.getTime() - 24 * 60 * 60_000).toISOString());
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { Authorization: `Bearer ${config.bearerToken}` },
      redirect: "error", signal: AbortSignal.timeout(10_000), cache: "no-store",
    });
  } catch { throw new Error("X connection failed; no automatic retry"); }
  // Do not expose the response body or secret-bearing provider errors.
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(response.status === 429 ? "X rate limit reached; collection paused" : `X request failed (${response.status})`);
  }
  let payload: z.infer<typeof xResponseSchema>;
  try { payload = xResponseSchema.parse(await readBoundedJson(response)); }
  catch { throw new Error("Invalid X response; batch not processed"); }
  if (payload.errors?.length) throw new Error("Partial X response; batch not processed");
  const posts = payload.data ?? [];
  const result = collectPulseCandidates(posts.map((post) => ({
    platform: "x", url: `https://x.com/i/web/status/${post.id}`, text: post.text,
    publishedAt: post.created_at, sessions: "all",
  })), now, knownUrls);
  const cursor = posts.reduce<string | null>((latest, post) => latest === null || BigInt(post.id) > BigInt(latest) ? post.id : latest, config.sinceId ?? null);
  return {
    ...result, provider: "x" as const, fetchedCount: posts.length,
    hasMore: Boolean(payload.meta?.next_token),
    // Never advance the cursor over an uncollected page. This MVP is a bounded sample.
    nextSinceId: payload.meta?.next_token ? null : cursor,
  };
}
