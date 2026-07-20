const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export class InvalidExportDateRangeError extends Error {
  constructor() {
    super("Invalid export date range");
    this.name = "InvalidExportDateRangeError";
  }
}

function parseDateOnly(value: string) {
  const match = DATE_ONLY.exec(value);
  if (!match) throw new InvalidExportDateRangeError();

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new InvalidExportDateRangeError();
  }
  return date;
}

export function parseExportDateRange(from: string | null, to: string | null) {
  if (!from && !to) return undefined;

  const gte = from ? parseDateOnly(from) : undefined;
  const lt = to ? parseDateOnly(to) : undefined;
  if (lt) lt.setUTCDate(lt.getUTCDate() + 1);
  if (gte && lt && gte >= lt) throw new InvalidExportDateRangeError();

  return { gte, lt };
}
