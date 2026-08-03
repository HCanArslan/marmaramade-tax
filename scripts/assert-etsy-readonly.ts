import { readdir, readFile } from "node:fs/promises";
import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ALLOWED_ETSY_SCOPES, assertReadOnlyEtsyScopes } from "../lib/etsy/scopes";

const roots = ["lib/etsy", "lib/inngest", "app/api/etsy", "app/api/inngest"];
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".cts"]);
const tokenTransport = "lib/etsy/token.ts";
const marketplaceTransport = "lib/etsy/client.ts";
const forbiddenMethod = /method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i;
const directFetch = /\bfetch\b/;
const genericRequest = /\betsyRequest\s*\(/;
const writeScope = /["'`]\b[a-z][a-z_]*_w\b["'`]/i;

const normalize = (value: string) => value.replaceAll("\\", "/");

async function filesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(target);
    return sourceExtensions.has(path.extname(entry.name)) ? [target] : [];
  }))).flat();
}

export async function validateEtsyReadOnlyBoundary(root = process.cwd()) {
  assertReadOnlyEtsyScopes(ALLOWED_ETSY_SCOPES);
  const violations: string[] = [];
  const files = (await Promise.all(roots.map((entry) => filesIn(resolve(root, entry))))).flat();
  for (const file of files) {
    const relative = normalize(path.relative(root, file));
    const source = await readFile(file, "utf8");
    if (genericRequest.test(source)) violations.push(`${relative}: generic Etsy request helper is forbidden`);
    if (writeScope.test(source)) violations.push(`${relative}: write-capable Etsy scope is forbidden`);
    if (forbiddenMethod.test(source) && relative !== tokenTransport) {
      violations.push(`${relative}: marketplace mutation HTTP method is forbidden`);
    }
    if (directFetch.test(source) && relative !== tokenTransport && relative !== marketplaceTransport) {
      violations.push(`${relative}: direct fetch bypasses the approved Etsy transports`);
    }
    if (/https:\/\/(?:api|openapi)\.etsy\.com\/v3\//.test(source) &&
        relative !== tokenTransport && relative !== marketplaceTransport && relative !== "lib/etsy/webhook.ts") {
      violations.push(`${relative}: direct Etsy API URL bypasses the approved transport`);
    }
  }
  const tokenSource = await readFile(resolve(root, tokenTransport), "utf8");
  const tokenMethods = Array.from(tokenSource.matchAll(/method\s*:\s*["'](POST|PUT|PATCH|DELETE)["']/gi), (match) => match[1].toUpperCase());
  if (!tokenSource.includes('const TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token"') ||
      tokenMethods.length !== 1 || tokenMethods[0] !== "POST") {
    violations.push(`${tokenTransport}: OAuth POST exception is not pinned to the token endpoint`);
  }
  return violations;
}

async function main() {
  const violations = await validateEtsyReadOnlyBoundary();
  if (violations.length) throw new Error(`Read-only Etsy guard failed:\n${violations.join("\n")}`);
  process.stdout.write("Etsy transports, jobs, routes, and scopes are GET-only (OAuth token POST excepted).\n");
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : "Read-only guard failed."}\n`); process.exitCode = 1; });
}
