export const motion = {
  duration: {
    fast: "150ms",

    normal: "250ms",

    slow: "400ms",
  },

  easing: {
    standard: "ease",

    in: "ease-in",

    out: "ease-out",

    inOut: "ease-in-out",
  },
} as const;

export type Motion = typeof motion;