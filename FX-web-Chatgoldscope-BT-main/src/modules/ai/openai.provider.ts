import OpenAI from "openai";

import type { AnalysisResult } from "../../types.js";
import {
  analysisJsonSchema,
  analysisResultSchema,
} from "./ai.schema.js";
import type {
  AiAnalysisInput,
  AiProvider,
} from "./ai.provider.js";

export class OpenAiProvider
  implements AiProvider
{
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    if (!apiKey.trim()) {
      throw new Error(
        "OpenAI API key is missing.",
      );
    }

    if (!model.trim()) {
      throw new Error(
        "OpenAI model is missing.",
      );
    }

    this.client = new OpenAI({
      apiKey,
    });
  }

  async analyse(
    input: AiAnalysisInput,
  ): Promise<AnalysisResult> {
    const response =
      await this.client.responses.create({
        model: this.model,

        store: false,

        text: {
          format: {
            type: "json_schema",
            name: "goldscope_xauusd_analysis",
            description:
              "Structured GoldScope XAU/USD market intelligence response.",
            strict: true,
            schema: analysisJsonSchema,
          },
        },

input: [
  {
    role:
      "system",

    content:
      input.prompt.system,
  },

  {
    role:
      "user",

    content:
      input.attachment
        ? [
            {
              type:
                "input_text",

              text:
                input.prompt.user,
            },

            {
              type:
                "input_image",

              image_url:
                input.attachment
                  .dataUrl,

              detail:
                "high",
            },
          ]
        : input.prompt.user,
  },
],
      });

    const outputText =
      response.output_text.trim();

    if (!outputText) {
      throw new Error(
        "OpenAI returned an empty analysis response.",
      );
    }

    let parsedOutput: unknown;

    try {
      parsedOutput =
        JSON.parse(outputText);
    } catch {
      throw new Error(
        "OpenAI returned invalid JSON.",
      );
    }

    const validationResult =
      analysisResultSchema.safeParse(
        parsedOutput,
      );

    if (!validationResult.success) {
      throw new Error(
        "OpenAI returned an analysis that does not match the required schema.",
      );
    }

    return validationResult.data;
  }
}