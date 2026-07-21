import { describe, expect, it, vi } from "vitest";
import { neutralizeSpreadsheetFormula, toCsv } from "@/lib/csv";
import {
  InvalidExportDateRangeError,
  parseExportDateRange,
} from "@/lib/export-date-range";

const findMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { order: { findMany } },
}));

describe("CSV export safety", () => {
  it.each(["=1+1", "+cmd", "-2+3", "@SUM(A1:A2)", "  =1+1"])(
    "neutralizes formula-like string values: %s",
    (value) => expect(neutralizeSpreadsheetFormula(value)).toBe(`'${value}`),
  );

  it("does not alter genuine negative numbers", () => {
    expect(neutralizeSpreadsheetFormula(-12.5)).toBe(-12.5);
    expect(toCsv(["amount"], [{ amount: -12.5 }])).toContain('"-12.5"');
  });

  it("escapes quotes after neutralizing formulas", () => {
    expect(toCsv(["title"], [{ title: '=HYPERLINK("bad")' }])).toContain(
      '"\'=HYPERLINK(""bad"")"',
    );
  });
});

describe("export date ranges", () => {
  it("uses an exclusive next-day upper bound so the whole end date is included", () => {
    expect(parseExportDateRange("2026-07-01", "2026-07-20")).toEqual({
      gte: new Date("2026-07-01T00:00:00.000Z"),
      lt: new Date("2026-07-21T00:00:00.000Z"),
    });
  });

  it.each(["2026-02-30", "20-07-2026", "not-a-date"])(
    "rejects malformed dates: %s",
    (value) =>
      expect(() => parseExportDateRange(value, null)).toThrow(
        InvalidExportDateRangeError,
      ),
  );

  it("rejects reversed ranges", () => {
    expect(() => parseExportDateRange("2026-07-21", "2026-07-20")).toThrow(
      InvalidExportDateRangeError,
    );
  });
});

describe("report snapshots", () => {
  it("requests and returns only the newest cost snapshot for each order", async () => {
    const first = { id: "snapshot-1", orderId: "order-1" };
    const second = { id: "snapshot-2", orderId: "order-2" };
    findMany.mockResolvedValueOnce([
      { id: "order-1", snapshots: [first] },
      { id: "order-2", snapshots: [second] },
    ]);

    const { getLatestOrderCostSnapshots } = await import("@/lib/reporting");
    const snapshots = await getLatestOrderCostSnapshots();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          snapshots: {
            orderBy: { calculatedAt: "desc" },
            take: 1,
          },
        },
      }),
    );
    expect(snapshots.map((snapshot) => snapshot.id)).toEqual([
      "snapshot-1",
      "snapshot-2",
    ]);
  });
});
