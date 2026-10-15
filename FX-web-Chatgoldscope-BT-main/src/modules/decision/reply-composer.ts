import type { MarketIntelligenceResult } from "../analysis/market-intelligence.service.js";
import type { TradeScenario } from "../analysis/trade-scenarios.js";
import type { MarketSessionContext } from "../sessions/session.types.js";
import {
  decide,
  type Decision,
  type Dir,
  type Horizon,
  type TimeframeRead,
  type WhyCode,
} from "./decision.service.js";
import {
  altPlanLine,
  footer,
  makeCtx,
  pick,
  positionSide,
  profileNote,
  recall,
  remember,
  stanceLine,
  tfStrip,
  userStance,
  verdictLead,
  type ReplyCtx,
  type Side,
  type UserContext,
} from "./personal.js";

/**
 * Turns the deterministic Decision + engine data into trader-style replies.
 * Every number comes from the engine; nothing here is invented.
 * Returns null when the question is not one the composer owns, so the
 * normal AI path can answer it.
 */

export type Lang = "en" | "hi";

export type Intent =
  | "DISTRESS"
  | "INJECTION"
  | "GUARANTEE"
  | "SAVINGS"
  | "ACCOUNT"
  | "TRACK_RECORD"
  | "CAPABILITIES"
  | "UNAVAILABLE"
  | "PRICE_CHECK"
  | "MOVE_WHY"
  | "HISTORY"
  | "PRICE"
  | "BRIEF"
  | "NEWS"
  | "RISK_CALC"
  | "HIGH_LOW"
  | "SESSION"
  | "LEVELS"
  | "INDICATOR"
  | "TIMEFRAMES"
  | "HOLD_EXIT"
  | "WHERE_BUY"
  | "WHERE_SELL"
  | "DIRECTION"
  | "VERDICT";

export interface ComposeInput {
  message: string;
  result: MarketIntelligenceResult;
  livePrice: number | null;
  marketClosed: boolean;
  riskScore: number | null;
  session: MarketSessionContext | null;
  /** Set when analysis data is older than normal. */
  delayedMinutes: number | null;
  /** Logged-in user: name and trading profile, for personal replies. */
  user?: UserContext | null;
  /** Conversation id, used to avoid repeating an unchanged plan. */
  conversationKey?: string | null;
  /** Assistant replies already in this conversation's context. */
  contextAssistantCount?: number;
  now?: Date;
}

const money = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

const fmt = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? "n/a"
    : value.toFixed(2);

const HINGLISH =
  /\b(kya|karu|karun|kru|hai|hain|nahi|nhi|aaj|abhi|bhai|sona|kab|kaise|kaisa|mujhe|toh|rakhu|chahiye|batao|bata|lena|dena|upar|niche|karna|kar|mera|meri|ya|ho|raha|rha)\b/;

export function detectLanguage(message: string): Lang {
  return HINGLISH.test(message.toLowerCase()) ? "hi" : "en";
}

const has = (text: string, pattern: RegExp): boolean => pattern.test(text);

const PRICE_NUMBER = /(?<![\d.])(\d{1,2},?\d{3}(?:\.\d+)?)(?![\d])/;

export function extractUserPrice(message: string): number | null {
  const match = PRICE_NUMBER.exec(message);
  if (!match || !match[1]) return null;
  const value = Number(match[1].replace(",", ""));
  return value >= 1000 && value <= 20000 ? value : null;
}

