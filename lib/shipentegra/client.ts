import "server-only";
import { getServerEnv } from "@/lib/env";
import { obtainShipEntegraAccessToken } from "./auth";
import {
  SHIPENTEGRA_PRODUCTION_SERVER,
  shipEntegraEndpoints,
  type ShipEntegraReadOperation,
} from "./endpoints";
import { assertNotRateLimited } from "./rate-limit";
import { ShipEntegraError } from "./errors";

export type ShipEntegraTransport = {
  fetcher?: typeof fetch;
  accessToken?: string;
  baseUrl?: string;
};

const readPaths: Record<
  ShipEntegraReadOperation,
  (arg?: string | number) => string
> = {
  LIST_ORDERS: () => shipEntegraEndpoints.listOrders,
  FIND_ORDER: (id) => shipEntegraEndpoints.order(Number(id)),
  CARGO_ACTIVITIES: () => shipEntegraEndpoints.cargoActivities,
  LIST_LOGISTICS_FILES: (id) => shipEntegraEndpoints.logisticsFiles(Number(id)),
  EXCHANGE_RATES: () => shipEntegraEndpoints.currencies,
  FIND_CARRIERS: () => shipEntegraEndpoints.carriers,
  LIST_STORES: () => shipEntegraEndpoints.stores,
};

async function request(
  path: string,
  init: RequestInit,
  transport: ShipEntegraTransport = {},
) {
  const env =
    transport.baseUrl && transport.accessToken ? null : getServerEnv();
  const fetcher = transport.fetcher ?? fetch;
  const token =
    transport.accessToken ?? (await obtainShipEntegraAccessToken(fetcher));
  const response = await fetcher(
    `${transport.baseUrl ?? SHIPENTEGRA_PRODUCTION_SERVER}${path}`,
    {
      ...init,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        "accept-language": "en",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
      signal:
        init.signal ??
        AbortSignal.timeout(env?.SHIPENTEGRA_REQUEST_TIMEOUT_MS ?? 15_000),
      cache: "no-store",
    },
  );
  assertNotRateLimited(response);
  if (!response.ok)
    throw new ShipEntegraError(
      "ShipEntegra request was not successful.",
      `HTTP_${response.status}`,
      response.status,
      response.status >= 500,
    );
  return response.json() as Promise<unknown>;
}

export function shipEntegraGet(
  operation: ShipEntegraReadOperation,
  options: {
    id?: number;
    query?: URLSearchParams;
    transport?: ShipEntegraTransport;
  } = {},
) {
  const path = readPaths[operation](options.id);
  const query = options.query?.toString();
  return request(
    `${path}${query ? `?${query}` : ""}`,
    { method: "GET" },
    options.transport,
  );
}

export function shipEntegraQuoteRequest(
  body: { country: string; kgDesi: number },
  transport?: ShipEntegraTransport,
) {
  return request(
    shipEntegraEndpoints.calculateAllPrices,
    { method: "POST", body: JSON.stringify(body) },
    transport,
  );
}

export function shipEntegraCreateShipmentRequest(
  body: unknown,
  transport?: ShipEntegraTransport,
) {
  return request(
    shipEntegraEndpoints.createOrder,
    { method: "POST", body: JSON.stringify(body) },
    transport,
  );
}

export function shipEntegraCreateLabelRequest(
  body: unknown,
  transport?: ShipEntegraTransport,
) {
  return request(
    shipEntegraEndpoints.shipEntegraLabel,
    { method: "POST", body: JSON.stringify(body) },
    transport,
  );
}
