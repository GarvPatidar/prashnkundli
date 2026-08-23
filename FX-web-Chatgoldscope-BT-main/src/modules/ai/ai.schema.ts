import { z } from "zod";

export const analysisResultSchema = z.object({
  marketCondition: z
    .string()
    .trim()
    .min(1)
    .max(2_000),

  mainRisk: z
    .string()
    .trim()
    .min(1)
    .max(2_000),

  bullishScenario: z
    .string()
    .trim()
    .min(1)
    .max(2_000),

  bearishScenario: z
    .string()
    .trim()
    .min(1)
    .max(2_000),

  positionStatus: z
    .string()
    .trim()
    .min(1)
    .max(2_000),

  nextStep: z
    .string()
    .trim()
    .min(1)
    .max(2_000),

  confidence: z
    .number()
    .int()
    .min(0)
    .max(100)
    .nullable(),

  disclaimer: z
    .string()
    .trim()
    .min(1)
    .max(1_000),
});

export const analysisJsonSchema = {
  type: "object",
  additionalProperties: false,

  properties: {
    marketCondition: {
      type: "string",
    },

    mainRisk: {
      type: "string",
    },

    bullishScenario: {
      type: "string",
    },

    bearishScenario: {
      type: "string",
    },

    positionStatus: {
      type: "string",
    },

    nextStep: {
      type: "string",
    },

    confidence: {
      anyOf: [
        {
          type: "integer",
          minimum: 0,
          maximum: 100,
        },
        {
          type: "null",
        },
      ],
    },

    disclaimer: {
      type: "string",
    },
  },

  required: [
    "marketCondition",
    "mainRisk",
    "bullishScenario",
    "bearishScenario",
    "positionStatus",
    "nextStep",
    "confidence",
    "disclaimer",
  ],
} as const;

export type AnalysisResultOutput =
  z.infer<typeof analysisResultSchema>;