export function detectIntent(rawMessage: string): Intent | null {
  const m = rawMessage
    .toLowerCase()
    .replace(/[?!.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (has(m, /\b(end it|end my life|kill myself|suicide|suicidal|can'?t go on|want to die|no reason to live|lost everything)\b/)) {
    return "DISTRESS";
  }
  if (has(m, /\b(ignore (all |the )?(previous|prior|above) instructions|system prompt|api key|openai key|secrets?|passwords?|jailbreak|developer mode)\b/)) {
    return "INJECTION";
  }
  if (/100 ?%/.test(m) || has(m, /\b(guarantee|guaranteed|sure ?shot|risk.?free|will you pay|compensate|double my account|get rich|insider|pump)\b/) ||
      has(m, /\bare you (really )?sure\b/)) {
    return "GUARANTEE";
  }
  if (has(m, /\b(life savings|all my savings|take a loan|borrow|sell my (house|gold jewel))\b/)) {
    return "SAVINGS";
  }
  if (has(m, /\b(metatrader|mt4|mt5|connect (my )?(account|broker)|link (my )?account)\b/)) {
    return "ACCOUNT";
  }
  if (has(m, /\b(how accurate|accuracy|win rate|track record|success rate|how reliable)\b/)) {
    return "TRACK_RECORD";
  }
  if (has(m, /\b(what can you do|what do you do|how do you work|your features|capabilities|help me with)\b/)) {
    return "CAPABILITIES";
  }
  if (has(m, /\b(news|nfp|cpi|fomc|fed|calendar|dxy|dollar index|rate decision|events?)\b/)) {
    return "NEWS";
  }
  if (has(m, /\b(spread|commission|swap|broker fee)\b/)) {
    return "UNAVAILABLE";
  }
  if (has(m, /\b(lot size|lots?|position size|risk per trade|leverage|margin)\b/) ||
      has(m, /\brisk\b.*\d ?%/) || has(m, /\d ?% risk/)) {
    return "RISK_CALC";
  }
  if (
    has(m, /\b(i am in (a )?(loss|profit)|i'?m in (a )?(loss|profit)|in (loss|profit) on|i bought|i sold|i am holding|i'?m holding|holding (a )?(buy|sell|long|short)|my (buy|sell|trade|position)|hold|exit|breakeven|break even|trail|trailing|partial|book profit|cut loss|close (it|my|the))\b/) ||
    has(m, /\b(hold karu|close karu|exit karu)\b/)
  ) {
    return "HOLD_EXIT";
  }
  if (extractUserPrice(rawMessage) !== null && !has(m, /\b(stop loss|entry and|give me entry)\b/)) {
    return "PRICE_CHECK";
  }
  if (has(m, /\b(why|reason)\b.*\b(drop|fall|fell|rise|rose|spike|jump|crash|dump|rally|move|moved)\b/)) {
    return "MOVE_WHY";
  }
  if (
    has(m, /\b(today'?s?|yesterday|previous day|weekly|week|asia)\b.*\b(high|low|range)\b/) ||
    has(m, /\b(high|low)\b.*\b(today|yesterday|week)\b/) ||
    has(m, /\b(pdh|pdl|asia range|asia session range)\b/) ||
    has(m, /\bhow much did gold move\b/) ||
    has(m, /\bcompare\b.*\b(today|yesterday)\b/)
  ) {
    return "HIGH_LOW";
  }
  if (has(m, /\b(highest|lowest|all.time|peak|last (\d+ )?(months?|years?|days?)|this year|average daily range|adr|1 week ago|week ago|drawdown|fall from|fell from)\b/)) {
    return "HISTORY";
  }
  if (has(m, /\b(session|london|new york|asia|market open|is the market|best time|time to trade)\b/)) {
    return "SESSION";
  }
  if (has(m, /\b(pivot|support|resistance|key level|levels?|order block|liquidity zone|nearest)\b/) &&
      !has(m, /\b(stop loss|entry|where to (buy|sell))\b/)) {
    return "LEVELS";
  }
  if (has(m, /\b(all timeframes|timeframes? agree|higher (timeframes?|tf)|bade timeframe|htf|confluence|align|m15 bias|h1 bias|h4 bias|d1 bias|daily candle|weekly timeframe)\b/)) {
    return "TIMEFRAMES";
  }
  if (has(m, /\b(rsi|macd|atr|adx|ema|stochastic|overbought|oversold|volatility|volatile|divergence)\b/)) {
    return "INDICATOR";
  }
  if (has(m, /\b(m15|h1|h4|d1|1 ?min(ute)?|5 ?min(ute)?|m1|m5|w1)\b/)) {
    return "TIMEFRAMES";
  }
  if (has(m, /\bwhere\b.*\b(buy|long)\b/) || has(m, /\b(buy|long) (level|zone|entry)\b/)) {
    return "WHERE_BUY";
  }
  if (has(m, /\bwhere\b.*\b(sell|short)\b/) || has(m, /\b(sell|short) (level|zone|entry)\b/) ||
      has(m, /\bentry for a short\b/)) {
    return "WHERE_SELL";
  }
  if (has(m, /\b((current|live|latest) (gold )?price|price (now|today|right now)|gold price|what is gold at|gold kitne)\b/)) {
    return "PRICE";
  }
  if (has(m, /\b(short answer|one line|in short|brief|tldr)\b/) ||
      (m.split(" ").length <= 3 && has(m, /\b(gold|xau|xauusd|sona)\b/))) {
    return "BRIEF";
  }
  if (has(m, /\b(up or down|down or up|bullish (or|ya) bearish|bearish (or|ya) bullish|which side|higher probability|probability|chances?|trend (still|reversed|reversal)|has (it|the trend) reversed|upar ya niche|kidhar jayega|(today'?s?|aaj (ka )?) ?(direction|trend))\b/)) {
    return "DIRECTION";
  }
  if (
    has(m, /\b(buy|sell|signal|setup|entry|trade|direction|bullish|bearish|up or down|should i|good time|probability|outlook|trend|reversed?|kya karu|lena|sona|upar|niche|jayega|girega|kharid|bech)\b/) ||
    has(m, /\bwhy (wait|buy|sell)\b/)
  ) {
    return "VERDICT";
  }

  return null;
}

function detectHorizon(message: string): Horizon {
  const m = message.toLowerCase();
  if (/\b(scalp|scalping|next (15|30|60) ?min|quick trade)\b/.test(m)) return "SCALP";
  if (/\b(swing|positional|long term|multi.?day)\b/.test(m)) return "SWING";
  return "INTRADAY";
}

/* ------------------------------ text helpers ----------------------------- */

const SESSION_LABEL: Record<string, string> = {
  ASIA: "Asia",
  LONDON: "London",
  NEW_YORK: "New York",
  LONDON_NEW_YORK_OVERLAP: "London + New York overlap",
  OFF_HOURS: "Off hours",
};

const pad = (n: number): string => String(n).padStart(2, "0");

function timeBoth(iso: string): string {
  const date = new Date(iso);
  const ist = new Date(date.getTime() + 330 * 60_000);
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC (${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())} IST)`;
}

const dirWord = (dir: Dir): string =>
  dir === "UP" ? "bullish" : dir === "DOWN" ? "bearish" : "flat";

const convictionWord = (c: string, lang: Lang): string =>
  lang === "hi"
    ? c === "HIGH"
      ? "High"
      : c === "MEDIUM"
        ? "Medium"
        : "Low"
    : c === "HIGH"
      ? "High"
      : c === "MEDIUM"
        ? "Medium"
        : "Low";

const t = (lang: Lang, en: string, hi: string): string => (lang === "hi" ? hi : en);

const disclaimer = (lang: Lang): string =>
  t(
    lang,
    "Signals are predictions based on market analysis, not guarantees. Don't follow blindly; trade at your own risk.",
    "Signals market analysis par based predictions hain, guarantee nahi. Aankh band karke follow mat karo, apna risk khud manage karo.",
  );

function delayedNote(input: ComposeInput, lang: Lang): string | null {
  if (!input.delayedMinutes) return null;
  return t(
    lang,
    `⏳ Data refresh is delayed; this view is about ${input.delayedMinutes} min old.`,
    `⏳ Data refresh mein delay hai; ye view lagbhag ${input.delayedMinutes} min purana hai.`,
  );
}

function why(code: WhyCode, d: Decision, lang: Lang): string {
  const { D1, H4, H1, M15 } = d.reads;
  switch (code) {
    case "HTF_ALIGNED":
      return t(
        lang,
        `D1 ${dirWord(D1.dir)} and H4 ${dirWord(H4.dir)}: higher timeframes lean the same way`,
        `D1 ${dirWord(D1.dir)} aur H4 ${dirWord(H4.dir)}: bade timeframe ek hi taraf lean kar rahe hain`,
      );
    case "HTF_D1_AGAINST":
      return t(
        lang,
        `H4 ${dirWord(H4.dir)} leads, but D1 is ${dirWord(D1.dir)}: this trades against the daily trend`,
        `H4 ${dirWord(H4.dir)} lead kar raha hai, par D1 ${dirWord(D1.dir)} hai: ye daily trend ke ulta trade hai`,
      );
    case "HTF_CONFLICT":
      return t(
        lang,
        `D1 ${dirWord(D1.dir)} but H4 ${dirWord(H4.dir)}: higher timeframes disagree`,
        `D1 ${dirWord(D1.dir)} par H4 ${dirWord(H4.dir)}: bade timeframe ek jaise nahi hain`,
      );
    case "H1_CONFIRMS":
      return t(lang, `H1 setup is ${dirWord(H1.dir)}, matching the lean`, `H1 setup ${dirWord(H1.dir)} hai, lean ke saath match`);
    case "H1_AGAINST_HTF":
      return t(
        lang,
        `H1 is ${dirWord(H1.dir)}: a pullback against the bigger trend is running`,
        `H1 ${dirWord(H1.dir)} hai: bade trend ke ulta pullback chal raha hai`,
      );
    case "H1_NOT_CONFIRMED":
      return t(lang, "H1 has not confirmed yet (flat)", "H1 ne abhi confirm nahi kiya (flat)");
    case "M15_TRIGGER":
      return t(lang, "M15 is giving the trigger", "M15 trigger de raha hai");
    case "M15_NO_TRIGGER":
      return t(lang, `M15 is ${dirWord(M15.dir)}: no entry trigger yet`, `M15 ${dirWord(M15.dir)} hai: entry trigger abhi nahi`);
    case "TREND_STRONG":
      return t(lang, `H4 trend strength is solid (ADX ${fmt(H4.adx)})`, `H4 trend strength theek hai (ADX ${fmt(H4.adx)})`);
    case "TREND_WEAK":
      return t(lang, `Trend strength is weak (H4 ADX ${fmt(H4.adx)})`, `Trend kamzor hai (H4 ADX ${fmt(H4.adx)})`);
    case "RSI_STRETCHED":
      return t(lang, `H1 RSI ${fmt(H1.rsi)} is stretched: do not chase`, `H1 RSI ${fmt(H1.rsi)} stretched hai: chase mat karo`);
    case "VOL_HIGH":
      return t(lang, "H1 volatility is high: wider stops, smaller size", "H1 volatility high hai: stop wide, size chhota");
    case "VOL_COMPRESSED":
      return t(lang, "H4 volatility is compressed: a breakout can come either way", "H4 volatility compress hai: breakout kisi bhi taraf aa sakta hai");
    case "NO_CLEAN_LEVEL":
      return t(lang, "No clean level near price for this side", "Is side ke liye price ke paas clean level nahi");
    case "LOW_RR":
      return t(lang, "Reward-to-risk to the first target is below 1", "Pehle target tak reward:risk 1 se kam hai");
    case "RISK_ELEVATED":
      return t(lang, "Overall risk conditions are elevated", "Overall risk conditions high hain");
    case "MARKET_CLOSED":
      return t(lang, "Market is closed right now", "Market abhi band hai");
  }
}

function planLines(plan: TradeScenario, lang: Lang): string[] {
  const [t1, t2] = plan.targets;
  const [r1, r2] = plan.riskReward;
  const lines = [
    `📍 ${t(lang, "Entry", "Entry")} ${fmt(plan.entry)}   🛑 ${t(lang, "Stop", "Stop")} ${fmt(plan.stopLoss)}`,
    `🎯 TP1 ${fmt(t1)}${t2 !== undefined ? `   TP2 ${fmt(t2)}` : ""}`,
    `${t(lang, "Risk", "Risk")} ${fmt(plan.riskPoints)} pts · ${t(lang, "Reward", "Reward")} 1:${fmt(r1)}${r2 !== undefined ? ` / 1:${fmt(r2)}` : ""}`,
    `🔁 ${t(lang, "Invalid if", "Plan cancel agar")}: ${t(
      lang,
      `an H1 candle closes beyond ${fmt(plan.stopLoss)}`,
      `H1 candle ${fmt(plan.stopLoss)} ke us paar close ho`,
    )}`,
  ];
  return lines;
}

function sessionLine(input: ComposeInput): string {
  const label = input.session ? (SESSION_LABEL[input.session.session] ?? input.session.session) : "n/a";
  return label;
}

/* ------------------------------ reply builders --------------------------- */

function verdictCard(d: Decision, input: ComposeInput, lang: Lang, ctx: ReplyCtx): string {
  if (ctx.repeat) return repeatCard(d, lang, ctx);
  const out: string[] = [];
  const horizonTag =
    d.horizon === "SCALP"
      ? t(lang, " (scalp view)", " (scalp view)")
      : d.horizon === "SWING"
        ? t(lang, " (swing view)", " (swing view)")
        : "";

  const headline = verdictLead(d, ctx);

  out.push(`${headline}${horizonTag}`);
  out.push(
    `XAU/USD ${fmt(d.price)} · ${sessionLine(input)} · ${t(lang, "Conviction", "Conviction")}: ${convictionWord(d.conviction, lang)}`,
  );

  const delayed = delayedNote(input, lang);
  if (delayed) out.push(delayed);

  out.push("", `🧠 ${pick(lang === "hi" ? ["Kyun", "Mujhe kya dikh raha hai", "Wajah"] : ["Why", "What I'm seeing", "Reasons"], ctx.seed, 2)}`);
  for (const code of d.why.slice(0, 4)) out.push(`• ${why(code, d, lang)}`);

  if (d.action !== "WAIT" && d.plan) {
    out.push("");
    out.push(
      d.entryState === "NOW"
        ? t(lang, "Price is at the entry zone and M15 confirms.", "Price entry zone mein hai aur M15 confirm kar raha hai.")
        : pick(
            lang === "hi"
              ? ["Price ke entry zone tak aane ka wait karo aur M15 par confirm dekho.", "Price ko khud aane do; entry tabhi jab M15 zone par confirm kare.", "Jaldi nahi: entry tab valid hai jab M15 zone par confirm kare."]
              : ["Wait for price to come to the entry zone and confirm on M15.", "Let price come to you; take the entry only after an M15 confirmation.", "No rush: the entry is only valid once M15 confirms at the zone."],
            ctx.seed,
            3,
          ),
    );
    out.push(...planLines(d.plan, lang));
  } else {
    if (d.lean !== "FLAT" && !d.marketClosed) {
      out.push(
        "",
        t(
          lang,
          `Lean: slightly ${dirWord(d.lean)}, but conviction is too low to call it a trade.`,
          `Lean: halka ${dirWord(d.lean)}, par trade bolne ke liye conviction kam hai.`,
        ),
      );
    }

    if (d.plans.length > 0 && !d.marketClosed) {
      out.push("", `📍 ${t(lang, "I will act when", "Main tab action lunga jab")}`);
      for (const plan of d.plans) {
        const side = plan.direction === "BUY" ? "🟢 BUY" : "🔴 SELL";
        const counter =
          (plan.direction === "BUY" && d.lean === "DOWN") || (plan.direction === "SELL" && d.lean === "UP")
            ? t(lang, " (counter-trend)", " (counter-trend)")
            : "";
        const trigger =
          plan.direction === "BUY"
            ? t(lang, `price dips to ${fmt(plan.entry)} and an M15 candle closes back above it`, `price ${fmt(plan.entry)} tak aaye aur M15 candle uske upar wapas close ho`)
            : t(lang, `price rallies to ${fmt(plan.entry)} and an M15 candle closes back below it`, `price ${fmt(plan.entry)} tak chadhe aur M15 candle uske neeche wapas close ho`);
        out.push(`${side}${counter}: ${trigger}`);
        out.push(`   🛑 ${fmt(plan.stopLoss)} | 🎯 ${plan.targets.map(fmt).join(" / ")} | 1:${fmt(plan.riskReward[0])}`);
      }
    }
  }

  const note = profileNote(d, ctx);
  if (note) out.push("", note);
  if (d.action === "WAIT" && d.conviction === "LOW" && !d.marketClosed && ctx.seed % 2 === 0) {
    out.push("", t(lang, "📸 Send me a chart screenshot and I'll check the structure against this view.", "📸 Chart ka screenshot bhej do, main structure is view se match karke dekh lunga."));
  }

  out.push("", `⏱ ${t(lang, "View refreshes at", "View update hoga")} ${timeBoth(d.validUntil)}`);
  out.push("", ...footer(ctx, true));
  return out.join("\n");
}

function whereCard(side: "BUY" | "SELL", d: Decision, input: ComposeInput, lang: Lang, ctx: ReplyCtx): string {
  const plan = d.scenarios.scenarios.find((s) => s.direction === side) ?? null;
  const icon = side === "BUY" ? "🟢" : "🔴";
  const out: string[] = [];
  const counter =
    (side === "BUY" && d.lean === "DOWN") || (side === "SELL" && d.lean === "UP");

  out.push(
    t(lang, `${icon} Where to ${side === "BUY" ? "buy" : "sell"} XAU/USD`, `${icon} XAU/USD ${side === "BUY" ? "buy" : "sell"} kahan karein`),
    `${t(lang, "Price", "Price")} ${fmt(d.price)} · ${sessionLine(input)} · ${t(lang, "Overall lean", "Overall lean")}: ${d.action === "WAIT" ? `WAIT (${dirWord(d.lean)})` : d.action}`,
    "",
  );

  if (!plan) {
    out.push(
      t(
        lang,
        `No clean ${side === "BUY" ? "support" : "resistance"} close enough to price to plan a ${side.toLowerCase()} right now. Waiting is the trade.`,
        `Abhi ${side.toLowerCase()} ke liye price ke paas clean ${side === "BUY" ? "support" : "resistance"} nahi hai. Wait karna hi trade hai.`,
      ),
    );
  } else {
    if (counter) {
      out.push(
        t(
          lang,
          "⚠️ This is counter-trend versus the higher timeframes: smaller size, quick profits.",
          "⚠️ Ye bade timeframe ke ulta (counter-trend) hai: size chhota, profit jaldi lo.",
        ),
      );
    }
    out.push(...planLines(plan, lang));
    out.push(
      t(
        lang,
        `Only enter after price reaches ${fmt(plan.entry)} and an M15 candle confirms. ${plan.levelSource}.`,
        `Entry tabhi jab price ${fmt(plan.entry)} tak aaye aur M15 candle confirm kare. ${plan.levelSource}.`,
      ),
    );
  }

  const wnote = profileNote(d, ctx);
  if (wnote && plan) out.push("", wnote);
  out.push("", `⏱ ${t(lang, "View refreshes at", "View update hoga")} ${timeBoth(d.validUntil)}`, "", ...footer(ctx, true));
  return out.join("\n");
}

interface LevelRow {
  price: number;
  timeframe: string;
  touches: number;
}

function nearestLevels(result: MarketIntelligenceResult, price: number, atr: number) {
  const { snapshots } = result.marketAnalysis;
  const all = (kind: "supports" | "resistances"): LevelRow[] =>
    (["H1", "H4", "D1"] as const).flatMap((tf) =>
      snapshots[tf].structure[kind].map((level) => ({ price: level.price, timeframe: tf, touches: level.touches })),
    );

  const pick = (rows: LevelRow[], above: boolean): LevelRow[] => {
    const filtered = rows
      .filter((r) => (above ? r.price > price : r.price < price))
      .sort((a, b) => (above ? a.price - b.price : b.price - a.price));
    const out: LevelRow[] = [];
    for (const row of filtered) {
      const prev = out[out.length - 1];
      if (!prev || Math.abs(row.price - prev.price) >= atr * 0.3) out.push(row);
      if (out.length === 3) break;
    }
    return out;
  };

  return { resistances: pick(all("resistances"), true), supports: pick(all("supports"), false) };
}

function levelsCard(d: Decision, input: ComposeInput, lang: Lang): string {
  const atr = d.atrH1 ?? 5;
  const { resistances, supports } = nearestLevels(input.result, d.price, atr);
  const out: string[] = [
    t(lang, "📊 Key levels", "📊 Key levels"),
    `XAU/USD ${fmt(d.price)} · ${sessionLine(input)}`,
    "",
  ];

  [...resistances].reverse().forEach((row, i, arr) => {
    out.push(`🔴 R${arr.length - i}  ${fmt(row.price)}  (${row.timeframe}, ${row.touches} ${row.touches === 1 ? "touch" : "touches"}, +${fmt(row.price - d.price)} pts)`);
  });
  out.push(`➖ ${t(lang, "Price", "Price")} ${fmt(d.price)}`);
  supports.forEach((row, i) => {
    out.push(`🟢 S${i + 1}  ${fmt(row.price)}  (${row.timeframe}, ${row.touches} ${row.touches === 1 ? "touch" : "touches"}, -${fmt(d.price - row.price)} pts)`);
  });

  const stats = input.result.dayStats;
  if (stats?.pivots && /pivot/i.test(input.message)) {
    const p = stats.pivots;
    out.push("", t(lang, "Classic pivots (from previous day)", "Classic pivots (pichhle din se)"));
    out.push(`R2 ${fmt(p.r2)} · R1 ${fmt(p.r1)} · P ${fmt(p.pivot)} · S1 ${fmt(p.s1)} · S2 ${fmt(p.s2)}`);
  }

  if (/order block|liquidity/i.test(input.message)) {
    out.push(
      "",
      t(
        lang,
        "I don't mark order blocks or liquidity pools. These levels come from swing highs/lows and repeated touches on H1/H4/D1, which is where liquidity usually sits.",
        "Main order block ya liquidity pool mark nahi karta. Ye levels H1/H4/D1 ke swing high/low aur repeated touches se hain, jahan aam taur par liquidity hoti hai.",
      ),
    );
  }

  out.push("", disclaimer(lang));
  return out.join("\n");
}

function highLowCard(d: Decision, input: ComposeInput, lang: Lang): string {
  const s = input.result.dayStats;
  const out: string[] = [t(lang, "📅 Ranges (real candle data, UTC days)", "📅 Ranges (real candle data, UTC din)"), `XAU/USD ${fmt(d.price)}`, ""];

  if (!s) {
    out.push(t(lang, "Range data is not available right now.", "Range data abhi available nahi hai."));
    return out.join("\n");
  }

  if (s.today) out.push(`${t(lang, "Today", "Aaj")}: ${t(lang, "High", "High")} ${fmt(s.today.high)} · ${t(lang, "Low", "Low")} ${fmt(s.today.low)} · ${t(lang, "Range", "Range")} ${fmt(s.today.high - s.today.low)} pts`);
  if (s.previousDay) out.push(`${t(lang, "Previous day", "Pichhla din")} (${s.previousDay.date}): ${t(lang, "High", "High")} ${fmt(s.previousDay.high)} · ${t(lang, "Low", "Low")} ${fmt(s.previousDay.low)} · ${t(lang, "Close", "Close")} ${fmt(s.previousDay.close)}`);
  if (s.asiaToday) out.push(`Asia (00:00–09:00 UTC): ${t(lang, "High", "High")} ${fmt(s.asiaToday.high)} · ${t(lang, "Low", "Low")} ${fmt(s.asiaToday.low)}`);
  if (s.week) out.push(`${t(lang, "This week", "Is hafte")}: ${t(lang, "High", "High")} ${fmt(s.week.high)} · ${t(lang, "Low", "Low")} ${fmt(s.week.low)}`);
  if (s.today && d.price > 0) {
    const pos = ((d.price - s.today.low) / Math.max(0.01, s.today.high - s.today.low)) * 100;
    out.push("", t(lang, `Price sits ${Math.round(pos)}% up from today's low.`, `Price aaj ke low se ${Math.round(pos)}% upar hai.`));
  }
  out.push("", t(lang, "Broker feeds can differ by a few points.", "Alag broker feeds mein kuch points ka fark ho sakta hai."));
  return out.join("\n");
}

function sessionCard(d: Decision, input: ComposeInput, lang: Lang): string {
  const s = input.session;
  const out: string[] = [t(lang, "🕒 Session", "🕒 Session")];

  if (d.marketClosed) {
    out.push(t(lang, "Market is closed right now (weekend or break). Last price shown is the latest close.", "Market abhi band hai (weekend ya break). Dikhaya gaya price last close hai."));
  } else if (s) {
    out.push(`${t(lang, "Active", "Abhi chal raha hai")}: ${SESSION_LABEL[s.session] ?? s.session} · ${t(lang, "liquidity", "liquidity")} ${s.liquidity}`);
    const istMinutes = (s.utcHour * 60 + s.utcMinute + 330) % 1440;
    out.push(`${t(lang, "Now", "Abhi")}: ${pad(s.utcHour)}:${pad(s.utcMinute)} UTC (${pad(Math.floor(istMinutes / 60))}:${pad(istMinutes % 60)} IST)`);
    if (s.minutesUntilNextSessionChange !== null) {
      out.push(t(lang, `Next session change in ${s.minutesUntilNextSessionChange} min.`, `Agla session change ${s.minutesUntilNextSessionChange} min mein.`));
    }
  }

  out.push(
    "",
    t(lang, "Typical windows (UTC / IST):", "Aam windows (UTC / IST):"),
    "• Asia 00:00–09:00 / 05:30–14:30",
    "• London 07:00–16:00 / 12:30–21:30",
    "• New York 12:00–21:00 / 17:30–02:30",
    t(lang, "• Best liquidity: London + New York overlap 12:00–16:00 UTC (17:30–21:30 IST)", "• Sabse accha liquidity: London + New York overlap 12:00–16:00 UTC (17:30–21:30 IST)"),
    "",
    `${t(lang, "Current view", "Abhi ka view")}: ${d.action === "WAIT" ? "🟡 WAIT" : d.action === "BUY" ? "🟢 BUY" : "🔴 SELL"} · ${t(lang, "Conviction", "Conviction")} ${convictionWord(d.conviction, lang)}`,
  );
  return out.join("\n");
}

function readLine(r: TimeframeRead): string {
  return `${r.timeframe}: ${dirWord(r.dir).toUpperCase()} (${r.score >= 0 ? "+" : ""}${r.score.toFixed(2)}) · RSI ${fmt(r.rsi)} · ADX ${fmt(r.adx)} (${r.adxStrength.toLowerCase()}) · ATR ${fmt(r.atr)}`;
}

function timeframesCard(d: Decision, input: ComposeInput, lang: Lang): string {
  const m = input.message.toLowerCase();
  const order: Array<TimeframeRead["timeframe"]> = ["D1", "H4", "H1", "M15"];
  const focus = /m15/.test(m) ? "M15" : /\bh1\b/.test(m) ? "H1" : /h4/.test(m) ? "H4" : /d1|daily|weekly/.test(m) ? "D1" : null;

  const out: string[] = [t(lang, "🧭 Timeframe read", "🧭 Timeframe read"), `XAU/USD ${fmt(d.price)}`, ""];

  if (/weekly/.test(m)) {
    out.push(t(lang, "Weekly (W1) isn't analysed. D1 is the highest timeframe here.", "Weekly (W1) analyse nahi hota. Yahan D1 sabse bada timeframe hai."), "");
  }

  for (const tf of order) {
    const read = d.reads[tf];
    const mark = focus === tf ? "👉 " : "";
    out.push(`${mark}${readLine(read)}`);
  }

  const dirs = order.map((tf) => d.reads[tf].dir);
  const agree = dirs.every((x) => x === dirs[0]) && dirs[0] !== "FLAT";
  out.push(
    "",
    agree
      ? t(lang, `✅ All timeframes agree: ${dirWord(dirs[0] as Dir)}.`, `✅ Sab timeframe agree karte hain: ${dirWord(dirs[0] as Dir)}.`)
      : t(lang, "⚠️ Timeframes do NOT fully agree, so conviction stays limited.", "⚠️ Timeframes poori tarah agree nahi karte, isliye conviction limited hai."),
    `${t(lang, "Verdict", "Verdict")}: ${d.action === "WAIT" ? "🟡 WAIT" : d.action === "BUY" ? "🟢 BUY" : "🔴 SELL"} · ${t(lang, "Conviction", "Conviction")} ${convictionWord(d.conviction, lang)}`,
  );
  return out.join("\n");
}

function indicatorCard(d: Decision, input: ComposeInput, lang: Lang): string {
  const m = input.message.toLowerCase();
  const out: string[] = [t(lang, "📈 Indicators (per timeframe)", "📈 Indicators (har timeframe)"), `XAU/USD ${fmt(d.price)}`, ""];
  const rows: Array<TimeframeRead["timeframe"]> = ["D1", "H4", "H1", "M15"];

  for (const tf of rows) {
    const r = d.reads[tf];
    const parts: string[] = [];
    const all = !/(rsi|macd|atr|adx|ema|stoch)/.test(m);
    if (all || /rsi|overbought|oversold/.test(m)) parts.push(`RSI ${fmt(r.rsi)} (${r.rsiCondition.toLowerCase()})`);
    if (all || /adx|strong|momentum/.test(m)) parts.push(`ADX ${fmt(r.adx)} (${r.adxStrength.toLowerCase()})`);
    if (all || /atr|volatil/.test(m)) parts.push(`ATR ${fmt(r.atr)} · vol ${r.volatility.toLowerCase()}`);
    if (all || /macd|momentum/.test(m)) parts.push(`MACD hist ${fmt(r.macdHistogram)}`);
    if (/ema/.test(m)) parts.push(`EMA50 ${fmt(r.ema50)} · EMA200 ${fmt(r.ema200)} · price ${d.price > (r.ema200 ?? Infinity) ? "above" : "below"} EMA200`);
    out.push(`${tf}: ${parts.join(" · ")}`);
  }

  if (/divergence/.test(m)) {
    out.push("", t(lang, "Divergence is not detected by the engine, so I won't claim one.", "Divergence engine detect nahi karta, isliye main daava nahi karunga."));
  }

  const h1 = d.reads.H1;
  const meaning =
    h1.rsiCondition === "OVERBOUGHT"
      ? t(lang, "H1 is stretched up: buying here is chasing.", "H1 upar stretched hai: yahan buy karna chase karna hai.")
      : h1.rsiCondition === "OVERSOLD"
        ? t(lang, "H1 is stretched down: selling here is chasing.", "H1 neeche stretched hai: yahan sell karna chase karna hai.")
        : t(lang, "H1 momentum is not stretched, so there is room either way.", "H1 momentum stretched nahi hai, dono taraf jagah hai.");
  out.push("", `🧠 ${meaning}`);
  return out.join("\n");
}

function holdExitCard(d: Decision, input: ComposeInput, lang: Lang, ctx: ReplyCtx): string {
  const mySide = positionSide(input.message);
  if (mySide) return holdExitSideCard(mySide, d, input, lang, ctx);
  const atr = d.atrH1 ?? 5;
  const { resistances, supports } = nearestLevels(input.result, d.price, atr);
  const s1 = supports[0];
  const r1 = resistances[0];
  const r2 = resistances[1];
  const s2 = supports[1];

  const out: string[] = [
    t(lang, "🧭 Hold or exit? (based on the market, not your account)", "🧭 Hold ya exit? (market ke hisaab se, aapke account ke hisaab se nahi)"),
    `XAU/USD ${fmt(d.price)} · ${t(lang, "View", "View")}: ${d.action === "WAIT" ? `🟡 WAIT (${dirWord(d.lean)} lean)` : d.action === "BUY" ? "🟢 BUY" : "🔴 SELL"} · ${t(lang, "Conviction", "Conviction")} ${convictionWord(d.conviction, lang)}`,
    "",
    `🟢 ${t(lang, "If you are BUY", "Agar aap BUY mein ho")}:`,
  ];

  if (s1) out.push(`• ${t(lang, `Hold while H1 closes above ${fmt(s1.price)}; an H1 close below it means exit or cut.`, `H1 close ${fmt(s1.price)} ke upar rahe tak hold; neeche close ho to exit/cut.`)}`);
  if (r1) out.push(`• 🎯 ${t(lang, "Targets", "Targets")}: ${fmt(r1.price)}${r2 ? ` / ${fmt(r2.price)}` : ""}. ${t(lang, `Take partial at ${fmt(r1.price)} and move stop to breakeven.`, `${fmt(r1.price)} par partial lo aur stop breakeven par le jao.`)}`);
  if (d.lean === "DOWN") out.push(`• ⚠️ ${t(lang, "Higher timeframes lean bearish: don't add, protect profit.", "Bade timeframe bearish lean kar rahe hain: add mat karo, profit protect karo.")}`);

  out.push("", `🔴 ${t(lang, "If you are SELL", "Agar aap SELL mein ho")}:`);
  if (r1) out.push(`• ${t(lang, `Hold while H1 closes below ${fmt(r1.price)}; an H1 close above it means exit or cut.`, `H1 close ${fmt(r1.price)} ke neeche rahe tak hold; upar close ho to exit/cut.`)}`);
  if (s1) out.push(`• 🎯 ${t(lang, "Targets", "Targets")}: ${fmt(s1.price)}${s2 ? ` / ${fmt(s2.price)}` : ""}. ${t(lang, `Take partial at ${fmt(s1.price)} and move stop to breakeven.`, `${fmt(s1.price)} par partial lo aur stop breakeven par le jao.`)}`);
  if (d.lean === "UP") out.push(`• ⚠️ ${t(lang, "Higher timeframes lean bullish: don't add, protect profit.", "Bade timeframe bullish lean kar rahe hain: add mat karo, profit protect karo.")}`);

  const reference = extractUserPrice(input.message);
  if (reference !== null) {
    const diff = d.price - reference;
    out.push(
      "",
      t(lang, `📏 Using your number ${fmt(reference)} (I can't see your account): price is ${diff >= 0 ? "+" : ""}${fmt(diff)} pts from it${d.atrH1 ? ` (~${fmt(Math.abs(diff) / d.atrH1)} × H1 ATR)` : ""}.`, `📏 Aapka number ${fmt(reference)} (main aapka account nahi dekh sakta): price usse ${diff >= 0 ? "+" : ""}${fmt(diff)} pts door hai${d.atrH1 ? ` (~${fmt(Math.abs(diff) / d.atrH1)} × H1 ATR)` : ""}.`),
    );
    if (/target|possible/i.test(input.message) && reference > d.price) {
      const between = resistances.filter((row) => row.price < reference);
      out.push(
        between.length > 0
          ? t(lang, `Levels that must break on the way: ${between.map((row) => fmt(row.price)).join(", ")}. It is possible, not promised.`, `Raste ke levels jo tootne chahiye: ${between.map((row) => fmt(row.price)).join(", ")}. Possible hai, pakka nahi.`)
          : t(lang, "No engine resistance sits between price and that target. It is possible, not promised.", "Price aur us target ke beech koi engine resistance nahi hai. Possible hai, pakka nahi."),
      );
    }
  }

  if (/overnight|night|weekend/i.test(input.message)) {
    out.push("", t(lang, "🌙 Overnight: liquidity is thin in Asia, spreads widen at rollover, and gaps can jump a stop. Use smaller size.", "🌙 Overnight: Asia mein liquidity kam hoti hai, rollover par spread badhta hai aur gap se stop skip ho sakta hai. Size chhota rakho."));
  }

  out.push("", t(lang, `${ctx.n}💬 Tell me whether you're in a BUY or a SELL, and your entry price, and I'll give you your exact distance, P&L and a plan for that side only.`, `${ctx.n}💬 Batao aap BUY mein ho ya SELL mein, aur entry price kya hai: main aapka exact P&L, doori aur sirf us side ka plan dunga.`));
  out.push("", ...footer(ctx, true));
  return out.join("\n");
}

const allPrices = (message: string): number[] =>
  [...message.matchAll(/(?<![\d.])(\d{1,2},?\d{3}(?:\.\d+)?)(?![\d])/g)]
    .map((m) => Number((m[1] ?? "").replace(",", "")))
    .filter((v) => v >= 1000 && v <= 20000);

function holdExitSideCard(side: Side, d: Decision, input: ComposeInput, lang: Lang, ctx: ReplyCtx): string {
  const atr = d.atrH1 ?? 5;
  const { resistances, supports } = nearestLevels(input.result, d.price, atr);
  const guard = (side === "BUY" ? supports : resistances)[0];
  const goals = side === "BUY" ? resistances : supports;
  const g1 = goals[0];
  const g2 = goals[1];
  const icon = side === "BUY" ? "🟢" : "🔴";
  const lean: Side | null = d.lean === "UP" ? "BUY" : d.lean === "DOWN" ? "SELL" : null;
  const nm = ctx.name ? `${ctx.name}, ` : "";
  const nums = allPrices(input.message);
  const wantsTarget = /target|possible|tp\b/i.test(input.message);
  const entryPx = wantsTarget && nums.length === 1 ? null : (nums[0] ?? null);
  const targetPx = wantsTarget ? (nums.length > 1 ? nums[1]! : nums.length === 1 ? nums[0]! : null) : null;

  const out: string[] = [
    t(lang, `🧭 ${icon} Your ${side} position: hold or exit?`, `🧭 ${icon} Aapki ${side} position: hold ya exit?`),
    `XAU/USD ${fmt(d.price)} · ${tfStrip(d)}`,
  ];

  let pnl: number | null = null;
  if (entryPx !== null) {
    pnl = side === "BUY" ? d.price - entryPx : entryPx - d.price;
    const x = d.atrH1 ? Math.abs(pnl) / d.atrH1 : null;
    out.push(
      `📏 ${pnl >= 0 ? t(lang, "✅ In profit", "✅ Profit mein") : t(lang, "❌ In loss", "❌ Loss mein")}: ${pnl >= 0 ? "+" : ""}${fmt(pnl)} pts ${t(lang, "from", "entry")} ${fmt(entryPx)}${x ? ` (~${fmt(x)} × H1 ATR)` : ""}`,
    );
  }

  out.push("");
  if (lean === side) {
    out.push(t(lang, `${nm}the trend is with you 👍 the higher timeframes still lean ${dirWord(d.lean)}, so there's no reason to rush out.`, `${nm}trend aapke saath hai 👍 bade timeframe abhi ${dirWord(d.lean)} lean kar rahe hain, bahar bhaagne ki jaldi nahi.`));
  } else if (lean) {
    const inProfit = pnl !== null && pnl > 0;
    out.push(
      inProfit
        ? t(lang, `${nm}you're in profit, but the trend is against this ${side} ❌ D1/H4 lean ${dirWord(d.lean)}. Protect what you've made.`, `${nm}aap profit mein ho, par trend is ${side} ke against hai ❌ D1/H4 ${dirWord(d.lean)} lean kar rahe hain. Jo kamaya hai use bachao.`)
        : t(lang, `${nm}the trend is against this ${side} ❌ D1/H4 lean ${dirWord(d.lean)}. Don't hope: protect capital first.`, `${nm}trend is ${side} ke against hai ❌ D1/H4 ${dirWord(d.lean)} lean kar rahe hain. Umeed par hold mat karo: pehle capital bachao.`),
    );
  } else {
    out.push(t(lang, `${nm}there's no clear edge either way right now, so manage this by your stop, not by hope.`, `${nm}abhi kisi taraf clear edge nahi hai, isliye stop se manage karo, umeed se nahi.`));
  }

  out.push("");
  if (guard) {
    out.push(`• ${t(lang, `Hold while H1 closes ${side === "BUY" ? "above" : "below"} ${fmt(guard.price)}; a close ${side === "BUY" ? "below" : "above"} it means exit or cut.`, `H1 close ${fmt(guard.price)} ke ${side === "BUY" ? "upar" : "neeche"} rahe tak hold; ${side === "BUY" ? "neeche" : "upar"} close ho to exit/cut.`)}`);
  } else {
    out.push(`• ${t(lang, "No clean level nearby: respect the stop you set before entering.", "Paas mein clean level nahi: entry se pehle jo stop rakha tha usi ko maano.")}`);
  }
  if (g1) out.push(`• 🎯 ${fmt(g1.price)}${g2 ? ` / ${fmt(g2.price)}` : ""}: ${t(lang, `take partial at ${fmt(g1.price)}, then move the stop to breakeven.`, `${fmt(g1.price)} par partial lo, phir stop breakeven par le jao.`)}`);
  if (lean && lean !== side) {
    out.push(`• ❌ ${t(lang, "Don't add or average down.", "Add ya average mat karo.")}`);
    if (pnl !== null && pnl < 0 && entryPx !== null) {
      out.push(`• ${t(lang, `A bounce back to ${fmt(entryPx)} is a chance to exit flat, not a reason to hold bigger.`, `Price ${fmt(entryPx)} tak wapas aaye to flat exit ka mauka hai, size badhane ka nahi.`)}`);
    }
  }
  if (lean === side && /\b(in (a )?loss|loss mein|nuksan|minus)\b/i.test(input.message) && (pnl === null || pnl < 0)) {
    out.push(`• ⏳ ${t(lang, "If the trend agrees and you're still in loss, the entry was likely early: hold only while your stop is intact, exit if it breaks.", "Trend saath hai aur phir bhi loss hai, matlab entry thodi jaldi thi: stop intact ho to hold, toot jaye to exit.")}`);
  }
  if (/\b(loss|nuksan|minus|revenge|recover)\b/i.test(input.message)) {
    out.push(`• 🧘 ${t(lang, "Don't increase size to win it back: that's how a small loss becomes a big one.", "Loss wapas pane ke liye size mat badhao: isi se chhota loss bada ban jata hai.")}`);
  }

  if (targetPx !== null) {
    const toward = side === "BUY" ? targetPx > d.price : targetPx < d.price;
    if (toward) {
      const dist = Math.abs(targetPx - d.price);
      const between = (side === "BUY" ? resistances : supports).filter((row) => (side === "BUY" ? row.price < targetPx : row.price > targetPx));
      out.push("", `🎯 ${t(lang, `Target ${fmt(targetPx)} is ${fmt(dist)} pts away${d.atrH1 ? ` (~${fmt(dist / d.atrH1)} × H1 ATR)` : ""}.`, `Target ${fmt(targetPx)} abhi ${fmt(dist)} pts door hai${d.atrH1 ? ` (~${fmt(dist / d.atrH1)} × H1 ATR)` : ""}.`)} ${between.length > 0 ? t(lang, `Levels to clear first: ${between.map((row) => fmt(row.price)).join(", ")}.`, `Pehle ye levels tootne chahiye: ${between.map((row) => fmt(row.price)).join(", ")}.`) : ""} ${t(lang, "Possible, not promised.", "Possible hai, pakka nahi.")}`);
    }
  }

  if (/overnight|night|weekend/i.test(input.message)) {
    out.push("", t(lang, "🌙 Overnight: liquidity is thin in Asia, spreads widen at rollover, and gaps can jump a stop. Use smaller size.", "🌙 Overnight: Asia mein liquidity kam hoti hai, rollover par spread badhta hai aur gap se stop skip ho sakta hai. Size chhota rakho."));
  }
  if (entryPx === null && targetPx === null) {
    out.push("", t(lang, "💬 Tell me your entry price and I'll work out your exact distance and P&L.", "💬 Apna entry price batao, main exact doori aur P&L nikaal dunga."));
  }
  out.push("", ...footer(ctx, true));
  return out.join("\n");
}


function riskCard(d: Decision, input: ComposeInput, lang: Lang): string {
  const msg = input.message.toLowerCase();
  const plan = d.plans[0];
  const dollarMatches = [...msg.matchAll(/\$\s?(\d+(?:,\d{3})*(?:\.\d+)?)/g)].map((m) => Number((m[1] ?? "0").replace(/,/g, "")));
  const lotMatch = /(\d+(?:\.\d+)?)\s*(?:standard )?lots?\b/.exec(msg);
  const pctMatch = /(\d+(?:\.\d+)?)\s*%/.exec(msg);
  const lots = lotMatch ? Number(lotMatch[1]) : null;
  const pct = pctMatch ? Number(pctMatch[1]) : null;

  const out: string[] = [t(lang, "🧮 Position size (gold maths)", "🧮 Position size (gold ka hisaab)"), ""];
  out.push(
    t(lang, "• 1 standard lot of XAU/USD = 100 oz, so a $1 move = $100 per lot (0.1 lot = $10, 0.01 lot = $1).", "• XAU/USD ka 1 standard lot = 100 oz, yaani $1 move = $100 per lot (0.1 lot = $10, 0.01 lot = $1)."),
    t(lang, "• Lot size = risk in $ ÷ (stop distance in points × 100).", "• Lot size = risk $ ÷ (stop distance points × 100)."),
    "",
  );

  const first = dollarMatches[0];
  const second = dollarMatches[1];

  // "$100 risk for 0.1 lot" -> stop distance in points
  if (first !== undefined && lots !== null && /how many points|points/.test(msg)) {
    const points = first / (lots * 100);
    out.push(`✅ ${t(lang, `$${money(first)} risk on ${lots} lot = ${fmt(points)} points of stop distance.`, `${lots} lot par $${money(first)} risk = ${fmt(points)} points ka stop distance.`)}`);
  } else if (lots !== null && first !== undefined && /safe|account|\$/.test(msg)) {
    // "10 lot on $500 account"
    const move = first / (lots * 100);
    out.push(`⚠️ ${t(lang, `${lots} lot moves $${money(lots * 100)} per $1. A ${fmt(move)}-point move against you wipes a $${money(first)} account. That is not safe.`, `${lots} lot par $1 move = $${money(lots * 100)}. $${money(first)} ke account ko sirf ${fmt(move)} points ki ulti move khatam kar degi. Ye safe nahi hai.`)}`);
  } else if (first !== undefined && pct !== null) {
    // "$1000 account with 1% risk"
    const riskDollars = (first * pct) / 100;
    out.push(`✅ ${t(lang, `Risk = ${pct}% of $${money(first)} = $${money(riskDollars)} per trade.`, `Risk = $${money(first)} ka ${pct}% = $${money(riskDollars)} per trade.`)}`);
    if (plan) {
      const lotsFor = riskDollars / (plan.riskPoints * 100);
      out.push(t(lang, `With the current plan's stop (${fmt(plan.riskPoints)} pts): ${lotsFor.toFixed(2)} lot.`, `Current plan ke stop (${fmt(plan.riskPoints)} pts) par: ${lotsFor.toFixed(2)} lot.`));
    }
    out.push(t(lang, "Tell me a different stop distance in points and divide: lot = risk $ ÷ (points × 100).", "Alag stop distance ho to formula lagao: lot = risk $ ÷ (points × 100)."));
  } else if (pct !== null && first === undefined && /risk/.test(msg)) {
    out.push(
      pct > 2
        ? `⚠️ ${t(lang, `${pct}% per trade is aggressive: five losses in a row costs ~${Math.round((1 - Math.pow(1 - pct / 100, 5)) * 100)}% of the account. Most traders keep it at 0.5–2%.`, `Har trade mein ${pct}% aggressive hai: lagatar 5 loss mein account ka ~${Math.round((1 - Math.pow(1 - pct / 100, 5)) * 100)}% chala jata hai. Zyadatar traders 0.5–2% rakhte hain.`)}`
        : `✅ ${t(lang, `${pct}% per trade is within the common 0.5–2% range.`, `Har trade mein ${pct}% aam 0.5–2% range ke andar hai.`)}`,
    );
  } else if (plan) {
    out.push(t(lang, `Example with the current plan's stop (${fmt(plan.riskPoints)} pts):`, `Current plan ke stop (${fmt(plan.riskPoints)} pts) ka example:`));
    for (const dollars of [50, 100, 500]) {
      out.push(`• $${dollars} ${t(lang, "risk", "risk")} → ${(dollars / (plan.riskPoints * 100)).toFixed(2)} lot`);
    }
  }
  void second;

  out.push(
    "",
    t(lang, "Risk 0.5–2% of your account per trade, and never more than you can afford to lose. Use the Risk Calculator for your exact numbers.", "Har trade mein account ka 0.5–2% risk rakho, aur jitna kho sako utna hi. Apne exact numbers ke liye Risk Calculator use karo."),
    "",
    disclaimer(lang),
  );
  return out.join("\n");
}

function newsCard(d: Decision, lang: Lang): string {
  return [
    t(lang, "📰 News and events", "📰 News aur events"),
    "",
    t(
      lang,
      "I don't have a news or economic-calendar feed connected yet, so I can't tell you whether CPI, NFP, an FOMC decision or any other event is due, what it printed, or what the dollar index is doing. I won't guess.",
      "Mere paas abhi news ya economic-calendar feed connected nahi hai, isliye main nahi bata sakta ki CPI, NFP, FOMC ya koi aur event aane wala hai, kya aaya, ya dollar index kya kar raha hai. Main andaza nahi lagaunga.",
    ),
    "",
    t(lang, "What to do:", "Kya karein:"),
    t(lang, "• Check an economic calendar for USD high-impact events today.", "• Aaj ke USD high-impact events kisi economic calendar par check karo."),
    t(lang, "• Avoid fresh entries 15 minutes before and after them; spreads and volatility spike.", "• Event se 15 min pehle aur baad nayi entry avoid karo; spread aur volatility badhti hai."),
    "",
    `${t(lang, "Technical view right now", "Abhi ka technical view")}: ${d.action === "WAIT" ? "🟡 WAIT" : d.action === "BUY" ? "🟢 BUY" : "🔴 SELL"} · ${t(lang, "Conviction", "Conviction")} ${convictionWord(d.conviction, lang)} · XAU/USD ${fmt(d.price)}`,
  ].join("\n");
}

/* ---------------------- replies that need no market data ----------------- */

export function composeStaticReply(message: string): { intent: Intent; text: string } | null {
  const intent = detectIntent(message);
  if (!intent) return null;
  const lang = detectLanguage(message);

  switch (intent) {
    case "DISTRESS":
      return {
        intent,
        text: [
          t(lang, "I'm really sorry you're going through this. Money losses can feel crushing, and your life matters far more than any trade.", "Mujhe bahut afsos hai ki aap is se guzar rahe ho. Paise ka nuksan bahut bhaari lagta hai, par aapki zindagi kisi bhi trade se kahin zyada keemti hai."),
          "",
          t(lang, "Please stop trading for now and talk to someone you trust today: a family member, a friend, or a local mental-health or crisis helpline. If you feel you might act on these thoughts, please contact your local emergency number right away.", "Please abhi trading rok do aur aaj hi kisi apne se baat karo: family, dost, ya apne desh ki mental-health ya crisis helpline. Agar lagta hai ki aap in vichaaron par amal kar sakte ho, to turant apne local emergency number par call karo."),
          "",
          t(lang, "Are you safe right now? I'm here to talk. Gold will still be there when you are ready.", "Kya aap abhi safe ho? Main baat karne ke liye yahan hoon. Gold kahin nahi ja raha, jab aap tayyar ho tab dekhenge."),
        ].join("\n"),
      };

    case "INJECTION":
      return {
        intent,
        text: [
          t(lang, "🔒 I can't share internal instructions, keys or secrets, and I won't change how I work.", "🔒 Main internal instructions, keys ya secrets share nahi kar sakta, aur apna kaam karne ka tareeka nahi badlunga."),
          "",
          t(lang, "I'm here for XAU/USD: ask me buy, sell or wait, levels, risk or sessions.", "Main XAU/USD ke liye hoon: buy, sell ya wait, levels, risk ya sessions poochho."),
        ].join("\n"),
      };

    case "GUARANTEE":
      return {
        intent,
        text: [
          t(lang, "🛡️ No, and nobody honestly can.", "🛡️ Nahi, aur koi imaandaari se de bhi nahi sakta."),
          "",
          t(lang, "Markets are probabilistic. Even a good setup fails often; what matters is a defined stop and a size you can afford to lose. I won't promise profit, 100% accuracy, or cover losses, and I don't give insider or pump tips.", "Market probability ka khel hai. Achha setup bhi aksar fail hota hai; zaroori hai defined stop aur aisa size jo khone par bhi chale. Main profit, 100% accuracy ya nuksan bharne ka vaada nahi karta, aur insider ya pump tips nahi deta."),
          "",
          t(lang, "What I can do: show the verdict, the levels, where the idea is wrong, and the risk.", "Main kya kar sakta hoon: verdict, levels, plan kahan galat hai, aur risk dikha sakta hoon."),
          "",
          disclaimer(lang),
        ].join("\n"),
      };

    case "SAVINGS":
      return {
        intent,
        text: [
          t(lang, "⚠️ Please don't put life savings or borrowed money into leveraged gold trading.", "⚠️ Please life savings ya udhaar ka paisa leveraged gold trading mein mat lagao."),
          "",
          t(lang, "Leverage can wipe an account in minutes. Only trade money you can afford to lose, risk 0.5–2% per trade, and keep an emergency fund separate. For decisions about savings, speak to a licensed financial advisor.", "Leverage se account minutes mein khatam ho sakta hai. Sirf wahi paisa trade karo jo khone par bhi chale, har trade mein 0.5–2% risk rakho, aur emergency fund alag rakho. Savings ke faisle ke liye licensed financial advisor se baat karo."),
          "",
          t(lang, "This is general information, not financial advice.", "Ye general jaankari hai, financial advice nahi."),
        ].join("\n"),
      };

    case "ACCOUNT":
      return {
        intent,
        text: [
          t(lang, "🔌 GoldScope is analysis-only for now.", "🔌 GoldScope abhi sirf analysis ke liye hai."),
          "",
          t(lang, "I can't connect to MetaTrader or any broker account, and I never place or manage trades. I give the verdict, levels, risk and plans for XAU/USD; you decide and execute on your own platform.", "Main MetaTrader ya kisi broker account se connect nahi hota, aur koi trade place ya manage nahi karta. Main XAU/USD ka verdict, levels, risk aur plans deta hoon; faisla aur execution aap apne platform par karte ho."),
        ].join("\n"),
      };

    case "TRACK_RECORD":
      return {
        intent,
        text: [
          t(lang, "📊 Honest answer: there is no verified live track record yet.", "📊 Seedha jawab: abhi koi verified live track record nahi hai."),
          "",
          t(lang, "Signals are new. I won't quote an accuracy number I can't prove. Accuracy will be shown from logged signals (target hit / stop hit / no result) with the sample size once enough have been recorded. Until then, treat every verdict as a prediction, not a promise.", "Signals naye hain. Main wo accuracy number nahi bolunga jo prove na kar sakoon. Jab kaafi signals log ho jayenge to target hit / stop hit / no result ke saath sample size dikhaya jayega. Tab tak har verdict ko prediction maano, vaada nahi."),
          "",
          disclaimer(lang),
        ].join("\n"),
      };

    case "CAPABILITIES":
      return {
        intent,
        text: [
          t(lang, "👋 I'm GoldScope, your XAU/USD (gold) decision copilot.", "👋 Main GoldScope hoon, aapka XAU/USD (gold) decision copilot."),
          "",
          t(lang, "Ask me:", "Mujhse poochho:"),
          t(lang, "• 🟢🔴🟡 Buy, sell or wait? (with entry, stop, targets)", "• 🟢🔴🟡 Buy, sell ya wait? (entry, stop, targets ke saath)"),
          t(lang, "• 📊 Support/resistance, today's high/low, pivots", "• 📊 Support/resistance, aaj ka high/low, pivots"),
          t(lang, "• 🧭 What each timeframe says, indicators, volatility", "• 🧭 Har timeframe kya keh raha hai, indicators, volatility"),
          t(lang, "• 🕒 Sessions and best trading windows", "• 🕒 Sessions aur trading ke best windows"),
          t(lang, "• 🧮 Position-size maths and risk", "• 🧮 Position-size ka hisaab aur risk"),
          t(lang, "• 📸 Upload a chart screenshot for a review", "• 📸 Chart screenshot upload karke review lo"),
          "",
          t(lang, "I don't connect to broker accounts, and the news calendar isn't connected yet.", "Main broker account se connect nahi hota, aur news calendar abhi connected nahi hai."),
          "",
          disclaimer(lang),
        ].join("\n"),
      };

    case "UNAVAILABLE":
      return {
        intent,
        text: [
          t(lang, "ℹ️ I can't see your broker's spread, commission or swap.", "ℹ️ Main aapke broker ka spread, commission ya swap nahi dekh sakta."),
          "",
          t(lang, "Check them in your trading platform. On gold, spreads widen around news, at rollover and in thin Asia hours: use wider stops or skip entries then.", "Inhe apne trading platform mein check karo. Gold mein news, rollover aur Asia ke patle hours mein spread badhta hai: tab wide stop rakho ya entry skip karo."),
        ].join("\n"),
      };

    default:
      return null;
  }
}

/* ---------------------------- data-backed extra cards -------------------- */

function priceCard(d: Decision, input: ComposeInput, lang: Lang): string {
  const s = input.result.dayStats;
  const out: string[] = [`💰 XAU/USD ${fmt(d.price)}`];

  if (s?.today) {
    const change = d.price - s.today.open;
    out.push(`${t(lang, "Today", "Aaj")}: ${change >= 0 ? "+" : ""}${fmt(change)} pts ${t(lang, "from the open", "open se")} · ${t(lang, "range", "range")} ${fmt(s.today.low)}–${fmt(s.today.high)}`);
  }
  if (s?.previousDay) {
    out.push(`${t(lang, "Previous close", "Pichhla close")}: ${fmt(s.previousDay.close)}`);
  }
  out.push(`${sessionLine(input)} · ${d.action === "WAIT" ? "🟡 WAIT" : d.action === "BUY" ? "🟢 BUY" : "🔴 SELL"} · ${t(lang, "Conviction", "Conviction")} ${convictionWord(d.conviction, lang)}`);
  if (d.marketClosed) out.push(t(lang, "Market is closed: this is the last close.", "Market band hai: ye last close hai."));
  return out.join("\n");
}

function briefCard(d: Decision, lang: Lang): string {
  const head =
    d.marketClosed
      ? "🟡 WAIT"
      : d.action === "BUY"
        ? "🟢 BUY"
        : d.action === "SELL"
          ? "🔴 SELL"
          : "🟡 WAIT";
  const reason = d.why[0] ? why(d.why[0], d, lang) : "";
  return [
    `${head} · XAU/USD ${fmt(d.price)} · ${t(lang, "Conviction", "Conviction")} ${convictionWord(d.conviction, lang)}`,
    reason,
    t(lang, "Ask “where to buy/sell” for levels or “signal” for the full plan.", "Levels ke liye “where to buy/sell” ya poore plan ke liye “signal” poochho."),
  ].join("\n");
}

function historyCard(d: Decision, input: ComposeInput, lang: Lang): string {
  const h = input.result.history;
  const out: string[] = [t(lang, "🗓️ History (real daily candles)", "🗓️ History (real daily candles)")];

  if (!h) {
    out.push(t(lang, "Daily history is not available right now.", "Daily history abhi available nahi hai."));
    return out.join("\n");
  }

  out.push(
    `${t(lang, "Data covers", "Data range")}: ${h.from.slice(0, 10)} → ${h.to.slice(0, 10)} (${h.candleCount} ${t(lang, "days", "din")})`,
    "",
    `${t(lang, "Highest", "Sabse upar")}: ${fmt(h.periodHigh.price)} (${h.periodHigh.date.slice(0, 10)})`,
    `${t(lang, "Lowest", "Sabse neeche")}: ${fmt(h.periodLow.price)} (${h.periodLow.date.slice(0, 10)})`,
    `${t(lang, "Now", "Abhi")}: ${fmt(d.price)} · ${t(lang, "from the high", "high se")} ${fmt(d.price - h.periodHigh.price)} pts (${fmt(h.drawdownFromHighPercent)}%) · ${t(lang, "from the low", "low se")} +${fmt(d.price - h.periodLow.price)} pts`,
    `${t(lang, "Position in range", "Range mein position")}: ${Math.round(h.positionInRangePercent)}% (0 = low, 100 = high)`,
    `${t(lang, "Average daily range", "Average daily range")}: ${fmt(h.averageDailyRange)} pts`,
  );
  if (h.last30Days) out.push(`${t(lang, "Last 30 days", "Pichhle 30 din")}: ${h.last30Days.changePercent >= 0 ? "+" : ""}${fmt(h.last30Days.changePercent)}%`);
  if (h.last90Days) out.push(`${t(lang, "Last 90 days", "Pichhle 90 din")}: ${h.last90Days.changePercent >= 0 ? "+" : ""}${fmt(h.last90Days.changePercent)}%`);

  out.push("", t(lang, "This is the high of the data window, not necessarily the all-time high. I don't have prices from before this window.", "Ye data window ka high hai, zaroori nahi ki all-time high ho. Is window se pehle ke prices mere paas nahi hain."));
  return out.join("\n");
}

function moveWhyCard(d: Decision, input: ComposeInput, lang: Lang): string {
  const s = input.result.dayStats;
  const out: string[] = [t(lang, "🔍 What I can and can't say about the move", "🔍 Is move ke baare mein main kya bol sakta hoon aur kya nahi")];

  if (s?.today) {
    const change = d.price - s.today.open;
    const adr = input.result.history?.averageDailyRange ?? null;
    out.push(
      "",
      `${t(lang, "Today", "Aaj")}: ${change >= 0 ? "+" : ""}${fmt(change)} pts ${t(lang, "from the open", "open se")}, ${t(lang, "range", "range")} ${fmt(s.today.high - s.today.low)} pts${adr ? ` (${t(lang, "average daily range", "average daily range")} ${fmt(adr)})` : ""}`,
    );
    if (adr) {
      const ratio = (s.today.high - s.today.low) / adr;
      out.push(
        ratio > 1
          ? t(lang, "📈 Today is already more volatile than a normal day.", "📈 Aaj ka din normal din se zyada volatile hai.")
          : t(lang, "Today's range is still within a normal day.", "Aaj ki range abhi normal din ke andar hai."),
      );
    }
  }

  out.push(
    "",
    t(lang, "I can't verify the cause: no news feed is connected. Sudden gold moves usually come from USD data, Fed commentary, yields or geopolitical headlines. Check the calendar and headlines for the exact time of the move.", "Main wajah verify nahi kar sakta: news feed connected nahi hai. Gold ki achanak moves aam taur par USD data, Fed ke bayan, yields ya geopolitical headlines se aati hain. Move ke exact time par calendar aur headlines check karo."),
    "",
    `${t(lang, "Now", "Abhi")}: ${d.action === "WAIT" ? "🟡 WAIT" : d.action === "BUY" ? "🟢 BUY" : "🔴 SELL"} · XAU/USD ${fmt(d.price)}`,
  );
  return out.join("\n");
}

function priceCheckCard(d: Decision, input: ComposeInput, lang: Lang): string {
  const target = extractUserPrice(input.message);
  if (target === null) return briefCard(d, lang);

  const atr = d.atrH1 ?? null;
  const diff = target - d.price;
  const { resistances, supports } = nearestLevels(input.result, d.price, atr ?? 5);
  const up = diff > 0;
  const between = (up ? resistances : supports).filter((row) => (up ? row.price < target : row.price > target));
  const nearest = [...resistances, ...supports].sort((a, b) => Math.abs(a.price - target) - Math.abs(b.price - target))[0];

  const out: string[] = [
    `🎯 ${fmt(target)} ${t(lang, "check", "check")}`,
    `XAU/USD ${fmt(d.price)} · ${t(lang, "distance", "doori")} ${diff >= 0 ? "+" : ""}${fmt(diff)} pts${atr ? ` (~${fmt(Math.abs(diff) / atr)} × H1 ATR)` : ""}`,
    "",
  ];

  if (nearest && Math.abs(nearest.price - target) <= (atr ?? 5) * 0.5) {
    out.push(`✅ ${t(lang, `${fmt(target)} sits at a real level: ${fmt(nearest.price)} (${nearest.timeframe}, ${nearest.touches} ${nearest.touches === 1 ? "touch" : "touches"}).`, `${fmt(target)} ek real level ke paas hai: ${fmt(nearest.price)} (${nearest.timeframe}, ${nearest.touches} touch).`)}`);
  } else if (nearest) {
    out.push(`⚠️ ${t(lang, `${fmt(target)} is not at an engine level. The nearest real level is ${fmt(nearest.price)} (${nearest.timeframe}), ${fmt(Math.abs(nearest.price - target))} pts away. A round number can matter psychologically, but it isn't a measured level.`, `${fmt(target)} engine ke level par nahi hai. Sabse paas ka real level ${fmt(nearest.price)} (${nearest.timeframe}) hai, ${fmt(Math.abs(nearest.price - target))} pts door. Round number psychological roop se matter kar sakta hai, par ye measured level nahi hai.`)}`);
  }

  if (atr && Math.abs(diff) / atr > 8) {
    out.push(`📏 ${t(lang, `That is far: about ${fmt(Math.abs(diff) / atr)} hourly ranges away. It is a multi-day or multi-week move, not an intraday target.`, `Ye door hai: lagbhag ${fmt(Math.abs(diff) / atr)} hourly range. Ye multi-day ya multi-week move hai, intraday target nahi.`)}`);
  }

  if (between.length > 0) {
    out.push(`${up ? "🔴" : "🟢"} ${t(lang, "Levels on the way", "Raste ke levels")}: ${between.map((row) => fmt(row.price)).join(", ")}`);
  }

  if (up && /go to|reach|hit|target|possible|will/i.test(input.message)) {
    out.push("", t(lang, "No one can promise price reaches a number. Treat it as a possibility that needs the levels above to break, not a forecast.", "Koi bhi promise nahi kar sakta ki price ek number tak jayega. Ise possibility maano jiske liye upar ke levels tootne chahiye, forecast nahi."));
  }

  out.push("", `${t(lang, "Current view", "Abhi ka view")}: ${d.action === "WAIT" ? `🟡 WAIT (${dirWord(d.lean)} lean)` : d.action === "BUY" ? "🟢 BUY" : "🔴 SELL"} · ${t(lang, "Conviction", "Conviction")} ${convictionWord(d.conviction, lang)}`, "", disclaimer(lang));
  return out.join("\n");
}

function repeatCard(d: Decision, lang: Lang, ctx: ReplyCtx): string {
  const out: string[] = [];
  const same = pick(
    lang === "hi"
      ? ["Plan wahi hai jo pehle bataya tha: H1 par kuch nahi badla.", "Pichhle jawab ke baad kuch nahi badla: plan khada hai.", "View same hai: market ne ise badalne ki wajah nahi di."]
      : ["Same plan as before: nothing has changed on the H1.", "No change since my last answer: the plan stands.", "Still the same view; the market hasn't given a reason to change it."],
    ctx.seed,
    5,
  );
  out.push(`${ctx.n}🔁 ${same}`);
  const icon = d.action === "BUY" ? "🟢" : d.action === "SELL" ? "🔴" : "🟡";
  out.push(`${icon} ${d.action}${d.action !== "WAIT" && d.entryState === "PULLBACK" ? t(lang, " on pullback", " pullback par") : ""} · ${t(lang, "Conviction", "Conviction")}: ${convictionWord(d.conviction, lang)} · XAU/USD ${fmt(d.price)}`);
  if (d.plan) {
    out.push(`📍 ${t(lang, "Entry", "Entry")} ${fmt(d.plan.entry)} · 🛑 ${fmt(d.plan.stopLoss)} · 🎯 ${d.plan.targets.map(fmt).join(" / ")}`);
    const gap = d.price - d.plan.entry;
    const x = d.atrH1 ? Math.abs(gap) / d.atrH1 : null;
    out.push(t(lang, `Price is ${fmt(Math.abs(gap))} pts ${gap > 0 ? "above" : "below"} the entry${x ? ` (~${fmt(x)} × H1 ATR)` : ""}.`, `Price entry se ${fmt(Math.abs(gap))} pts ${gap > 0 ? "upar" : "neeche"} hai${x ? ` (~${fmt(x)} × H1 ATR)` : ""}.`));
  } else if (d.plans.length > 0) {
    out.push(`📍 ${d.plans.map((p) => `${p.direction === "BUY" ? "🟢 BUY" : "🔴 SELL"} ${fmt(p.entry)}`).join(" · ")}`);
  }
  out.push("", `⏱ ${t(lang, "View refreshes at", "View update hoga")} ${timeBoth(d.validUntil)}`, "", ...footer(ctx, false));
  return out.join("\n");
}

function directionCard(d: Decision, input: ComposeInput, lang: Lang, ctx: ReplyCtx): string {
  const m = input.message.toLowerCase();
  const out: string[] = [];
  const soft = d.conviction === "LOW";
  const lead =
    d.lean === "DOWN"
      ? pick(
          lang === "hi"
            ? ["chhota jawab: bearish side bhaari hai 🔴", "bada picture neeche ka hai 🔴", "bade timeframe par sellers control mein hain 🔴"]
            : ["short answer: bearish has the upper hand 🔴", "the bigger picture leans down 🔴", "sellers are in control on the higher timeframes 🔴"],
          ctx.seed,
          7,
        )
      : d.lean === "UP"
        ? pick(
            lang === "hi"
              ? ["chhota jawab: bullish side bhaari hai 🟢", "bada picture upar ka hai 🟢", "bade timeframe par buyers control mein hain 🟢"]
              : ["short answer: bullish has the upper hand 🟢", "the bigger picture leans up 🟢", "buyers are in control on the higher timeframes 🟢"],
            ctx.seed,
            7,
          )
        : pick(
            lang === "hi"
              ? ["abhi koi clear direction nahi ⚪ timeframe ek doosre se alag hain", "abhi coin-flip jaisa market hai ⚪ main edge ka dikhawa nahi karunga"]
              : ["no clear direction right now ⚪ the timeframes disagree", "it's close to a coin flip at the moment ⚪ I won't pretend there is an edge"],
            ctx.seed,
            7,
          );
  out.push(`${ctx.n}${soft && d.lean !== "FLAT" ? t(lang, "slight lean, ", "halka lean, ") : ""}${lead}`);
  out.push(`📊 ${tfStrip(d)} · ${t(lang, "Conviction", "Conviction")}: ${convictionWord(d.conviction, lang)} · XAU/USD ${fmt(d.price)}`);

  const day = input.result.dayStats?.today;
  if (day && /today|aaj|day|din/.test(m)) {
    const change = d.price - day.open;
    out.push(`📅 ${t(lang, "Today", "Aaj")}: ${t(lang, "open", "open")} ${fmt(day.open)} → ${fmt(d.price)} (${change >= 0 ? "+" : ""}${fmt(change)} pts) · ${t(lang, "High", "High")} ${fmt(day.high)} · ${t(lang, "Low", "Low")} ${fmt(day.low)}`);
  }

  if (/revers|still|trend/.test(m)) {
    const d1 = dirWord(d.reads.D1.dir);
    const h4 = dirWord(d.reads.H4.dir);
    out.push(`🔁 ${t(lang, `D1 is ${d1} and H4 is ${h4}. A real reversal needs both to flip; until then a counter move is a pullback, not a new trend.`, `D1 ${d1} aur H4 ${h4} hai. Asli reversal tab hoga jab dono palten; tab tak ulti move pullback hai, naya trend nahi.`)}`);
  }

  if (/probab|chance|odds|percent|%/.test(m)) {
    out.push(`🎲 ${t(lang, `I don't quote a % probability. Conviction ${convictionWord(d.conviction, lang)} is signal strength, not a measured win rate; real hit-rates will come from backtesting.`, `Main % probability nahi deta. Conviction ${convictionWord(d.conviction, lang)} signal ki taakat hai, measured win-rate nahi; asli hit-rate backtest se aayega.`)}`);
  }

  out.push(
    "",
    pick(
      lang === "hi"
        ? ["👉 Entry/SL/TP chahiye to bolo: \"give me a signal\".", "👉 Plan dekhna ho to \"trade plan do\" likho.", "👉 Seedha plan: \"entry stop target do\" bolo."]
        : ["👉 For entry, stop and target, ask: \"give me a signal\".", "👉 Want the plan? Type \"give me a trade plan\".", "👉 For exact levels, ask: \"entry, stop, target\"."],
      ctx.seed,
      8,
    ),
  );
  out.push("", ...footer(ctx, false));
  return out.join("\n");
}


function certaintyNote(d: Decision, lang: Lang): string {
  return t(lang, `No forecast is certain. Current view: ${d.action} · Conviction ${convictionWord(d.conviction, lang)}.`, `Koi forecast pakka nahi hota. Abhi ka view: ${d.action} · Conviction ${convictionWord(d.conviction, lang)}.`);
}

/* --------------------------------- entry --------------------------------- */

export interface ComposedReply {
  intent: Intent;
  decision: Decision;
  text: string;
}

export function composeDecisionReply(input: ComposeInput): ComposedReply | null {
  const intent = detectIntent(input.message);
  if (!intent) return null;

  const lang = detectLanguage(input.message);
  const mem = recall(input.conversationKey, input.contextAssistantCount ?? 0);
  const ctx = makeCtx(input.message, lang, input.user ?? null, mem.replies);
  const decision = decide({
    result: input.result,
    livePrice: input.livePrice,
    marketClosed: input.marketClosed,
    riskScore: input.riskScore,
    horizon: detectHorizon(input.message),
    ...(input.now ? { now: input.now } : {}),
  });

  const planSig = decision.plan
    ? `${decision.action}|${money(decision.plan.entry)}|${money(decision.plan.stopLoss)}`
    : `${decision.action}|${decision.lean}|${decision.conviction}`;
  ctx.repeat = intent === "VERDICT" && mem.replies > 0 && mem.sig === planSig;

  let text: string;
  switch (intent) {
    case "NEWS":
      text = newsCard(decision, lang);
      break;
    case "PRICE":
      text = priceCard(decision, input, lang);
      break;
    case "BRIEF":
      text = briefCard(decision, lang);
      break;
    case "HISTORY":
      text = historyCard(decision, input, lang);
      break;
    case "MOVE_WHY":
      text = moveWhyCard(decision, input, lang);
      break;
    case "PRICE_CHECK":
      text = priceCheckCard(decision, input, lang);
      break;
    case "DISTRESS":
    case "INJECTION":
    case "GUARANTEE":
    case "SAVINGS":
    case "ACCOUNT":
    case "TRACK_RECORD":
    case "CAPABILITIES":
    case "UNAVAILABLE": {
      const fixed = composeStaticReply(input.message);
      text = fixed
        ? intent === "GUARANTEE"
          ? `${fixed.text}\n\n${certaintyNote(decision, lang)}`
          : fixed.text
        : briefCard(decision, lang);
      break;
    }
    case "RISK_CALC":
      text = riskCard(decision, input, lang);
      break;
    case "HIGH_LOW":
      text = highLowCard(decision, input, lang);
      break;
    case "SESSION":
      text = sessionCard(decision, input, lang);
      break;
    case "LEVELS":
      text = levelsCard(decision, input, lang);
      break;
    case "TIMEFRAMES": {
      text = timeframesCard(decision, input, lang);
      if (/higher|htf|bade/i.test(input.message)) {
        const asked: Dir = /bearish|neeche|sell|down/i.test(input.message) ? "DOWN" : "UP";
        const d1 = decision.reads.D1.dir;
        const h4 = decision.reads.H4.dir;
        const answer =
          d1 === h4 && d1 !== "FLAT"
            ? d1 === asked
              ? t(lang, `Yes ✅ D1 and H4 are both ${dirWord(d1)}.`, `Haan ✅ D1 aur H4 dono ${dirWord(d1)} hain.`)
              : t(lang, `No ❌ D1 and H4 are both ${dirWord(d1)}, the opposite of what you're asking.`, `Nahi ❌ D1 aur H4 dono ${dirWord(d1)} hain, aapke sawaal ke ulta.`)
            : t(lang, `Not cleanly ⚠️ D1 is ${dirWord(d1)} and H4 is ${dirWord(h4)}, so the higher timeframes disagree.`, `Saaf nahi ⚠️ D1 ${dirWord(d1)} aur H4 ${dirWord(h4)} hai, bade timeframe ek mat nahi.`);
        const lowered = answer.charAt(0).toLowerCase() + answer.slice(1);
        text = `${ctx.n}${ctx.n ? lowered : answer}\n\n${text}`;
      }
      break;
    }
    case "INDICATOR":
      text = indicatorCard(decision, input, lang);
      break;
    case "HOLD_EXIT":
      text = holdExitCard(decision, input, lang, ctx);
      break;
    case "WHERE_BUY":
      text = whereCard("BUY", decision, input, lang, ctx);
      break;
    case "WHERE_SELL":
      text = whereCard("SELL", decision, input, lang, ctx);
      break;
    case "DIRECTION":
      text = directionCard(decision, input, lang, ctx);
      break;
    default:
      text = verdictCard(decision, input, lang, ctx);
  }

  /* Appreciate or push back on the side the user is proposing. */
  const proposed: Side | null =
    intent === "WHERE_BUY" ? "BUY" : intent === "WHERE_SELL" ? "SELL" : intent === "VERDICT" || intent === "PRICE_CHECK" ? userStance(input.message) : null;
  if (proposed) {
    const stance = stanceLine(proposed, decision, ctx);
    if (stance) {
      const alt = ctx.repeat ? null : altPlanLine(proposed, decision, ctx);
      text = `${stance}${alt ? `\n${alt}` : ""}\n\n${text}`;
    }
  }

  const rememberSig = intent === "VERDICT" || intent === "WHERE_BUY" || intent === "WHERE_SELL" ? planSig : null;
  remember(input.conversationKey, mem, rememberSig);

  return { intent, decision, text };
}
