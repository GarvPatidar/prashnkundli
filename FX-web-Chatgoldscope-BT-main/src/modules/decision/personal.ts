import type { Decision } from "./decision.service.js";

/**
 * Personal layer for composed replies: the user's name and trading profile,
 * deterministic phrase variation, and a stance check that appreciates or
 * pushes back on what the user proposes. Pure helpers, no market data here.
 */

export type Lang = "en" | "hi";
export type Side = "BUY" | "SELL";

export interface UserContext {
  name: string | null;
  experience: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null;
  style: "SCALPING" | "INTRADAY" | "SWING" | null;
  risk: "LOW" | "MEDIUM" | "HIGH" | null;
}

export interface ReplyCtx {
  /** Always the user's first name when known (used for stance lines). */
  name: string | null;
  /** "Garv, " on some replies only, so it does not feel robotic. */
  n: string;
  seed: number;
  replies: number;
  user: UserContext | null;
  lang: Lang;
  /** True when the same plan was already given in this conversation. */
  repeat: boolean;
}

const money = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(2));

/* ------------------------------- variation ------------------------------- */

export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeSeed(message: string, replies: number): number {
  const key = message.toLowerCase().replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ").trim();
  return hashString(`${key}|${replies}`);
}

export function pick<T>(list: readonly T[], seed: number, slot = 0): T {
  return list[hashString(`${seed}:${slot}`) % list.length]!;
}

/* ------------------------------- user memory ----------------------------- */

interface Memory {
  replies: number;
  sig: string | null;
  at: number;
}

const MEMORY_TTL_MS = 6 * 60 * 60_000;
const MEMORY_MAX = 500;
const memory = new Map<string, Memory>();

export function recall(key: string | null | undefined, contextAssistantCount: number): Memory {
  const stored = key ? memory.get(key) : undefined;
  const fresh = stored && Date.now() - stored.at < MEMORY_TTL_MS ? stored : null;
  return {
    replies: Math.max(fresh?.replies ?? 0, contextAssistantCount),
    sig: fresh?.sig ?? null,
    at: Date.now(),
  };
}

