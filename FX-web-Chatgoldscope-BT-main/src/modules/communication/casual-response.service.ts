import type {
  ChatRequest,
} from "../../types.js";

function normalize(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[!?.,]+$/g, "")
    .trim();
}

export class CasualResponseService {
  createResponse(
    request: ChatRequest,
  ): string {
    const message =
      normalize(
        request.message,
      );

    if (
      message === "hello" ||
      message === "hi" ||
      message === "hii" ||
      message === "hiii" ||
      message === "hey"
    ) {
      return "Hi! I’m GoldScope. How can I help you with Gold or your XAU/USD trade today?";
    }

    if (
      message.startsWith(
        "good morning",
      )
    ) {
      return "Good morning! What would you like to check about Gold today?";
    }

    if (
      message.startsWith(
        "good afternoon",
      )
    ) {
      return "Good afternoon! What would you like to analyse or discuss about XAU/USD?";
    }

    if (
      message.startsWith(
        "good evening",
      )
    ) {
      return "Good evening! How can I help with your Gold trading today?";
    }

    if (
      message ===
        "who are you" ||
      message ===
        "what are you"
    ) {
      return "I’m GoldScope, an AI trading decision-support assistant focused on XAU/USD. I can help you understand market conditions, review trades and assess risk.";
    }

    if (
      message.includes(
        "what can you do",
      )
    ) {
      return "I can help you understand the current XAU/USD market, review an existing trade, assess risk, explain market behaviour and provide a detailed Gold market analysis when you need one.";
    }

    if (
      message === "thanks" ||
      message ===
        "thank you" ||
      message === "thankyou"
    ) {
      return "You’re welcome. Send me your next Gold or trading question whenever you’re ready.";
    }

    if (
      message === "ok" ||
      message === "okay"
    ) {
      return "Sure. What would you like to check next?";
    }

    return "How can I help you with Gold or your XAU/USD trading today?";
  }
}

export const casualResponseService =
  new CasualResponseService();