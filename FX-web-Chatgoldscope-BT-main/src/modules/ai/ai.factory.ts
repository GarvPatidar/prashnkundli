import { env } from "../../config.js";
import type { AiProvider } from "./ai.provider.js";
import { MockAiProvider } from "./mock-ai.provider.js";
import { OpenAiProvider } from "./openai.provider.js";

function createAiProvider(): AiProvider {
  switch (env.AI_PROVIDER) {
    case "mock":
      return new MockAiProvider();

    case "openai":
      return new OpenAiProvider(
        env.OPENAI_API_KEY!,
        env.OPENAI_MODEL!,
      );

    default: {
      const unsupportedProvider: never =
        env.AI_PROVIDER;

      throw new Error(
        `Unsupported AI provider: ${unsupportedProvider}`,
      );
    }
  }
}

export const aiProvider =
  createAiProvider();