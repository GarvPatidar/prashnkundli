import type {
  MarketSnapshot,
  MarketSnapshotResponse,
} from "./market.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_BASE_URL is not configured.",
  );
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function isMarketSnapshot(
  value: unknown,
): value is MarketSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  const quote =
    value.quote;

  const session =
    value.session;

  if (
    typeof value.symbol !== "string" ||
    typeof value.generatedAt !== "string" ||
    !isRecord(quote) ||
    !isRecord(session)
  ) {
    return false;
  }

  return (
    typeof quote.price === "number" &&
    (
      quote.bid === null ||
      typeof quote.bid === "number"
    ) &&
    (
      quote.ask === null ||
      typeof quote.ask === "number"
    ) &&
    (
      quote.spread === null ||
      typeof quote.spread === "number"
    ) &&
    typeof quote.provider === "string" &&
    typeof quote.timestamp === "string" &&
    typeof session.name === "string" &&
    typeof session.highLiquidity ===
      "boolean"
  );
}

function parseMarketSnapshotResponse(
  payload: unknown,
): MarketSnapshotResponse {
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !isMarketSnapshot(
      payload.data,
    )
  ) {
    throw new Error(
      "Market API returned an invalid response.",
    );
  }

  return {
    success: true,
    data: payload.data,
  };
}

export async function getMarketSnapshot(
  signal?: AbortSignal,
): Promise<MarketSnapshotResponse> {
  const response =
    await fetch(
      `${API_BASE_URL}/v1/market/snapshot`,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",
        },

        cache:
          "no-store",

        signal,
      },
    );

  if (!response.ok) {
    throw new Error(
      `Market API failed with status ${response.status}.`,
    );
  }

  const payload: unknown =
    await response.json();

  return parseMarketSnapshotResponse(
    payload,
  );
}