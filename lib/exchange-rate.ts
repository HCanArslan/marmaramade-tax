export interface ExchangeRateQuote {
  rate: string;
  asOf: string;
  source: string;
  fallback: boolean;
}

const TCMB_DAILY_RATES_URL = "https://www.tcmb.gov.tr/kurlar/today.xml";
const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;

export function parseTcmbUsdTryRate(xml: string) {
  const block = xml.match(
    /<Currency\b[^>]*(?:CurrencyCode|Kod)="USD"[^>]*>([\s\S]*?)<\/Currency>/i,
  )?.[1];
  const rate =
    block?.match(/<ForexBuying>([0-9]+(?:\.[0-9]+)?)<\/ForexBuying>/i)?.[1] ??
    block?.match(/<ForexSelling>([0-9]+(?:\.[0-9]+)?)<\/ForexSelling>/i)?.[1];
  const rawDate = xml.match(/<Tarih_Date\b[^>]*\bDate="([^"]+)"/i)?.[1];
  if (!rate || !rawDate)
    throw new Error(
      "TCMB USD/TRY response did not contain the expected rate and date.",
    );
  const [month, day, year] = rawDate.split("/");
  return { rate, asOf: `${year}-${month}-${day}` };
}

export async function getWeeklyUsdTryRate(
  fallback?: {
    rate: { toString(): string };
    source: string;
    capturedAt: Date;
  } | null,
): Promise<ExchangeRateQuote> {
  try {
    const response = await fetch(TCMB_DAILY_RATES_URL, {
      headers: { Accept: "application/xml" },
      next: { revalidate: ONE_WEEK_SECONDS },
    });
    if (!response.ok)
      throw new Error(
        `TCMB exchange-rate request failed (${response.status}).`,
      );
    const parsed = parseTcmbUsdTryRate(await response.text());
    return {
      ...parsed,
      source: "TCMB indicative USD buying rate",
      fallback: false,
    };
  } catch {
    if (fallback)
      return {
        rate: fallback.rate.toString(),
        asOf: fallback.capturedAt.toISOString().slice(0, 10),
        source: fallback.source,
        fallback: true,
      };
    return {
      rate: "47.03",
      asOf: "2026-07-15",
      source: "Temporary fallback",
      fallback: true,
    };
  }
}
