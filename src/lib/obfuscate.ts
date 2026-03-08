export function encodeEvents(data: unknown): string {
  const json = JSON.stringify(data);
  const b64 = Buffer.from(json, "utf-8").toString("base64");
  const reversed = b64.split("").reverse().join("");
  const chunks: string[] = [];
  const chunkSize = 64;
  for (let i = 0; i < reversed.length; i += chunkSize) {
    chunks.push(reversed.slice(i, i + chunkSize));
    chunks.push(Math.random().toString(36).slice(2, 10));
  }
  return chunks.join("|");
}

export function decodeEvents(encoded: string): unknown {
  const parts = encoded.split("|");
  const real: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    real.push(parts[i]);
  }
  const reversed = real.join("");
  const b64 = reversed.split("").reverse().join("");
  const json = atob(b64);
  return JSON.parse(json);
}