export function remember(key: string | null | undefined, previous: Memory, sig: string | null): void {
  if (!key) return;
  if (memory.size >= MEMORY_MAX) {
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
  memory.set(key, { replies: previous.replies + 1, sig: sig ?? previous.sig, at: Date.now() });
}

export function firstName(full: string | null | undefined): string | null {
  if (!full) return null;
  const token = full.trim().split(/\s+/)[0] ?? "";
  const clean = token.replace(/[^\p{L}'-]/gu, "");
  if (clean.length < 2 || clean.length > 20) return null;
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

export function makeCtx(
  message: string,
  lang: Lang,
  user: UserContext | null,
  replies: number,
): ReplyCtx {
  const name = firstName(user?.name ?? null);
  const address = replies === 0 || replies % 3 === 0;
  return {
    name,
    n: name && address ? `${name}, ` : "",
    seed: makeSeed(message, replies),
    replies,
    user,
    lang,
    repeat: false,
  };
}

/* ------------------------------ message cues ----------------------------- */

/** Side the user is proposing ("should I buy", "best entry for a short"). */
export function userStance(message: string): Side | null {
  const m = message.toLowerCase();
  const buy = /\b(buy|buying|long|kharid\w*)\b/.test(m);
  const sell = /\b(sell|selling|short|bech\w*)\b/.test(m);
  if (buy === sell) return null;
  return buy ? "BUY" : "SELL";
}

/** Side of a trade the user already holds. */
export function positionSide(message: string): Side | null {
  const m = message.toLowerCase();
  const buy =
    /\b(i bought|bought|holding (a )?(buy|long)|my (buy|long)|i am long|i'?m long|long position|buy (from|at|position|trade)|in a buy|on a buy|kharida)\b/.test(m);
  const sell =
    /\b(i sold|sold|holding (a )?(sell|short)|my (sell|short)|i am short|i'?m short|short position|sell (from|at|position|trade)|in a sell|on a sell|bech diya)\b/.test(m);
  if (buy === sell) return null;
  return buy ? "BUY" : "SELL";
}

const leanSide = (d: Decision): Side | null =>
  d.lean === "UP" ? "BUY" : d.lean === "DOWN" ? "SELL" : null;

export const dirIcon = (dir: string): string => (dir === "UP" ? "🟢" : dir === "DOWN" ? "🔴" : "⚪");
export const tfStrip = (d: Decision): string =>
  (["D1", "H4", "H1", "M15"] as const).map((tf) => `${tf} ${dirIcon(d.reads[tf].dir)}`).join(" · ");

const dirWord = (dir: string, lang: Lang): string =>
  dir === "UP" ? (lang === "hi" ? "bullish" : "bullish") : dir === "DOWN" ? "bearish" : "flat";

/* ------------------------------ stance lines ----------------------------- */

/**
 * Appreciates the user's idea when it matches the data and pushes back when
 * it does not. Returns null when there is nothing honest to say.
 */
export function stanceLine(side: Side, d: Decision, ctx: ReplyCtx): string | null {
  if (d.marketClosed) return null;
  const { lang, seed } = ctx;
  const nm = ctx.name ? `${ctx.name}, ` : "";
  const sideWord = side === "BUY" ? "buy" : "sell";
  const lean = leanSide(d);
  const htf = dirWord(d.htfDir, lang);

  if (lean === null) {
    return lang === "hi"
      ? `${nm}${sideWord} ka idea samajh aata hai, par abhi dono taraf clean edge nahi hai ⚖️ — jaldbaazi se behtar wait.`
      : `${nm}I get the ${sideWord} idea, but neither side has a clean edge right now ⚖️ — patience beats forcing it.`;
  }

  if (lean === side && d.action === side) {
    const timing =
      d.entryState === "NOW"
        ? lang === "hi" ? "setup ready hai." : "the setup is ready."
        : lang === "hi" ? "bas chase mat karna, pullback ka wait karo." : "just don't chase; wait for the pullback.";
    return pick(
      lang === "hi"
        ? [
            `${nm}achha read 👍 aapka ${sideWord} idea bade timeframe ke saath match karta hai, ${timing}`,
            `${nm}shabaash 👏 aap sahi side soch rahe ho (${htf} bade timeframe). ${timing}`,
            `${nm}aapki soch data se match karti hai ✅ ${sideWord} side bhaari hai, ${timing}`,
          ]
        : [
            `${nm}good read 👍 your ${sideWord} idea lines up with the higher timeframes; ${timing}`,
            `${nm}nice, you're on the right side ✅ the bigger picture is ${htf}. ${timing}`,
            `${nm}that matches what the data shows 👏 ${sideWord} has the edge; ${timing}`,
          ],
      seed,
      11,
    );
  }

  if (lean === side) {
    return lang === "hi"
      ? `${nm}direction sahi soch rahe ho 👍 par timing abhi theek nahi: conviction kam hai, isliye entry ka wait karo.`
      : `${nm}right direction 👍 but the timing isn't there yet: conviction is low, so wait for the entry.`;
  }

  const strong = d.htfDir !== "FLAT";
  const against = lean === "SELL" ? "bearish" : "bullish";
  return pick(
    lang === "hi"
      ? [
          `${nm}main is se agree nahi karta ❌ ${sideWord} abhi bade timeframe ke ulta hai (${against}${strong ? ", D1/H4 dono" : ""}). Fresh trade ki tarah nahi lunga.`,
          `${nm}yahan main rokunga ⚠️ ${sideWord} karna counter-trend hai, aur aise trades mein hi zyada log phasate hain. Skip karo ya size aadha rakho.`,
          `${nm}ye idea data ke against hai ❌ market ${against} lean kar raha hai. ${sideWord} tabhi sochna jab H1 palte.`,
        ]
      : [
          `${nm}I'd push back on that ❌ a ${sideWord} goes against the higher timeframes (${against}${strong ? ", D1 and H4" : ""}). I wouldn't take it as a fresh trade.`,
          `${nm}I'd stop you here ⚠️ a ${sideWord} is counter-trend, and that's where most traders get hurt. Skip it, or use half size and a quick target.`,
          `${nm}respectfully, the data disagrees ❌ the market leans ${against}. Consider a ${sideWord} only after H1 flips.`,
        ],
    seed,
    12,
  );
}

/** The plan to prefer when the user's idea is rejected. */
export function altPlanLine(side: Side, d: Decision, ctx: ReplyCtx): string | null {
  const lean = leanSide(d);
  if (!lean || lean === side) return null;
  const plan = (d.plan && d.plan.direction === lean ? d.plan : null) ?? d.plans.find((p) => p.direction === lean) ?? null;
  if (!plan) return null;
  const icon = lean === "BUY" ? "🟢" : "🔴";
  const head = ctx.lang === "hi" ? "Jo plan main lunga" : "The plan I'd prefer";
  return `${head}: ${icon} ${lean} ${money(plan.entry)} → 🛑 ${money(plan.stopLoss)} → 🎯 ${money(plan.targets[0] ?? plan.entry)}`;
}

/* ----------------------------- profile + RR note ------------------------- */

export function profileNote(d: Decision, ctx: ReplyCtx): string | null {
  const u = ctx.user;
  const hi = ctx.lang === "hi";
  const plan = d.plan;

  const rr = plan?.riskReward[0];
  if (rr !== undefined && rr < 1.5 && u?.experience !== "ADVANCED") {
    return hi
      ? `⚖️ TP1 par RR sirf 1:${rr.toFixed(2)} hai: main ise skip karunga, ya TP1 par partial lekar stop breakeven kar dunga.`
      : `⚖️ RR to TP1 is only 1:${rr.toFixed(2)}: I'd skip it, or take partial at TP1 and move the stop to breakeven.`;
  }
  if (!u) return null;
  if (u.experience === "BEGINNER" && d.action === "WAIT") {
    return hi
      ? "🌱 Beginner ke liye WAIT bhi ek proper position hai: har candle par trade zaroori nahi."
      : "🌱 For a beginner, waiting is a real position: you don't need a trade on every candle.";
  }
  if (u.risk === "LOW" && d.action !== "WAIT") {
    return hi
      ? "🛡 Aapka risk profile low hai: size chhota rakho aur stop pehle se tay rakho."
      : "🛡 Your profile says low risk: keep the size small and fix the stop before you enter.";
  }
  if (u.style === "SCALPING" && d.horizon === "INTRADAY" && d.action !== "WAIT") {
    return hi
      ? "⚡ Aap scalper ho: ye H1 based plan hai. Chhote setup ke liye 'scalp setup' bolo."
      : "⚡ You scalp: this is an H1-based plan. Ask for a 'scalp setup' for a shorter one.";
  }
  if (u.style === "SWING" && d.horizon !== "SWING") {
    return hi
      ? "📆 Aap swing style ke ho: D1/H4 lean ko zyada weight do, 'swing setup' bolo."
      : "📆 You're a swing trader: weigh the D1/H4 lean more, and ask for a 'swing setup'.";
  }
  return null;
}

/* --------------------------------- footers ------------------------------- */

export function footer(ctx: ReplyCtx, includeCalendar: boolean, calendarLine?: string | null): string[] {
  const full = ctx.replies === 0 || ctx.replies % 4 === 0;
  const hi = ctx.lang === "hi";
  const out: string[] = [];
  if (includeCalendar && calendarLine) {
    out.push(calendarLine);
  } else if (includeCalendar) {
    out.push(
      full
        ? hi
          ? "⚠️ Economic calendar abhi connected nahi hai. Trade se pehle CPI, NFP aur Fed events khud check karo."
          : "⚠️ Economic calendar is not connected yet. Check CPI, NFP and Fed events yourself before trading."
        : hi
          ? "⚠️ Calendar connected nahi: CPI/NFP/Fed khud check karo."
          : "⚠️ Calendar not connected: check CPI/NFP/Fed yourself.",
    );
  }
  out.push(
    full
      ? hi
        ? "Signals market analysis par based predictions hain, guarantee nahi. Aankh band karke follow mat karo, apna risk khud manage karo."
        : "Signals are predictions based on market analysis, not guarantees. Don't follow blindly; trade at your own risk."
      : hi
        ? "Prediction hai, guarantee nahi: apna risk khud manage karo."
        : "A prediction, not a guarantee: manage your own risk.",
  );
  return out;
}

/* ------------------------------- verdict lead ---------------------------- */

export function verdictLead(d: Decision, ctx: ReplyCtx): string {
  const { n, lang, seed } = ctx;
  if (d.blackout) {
    return lang === "hi"
      ? `${n}🟡 ${d.blackout.name} ka window chal raha hai: abhi naya trade nahi, spread aur volatility spike hoti hai`
      : `${n}🟡 ${d.blackout.name} window is live: no new trade right now, spreads and volatility spike`;
  }
  if (d.marketClosed) {
    return lang === "hi" ? `${n}🟡 Market abhi band hai: naya trade nahi, open hone ka wait karo` : `${n}🟡 The market is closed: no new trade, wait for the open`;
  }
  if (d.action === "SELL" || d.action === "BUY") {
    const red = d.action === "SELL";
    const dot = red ? "🔴" : "🟢";
    const word = d.action;
    const now = d.entryState === "NOW";
    if (lang === "hi") {
      return now
        ? pick(
            [
              `${n}${dot} ${word} — setup ready hai, entry zone mein ho`,
              `${n}${dot} mera call ${word}: price entry zone mein hai aur M15 confirm kar raha hai`,
            ],
            seed,
            1,
          )
        : pick(
            [
              `${n}${dot} seedha jawab: ${word} side, par pullback par`,
              `${n}${dot} mera call ${word} hai, sabr ke saath: price ko entry tak aane do`,
              red
                ? `${n}${dot} sellers ka paalda bhaari hai: bounce par sell, dip par nahi`
                : `${n}${dot} buyers ka paalda bhaari hai: dip par buy, rally par nahi`,
              `${n}${dot} bias ${red ? "neeche" : "upar"} ka hai: ${word.toLowerCase()} plan karo, chase mat karo`,
            ],
            seed,
            1,
          );
    }
    return now
      ? pick(
          [
            `${n}${dot} ${word}: the setup is ready, price is in the entry zone`,
            `${n}${dot} my call is ${word}: price is at the entry and M15 confirms`,
          ],
          seed,
          1,
        )
      : pick(
          [
            `${n}${dot} straight answer: ${word}, but on a pullback`,
            `${n}${dot} my call is ${word}, with patience: let price come to the entry`,
            red
              ? `${n}${dot} sellers have the edge: sell the bounce, not the dip`
              : `${n}${dot} buyers have the edge: buy the dip, not the rally`,
            `${n}${dot} bias is ${red ? "down" : "up"}: plan the ${word.toLowerCase()}, don't chase it`,
          ],
          seed,
          1,
        );
  }
  return lang === "hi"
    ? pick(
        [
          `${n}🟡 mera honest jawab: abhi wait, kisi side ka clean edge nahi hai`,
          `${n}🟡 no trade bhi ek trade hai: abhi bahar rehna behtar hai`,
          `${n}🟡 market abhi clean setup nahi de raha, sabr ka phal milega`,
        ],
        seed,
        1,
      )
    : pick(
        [
          `${n}🟡 my honest answer: wait, no side has a clean edge yet`,
          `${n}🟡 no trade is also a trade: I'd stay out for now`,
          `${n}🟡 the market isn't offering a clean setup, patience pays here`,
        ],
        seed,
        1,
      );
}
