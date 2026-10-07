/**
 * XAU/USD position-size maths.
 *
 * Standard gold contract: 1 lot = 100 oz, so a $1 price move on
 * 1 lot = $100 profit / loss. Brokers differ, so contract size is
 * an input (default 100).
 *
 * "Pip" for gold is conventionally $0.10 (10 points of $0.01).
 */

export type TradeDirection = "BUY" | "SELL";
export type CalcMode = "FIND_LOT" | "KNOWN_LOT";

export const DEFAULT_CONTRACT_SIZE = 100;
export const LOT_STEP = 0.01;
export const MIN_LOT = 0.01;
export const PIP_SIZE = 0.1;

export interface RiskInput {
  mode: CalcMode;
  direction: TradeDirection;
  balance: number | null;
  riskPercent: number | null;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  /** Used only in KNOWN_LOT mode. */
  lotSize: number | null;
  contractSize: number | null;
  leverage: number | null;
}

export interface RiskResult {
  valid: true;
  mode: CalcMode;
  lotSize: number;
  /** Exact lot size before rounding down to the lot step. */
  rawLotSize: number | null;
  riskAmount: number;
  riskPercentOfBalance: number | null;
  stopDistance: number;
  stopPips: number;
  rewardDistance: number | null;
  rewardPips: number | null;
  riskReward: number | null;
  potentialProfit: number | null;
  potentialLoss: number;
  marginRequired: number | null;
  notes: string[];
}

export interface RiskError {
  valid: false;
  message: string;
}

const roundTo = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function calculateRisk(
  input: RiskInput,
): RiskResult | RiskError {
  const {
    mode,
    direction,
    balance,
    riskPercent,
    entry,
    stopLoss,
    takeProfit,
    lotSize,
    leverage,
  } = input;

  const contractSize =
    input.contractSize !== null && input.contractSize > 0
      ? input.contractSize
      : DEFAULT_CONTRACT_SIZE;

  if (entry === null || stopLoss === null) {
    return {
      valid: false,
      message:
        "Enter your entry price and stop loss to calculate position size and risk.",
    };
  }

  if (mode === "FIND_LOT") {
    if (balance === null || balance <= 0) {
      return {
        valid: false,
        message: "Enter a valid account balance.",
      };
    }

    if (riskPercent === null || riskPercent <= 0) {
      return {
        valid: false,
        message: "Enter the percentage of your account you want to risk.",
      };
    }
  } else if (lotSize === null || lotSize <= 0) {
    return {
      valid: false,
      message: "Enter the lot size you plan to trade.",
    };
  }

  const stopDistance = Math.abs(entry - stopLoss);

  if (stopDistance === 0) {
    return {
      valid: false,
      message: "Entry price and stop loss cannot be the same.",
    };
  }

  if (direction === "BUY" && stopLoss >= entry) {
    return {
      valid: false,
      message: "For a BUY position, stop loss must be below the entry price.",
    };
  }

  if (direction === "SELL" && stopLoss <= entry) {
    return {
      valid: false,
      message: "For a SELL position, stop loss must be above the entry price.",
    };
  }

  const notes: string[] = [];

  let finalLots: number;
  let rawLots: number | null = null;

  if (mode === "FIND_LOT") {
    const targetRisk = (balance as number) * ((riskPercent as number) / 100);

    rawLots = targetRisk / (stopDistance * contractSize);

    // Round DOWN so the real risk never exceeds the chosen risk %.
    finalLots =
      Math.floor((rawLots + 1e-9) / LOT_STEP) * LOT_STEP;

    finalLots = roundTo(finalLots, 2);

    if (finalLots < MIN_LOT) {
      return {
        valid: false,
        message: `This stop loss is too wide for your risk amount: the exact size is ${rawLots.toFixed(
          4,
        )} lots, below the ${MIN_LOT} minimum lot. Increase your risk %, account size, or tighten the stop loss.`,
      };
    }

    if (rawLots - finalLots > LOT_STEP / 2) {
      notes.push(
        `Exact size was ${rawLots.toFixed(
          3,
        )} lots; rounded down to ${finalLots.toFixed(2)} so you never risk more than planned.`,
      );
    }
  } else {
    finalLots = lotSize as number;
  }

  const potentialLoss = finalLots * contractSize * stopDistance;

  const riskPercentOfBalance =
    balance !== null && balance > 0
      ? (potentialLoss / balance) * 100
      : null;

  let rewardDistance: number | null = null;
  let riskReward: number | null = null;
  let potentialProfit: number | null = null;

  if (takeProfit !== null) {
    const targetIsValid =
      direction === "BUY" ? takeProfit > entry : takeProfit < entry;

    if (targetIsValid) {
      rewardDistance = Math.abs(takeProfit - entry);
      riskReward = rewardDistance / stopDistance;
      potentialProfit = finalLots * contractSize * rewardDistance;
    } else {
      notes.push(
        direction === "BUY"
          ? "Take profit should be above the entry price for a BUY."
          : "Take profit should be below the entry price for a SELL.",
      );
    }
  }

  const marginRequired =
    leverage !== null && leverage > 0
      ? (entry * contractSize * finalLots) / leverage
      : null;

  if (
    marginRequired !== null &&
    balance !== null &&
    balance > 0 &&
    marginRequired > balance
  ) {
    notes.push(
      "Required margin is higher than your account balance at this leverage. Reduce the lot size.",
    );
  }

  return {
    valid: true,
    mode,
    lotSize: finalLots,
    rawLotSize: rawLots,
    riskAmount: potentialLoss,
    riskPercentOfBalance,
    stopDistance,
    stopPips: stopDistance / PIP_SIZE,
    rewardDistance,
    rewardPips:
      rewardDistance !== null ? rewardDistance / PIP_SIZE : null,
    riskReward,
    potentialProfit,
    potentialLoss,
    marginRequired,
    notes,
  };
}
