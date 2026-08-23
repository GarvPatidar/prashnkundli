import type {
  AnalysisResult,
} from "../../types.js";

import type {
  AiPrompt,
} from "./prompt-builder.service.js";

import type {
  GoldScopeAiContext,
} from "./context-builder.service.js";

export interface AiImageAttachment {
  mimeType:
    | "image/png"
    | "image/jpeg"
    | "image/webp";

  dataUrl:
    string;
}

export interface AiAnalysisInput {
  context:
    GoldScopeAiContext;

  prompt:
    AiPrompt;

  attachment?:
    | AiImageAttachment
    | null;
}

export interface AiProvider {
  analyse(
    input:
      AiAnalysisInput,
  ): Promise<AnalysisResult>;
}