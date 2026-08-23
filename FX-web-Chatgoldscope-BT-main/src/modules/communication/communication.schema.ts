import { z } from "zod";

export const decisionStateSchema = z.enum([
  "STRONG_BULLISH",
  "BULLISH",
  "WAIT",
  "BEARISH",
  "STRONG_BEARISH",
  "AVOID",
]);

export const tradeActionSchema = z.enum([
  "BUY_SETUP",
  "SELL_SETUP",
  "WAIT",
  "AVOID",
]);

export const userFacingAnalysisSchema =
  z.object({
    headline:
      z.string().trim().min(1),

    decision:
      z.enum([
        "STRONG_BULLISH",
        "BULLISH",
        "WAIT",
        "BEARISH",
        "STRONG_BEARISH",
        "AVOID",
      ]),

    action:
      tradeActionSchema,

    confidence:
      z.number().nullable(),

    summary:
      z.string().trim().min(1),

    whatMarketIsShowing:
      z.string().trim().min(1),

    primaryRisk:
      z.string().trim().min(1),

    whatWouldStrengthenTheSetup:
      z.string().trim().min(1),

    whatWouldWeakenTheSetup:
      z.string().trim().min(1),

    nextStep:
      z.string().trim().min(1),

    traderNote:
      z.string().nullable(),

    disclaimer:
      z.string().trim().min(1),
  });

export type ValidatedUserFacingAnalysis =
  z.infer<
    typeof userFacingAnalysisSchema
  >;