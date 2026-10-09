import { collectPulseCandidates } from "../lib/pulse-intake.ts";
import { collectFromX } from "../lib/pulse-x.ts";

// Local operator tool only. No public endpoint or persistence.
try {
  if (process.argv.slice(2).includes("--x")) {
    const result = await collectFromX({
      enabled: process.env.PULSE_X_ENABLED === "true",
      bearerToken: process.env.X_BEARER_TOKEN ?? "",
      accounts: process.env.PULSE_X_ACCOUNTS?.split(",").filter(Boolean) ?? [],
      sinceId: process.env.PULSE_X_SINCE_ID || undefined,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    let input = "";
    for await (const chunk of process.stdin) {
      input += chunk.toString();
      if (Buffer.byteLength(input) > 256_000) throw new Error("Input too large");
    }
    const result = collectPulseCandidates(JSON.parse(input));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }
} catch {
  // Never echo untrusted text, URLs, personal data or parsing internals.
  process.stderr.write("No se pudo recolectar el lote. Revisa el JSON o la habilitación, credenciales y límites de X. No se reintentó ni se publicó información.\n");
  process.exitCode = 1;
}
