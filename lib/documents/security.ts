import { createHash, randomUUID } from "node:crypto";

export const ACCEPTED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const dangerousExtensions = /\.(exe|dll|com|bat|cmd|ps1|msi|js|mjs|cjs|jar|scr|vbs|html?|svg)$/i;

export function documentMaxBytes(env = process.env) {
  const mb = Number(env.DOCUMENT_MAX_SIZE_MB || "25");
  if (!Number.isFinite(mb) || mb <= 0 || mb > 100) return 25 * 1024 * 1024;
  return Math.floor(mb * 1024 * 1024);
}

export function sanitizeDocumentFilename(name: string) {
  const leaf = name.replace(/\\/g, "/").split("/").pop() || "document";
  return leaf.normalize("NFKC").replace(/[^a-zA-Z0-9._ -]/g, "_").replace(/\s+/g, " ").slice(0, 120);
}

export function createPrivateBlobPath(filename: string) {
  const extension = sanitizeDocumentFilename(filename).match(/\.[a-zA-Z0-9]{1,8}$/)?.[0]?.toLowerCase() || "";
  return `private/${new Date().getUTCFullYear()}/${randomUUID()}${extension}`;
}

export function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function detectedMimeType(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b.length >= 5 && new TextDecoder().decode(b.slice(0, 5)) === "%PDF-") return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && [137,80,78,71,13,10,26,10].every((v, i) => b[i] === v)) return "image/png";
  if (b.length >= 12 && new TextDecoder().decode(b.slice(0, 4)) === "RIFF" && new TextDecoder().decode(b.slice(8, 12)) === "WEBP") return "image/webp";
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const sample = new TextDecoder("utf-8", { fatal: false }).decode(b.slice(0, 4096));
  if (!sample.includes("\0")) return sample.includes(",") ? "text/csv" : "text/plain";
  return null;
}

export function validateDocument(input: { filename: string; declaredType: string; bytes: Uint8Array; maxBytes?: number }) {
  if (dangerousExtensions.test(input.filename)) throw new Error("Dangerous file type rejected.");
  if (!input.bytes.length) throw new Error("Empty files are not allowed.");
  if (input.bytes.length > (input.maxBytes ?? documentMaxBytes())) throw new Error("Document exceeds the configured size limit.");
  if (!ACCEPTED_DOCUMENT_TYPES.has(input.declaredType)) throw new Error("Document MIME type is not allowed.");
  const detected = detectedMimeType(input.bytes);
  if (!detected || detected !== input.declaredType) throw new Error("Document content does not match its declared MIME type.");
  return { checksumSha256: sha256(input.bytes), detectedType: detected };
}
