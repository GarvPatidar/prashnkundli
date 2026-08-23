export const typography = {
  fontFamily: {
    sans: [
      "Inter",
      "system-ui",
      "sans-serif",
    ].join(", "),
  },

  display: {
    xl: "64px",
    lg: "56px",
    md: "48px",
    sm: "40px",
  },

  heading: {
    h1: "40px",
    h2: "32px",
    h3: "28px",
    h4: "24px",
    h5: "20px",
    h6: "18px",
  },

  body: {
    xl: "20px",
    lg: "18px",
    md: "16px",
    sm: "14px",
    xs: "12px",
  },

  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  letterSpacing: {
    tight: "-0.03em",
    normal: "0",
    wide: "0.02em",
  },
} as const;

export type Typography = typeof typography;