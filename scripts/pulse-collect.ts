import { collectPulseCandidates } from "../lib/pulse-intake.ts";

// Local operator tool only. No public endpoint, network calls or persistence.
try {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk.toString();
    if (Buffer.byteLength(input) > 256_000) throw new Error("Input too large");
  }
  const result = collectPulseCandidates(JSON.parse(input));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch {
  // Never echo untrusted text, URLs, personal data or parsing internals.
  process.stderr.write("No se pudo procesar el lote. Usa un arreglo JSON válido de hasta 100 publicaciones y 256 KB.\n");
  process.exitCode = 1;
}
