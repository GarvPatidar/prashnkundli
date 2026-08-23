import { colors } from "./colors";

export const semantics = {
  button: {
    primary: colors.brand.primary,
    primaryHover: colors.brand.primaryHover,
    secondary: colors.background.elevated,
    secondaryBorder: colors.border.default,
    danger: colors.danger.primary,
  },

  chat: {
    userBubble: colors.brand.primary,
    userBubbleText: colors.text.inverse,
    assistantBubble: colors.background.elevated,
    assistantBubbleText: colors.text.primary,
  },

  market: {
    bullish: colors.success.primary,
    bullishSoft: colors.success.soft,
    bearish: colors.danger.primary,
    bearishSoft: colors.danger.soft,
    neutral: colors.warning.primary,
    neutralSoft: colors.warning.soft,
  },

  status: {
    success: colors.success.primary,
    warning: colors.warning.primary,
    danger: colors.danger.primary,
    information: colors.brand.primary,
  },

  surface: {
    page: colors.background.primary,
    section: colors.background.secondary,
    card: colors.background.elevated,
    subtle: colors.background.subtle,
  },
} as const;

export type Semantics = typeof semantics;