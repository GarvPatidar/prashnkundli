const getRequiredEnv = (key: string, fallback: string = ""): string => {
  const value = process.env[key] || fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const getBooleanEnv = (
  key: string,
  defaultValue: boolean,
): boolean => {
  const value = process.env[key];

  if (value === undefined || value === "") {
    return defaultValue;
  }

  return value === "true";
};

export const env = {
  appName:
    process.env.NEXT_PUBLIC_APP_NAME ?? "GoldScope AI",

  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000",

  apiBaseUrl: getRequiredEnv(
    "NEXT_PUBLIC_API_BASE_URL",
    "https://prashnkundli.onrender.com",
  ).replace(/\/+$/, ""),

  websocketUrl: getRequiredEnv(
    "NEXT_PUBLIC_WS_URL",
    "wss://prashnkundli.onrender.com/market",
  ).replace(/\/+$/, ""),

  marketDataProvider:
    process.env.NEXT_PUBLIC_MARKET_DATA_PROVIDER ??
    "Twelve Data",

  enableMockData: getBooleanEnv(
    "NEXT_PUBLIC_ENABLE_MOCK_DATA",
    false, // <-- Isko false rakhein taaki real market data fetch ho
  ),
} as const;