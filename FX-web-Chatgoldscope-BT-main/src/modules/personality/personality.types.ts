export type TraderPersonality =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED";

export type EmotionalState =
  | "NORMAL"
  | "CONFUSED"
  | "ANXIOUS"
  | "LOSS"
  | "OVERCONFIDENT"
  | "REVENGE_TRADING";

export interface PersonalityContext {
  trader: TraderPersonality;

  emotion: EmotionalState;

  useSimpleLanguage: boolean;
  useEducation: boolean;
  explainRiskMore: boolean;
  avoidFomoLanguage: boolean;
  discourageRevengeTrading: boolean;
}