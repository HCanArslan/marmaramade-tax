import { z } from "zod";

const SPREADSHEET_FORMULA_PREFIX = /^[\t\r ]*[=+\-@]/;

export function neutralizeSpreadsheetFormula(value: unknown) {
  if (typeof value !== "string" || !SPREADSHEET_FORMULA_PREFIX.test(value)) {
    return value;
  }
  return `'${value}`;
}

export function toCsv(headers: string[], rows: Record<string, unknown>[]) {
  const escape = (value: unknown) =>
    `"${String(neutralizeSpreadsheetFormula(value) ?? "").replaceAll('"', '""')}"`;
  return [
    headers.map(escape).join(","),
    ...rows.map((row) =>
      headers.map((header) => escape(row[header])).join(","),
    ),
  ].join("\r\n");
}

export function previewCsv<T>(text: string, schema: z.ZodType<T>) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  if (lines.length < 2)
    return {
      valid: [] as T[],
      errors: ["CSV must include a header and at least one row."],
    };
  const parseLine = (line: string) =>
    Array.from(line.matchAll(/(?:^|,)(?:"((?:""|[^"])*)"|([^,]*))/g), (match) =>
      (match[1] ?? match[2] ?? "").replaceAll('""', '"'),
    );
  const headers = parseLine(lines[0]);
  const valid: T[] = [];
  const errors: string[] = [];
  lines.slice(1).forEach((line, index) => {
    const values = parseLine(line);
    const parsed = schema.safeParse(
      Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""])),
    );
    if (parsed.success) valid.push(parsed.data);
    else
      errors.push(
        `Row ${index + 2}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
      );
  });
  return { valid, errors };
}
