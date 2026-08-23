export const shadow = {
  xs: "0 1px 3px rgba(15,23,42,.06)",

  sm: "0 4px 12px rgba(15,23,42,.08)",

  md: "0 12px 32px rgba(15,23,42,.10)",

  lg: "0 24px 60px rgba(15,23,42,.12)",

  xl: "0 40px 80px rgba(15,23,42,.16)",
} as const;

export type Shadow = typeof shadow;