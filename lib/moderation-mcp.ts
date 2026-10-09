import { authorizeModerator, privateHeaders, type ModerationDatabase } from "./moderation.ts";
import { previewModerationCycle } from "./moderation-agent.ts";
import { agentStatus, runAgentPage } from "./agent-operations.ts";
import { readBoundedJson, RequestValidationError } from "./community-requests.ts";

const definitions = [
  { name: "moderation_status", description: "Estado y registros recientes del moderador. Sin texto de solicitudes.", annotations: { readOnlyHint: true } },
  { name: "preview_moderation_cycle", description: "Simulación sin cambios de contenido. Informa si quedan más de cincuenta solicitudes.", annotations: { readOnlyHint: true } },
  { name: "run_moderation_cycle", description: "Recorre una página de la cola y registra el resultado. Solo aplica las funciones habilitadas en el servidor; nunca aprueba solicitudes.", annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false } },
].map((tool) => ({ ...tool, inputSchema: { type: "object", properties: {}, additionalProperties: false } }));

export function moderationMcpHandler(deps: {
  identity: () => Promise<{ userId: string } | null>; allowlist: () => unknown; database: () => ModerationDatabase;
  configuration: () => { execution?: unknown; retention?: unknown }; now?: () => number;
}) {
  return async (request: Request) => {
    let id: unknown = null;
    const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: privateHeaders });
    const failure = (code: number, message: string, status = 200) => reply({ jsonrpc: "2.0", id, error: { code, message } }, status);
    try {
      const body = await readBoundedJson(request) as Record<string, unknown>;
      if (!body || Array.isArray(body) || body.jsonrpc !== "2.0" || typeof body.method !== "string") return failure(-32600, "Solicitud no válida.", 400);
      id = body.id ?? null;
      if (id !== null && typeof id !== "string" && typeof id !== "number") return failure(-32600, "Identificador no válido.", 400);
      if (body.method === "notifications/initialized" && body.id === undefined) return new Response(null, { status: 202, headers: privateHeaders });
      if (body.id === undefined) return failure(-32600, "Falta el identificador.", 400);
      // Discovery is intentionally public and carries no private data.
      if (body.method === "initialize") return reply({ jsonrpc: "2.0", id, result: {
        protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "better-together-moderation", version: "1.0.0" },
      } });
      if (body.method === "tools/list") return reply({ jsonrpc: "2.0", id, result: { tools: definitions } });
      if (body.method !== "tools/call") return failure(-32601, "Método no disponible.");
      // OAuth/identity is supplied by Sites dispatch, not caller parameters.
      // Service access alone does not satisfy this moderator allowlist.
      const actor = authorizeModerator(await deps.identity(), deps.allowlist());
      const origin = request.headers.get("origin");
      if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") {
        throw new RequestValidationError(403, "Origen no permitido.");
      }
      const params = body.params as Record<string, unknown> | undefined;
      if (!params || Array.isArray(params) || typeof params.name !== "string" || Object.keys(params).some((key) => !["name", "arguments", "_meta"].includes(key))) return failure(-32602, "Parámetros no válidos.");
      const args = params.arguments ?? {};
      if (!args || typeof args !== "object" || Array.isArray(args) || Object.keys(args).length) return failure(-32602, "No se aceptan decisiones ni opciones de activación.");
      if (!definitions.some((tool) => tool.name === params.name)) return failure(-32602, "Herramienta no disponible.");
      const db = deps.database();
      const result = params.name === "moderation_status" ? await agentStatus(db, deps.configuration())
        : params.name === "preview_moderation_cycle" ? await previewModerationCycle(db, deps.now?.())
        : await runAgentPage(db, actor, deps.configuration(), deps.now?.());
      return reply({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result } });
    } catch (error) {
      const known = error instanceof RequestValidationError;
      return failure(-32000, known ? error.message : "La operación no se completó. Revisa el registro antes de reintentar.", known ? error.status : 503);
    }
  };
}
