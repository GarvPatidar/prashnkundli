const getRequiredEnv = (key: string): string => {
  const value = process.env[key];

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

  if (value === undefined) {
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
  ),

  websocketUrl: getRequiredEnv(
    "NEXT_PUBLIC_WS_URL",
  ),

  marketDataProvider:
    process.env.NEXT_PUBLIC_MARKET_DATA_PROVIDER ??
    "Mock Provider",

  enableMockData: getBooleanEnv(
    "NEXT_PUBLIC_ENABLE_MOCK_DATA",
    true,
  ),
} as const;