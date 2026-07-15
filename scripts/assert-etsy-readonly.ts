import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ALLOWED_ETSY_SCOPES, assertReadOnlyEtsyScopes } from "../lib/etsy/scopes";

async function main() {
  assertReadOnlyEtsyScopes(ALLOWED_ETSY_SCOPES);
  const marketplaceFiles = ["lib/etsy/client.ts", "lib/etsy/endpoints.ts", "lib/etsy/sync.ts"];
  const forbiddenMethod = /method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i;
  for (const file of marketplaceFiles) {
    const source = await readFile(resolve(file), "utf8");
    if (forbiddenMethod.test(source) || /etsyRequest\s*\(/.test(source)) throw new Error(`Read-only Etsy guard failed: ${file}`);
  }
  process.stdout.write("Etsy marketplace client is GET-only.\n");
}
main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : "Read-only guard failed."}\n`); process.exitCode = 1; });
