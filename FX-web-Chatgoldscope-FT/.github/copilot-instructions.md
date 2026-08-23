# GitHub Copilot Instructions — GoldScope AI Frontend

## Product context
GoldScope AI is a premium, mobile-first XAU/USD-only trading decision-support application. It is not a signal group, broker, execution platform, or guaranteed prediction product. The frontend contains three surfaces:
1. Public SEO website
2. Authenticated user trading application
3. Internal admin dashboard

## Engineering standards
- Use Next.js App Router and strict TypeScript.
- Use functional React components and hooks only.
- Never use `any`, `@ts-ignore`, inline anonymous style objects, dead code, or console logging.
- Keep Server Components as the default. Add `"use client"` only to the smallest interactive boundary.
- Never place live API keys, OpenAI keys, market-data credentials, or secrets in frontend code.
- Do not call third-party market-data APIs directly from the browser. Call our backend API.
- Use central design tokens from `src/app/globals.css`; do not add random colors or spacing values.
- Reuse components from atoms, molecules, organisms, and templates before creating duplicates.
- Keep feature-specific code under `src/features/<feature>`.
- Use TanStack Query for server state and Zustand only for small transient UI state.
- Validate forms and external responses with Zod.
- Ensure all user-facing loading, empty, error, stale-data, offline and permission states are designed.

## SEO rules
- Public pages must remain server-rendered or statically generated wherever possible.
- Every public page needs unique metadata, canonical URL, semantic headings and useful visible copy.
- `/app` and `/admin` must not be indexed.
- Never load dashboard, chart or admin JavaScript on public marketing pages unless required.
- Use `next/image` for production imagery and provide dimensions and alt text.

## Performance rules
- Dynamically import heavy chart and screenshot tools.
- Do not subscribe the whole React tree to every market tick.
- Update chart series directly or through narrow stores/selectors.
- Paginate conversation history and long message threads.
- Avoid large UI kits, animation libraries, and globally imported icon packs.
- Preserve Core Web Vitals targets: LCP < 2.5 s, INP < 200 ms, CLS < 0.1.

## Trading UX and safety rules
- Never present guaranteed direction, guaranteed profit, win-rate claims, or certainty percentages without validated backend evidence.
- Avoid strong BUY/SELL buttons and casino-style red/green visual treatment.
- Use labels such as “Bullish conditions”, “Bearish conditions”, “Wait for confirmation”, “Elevated risk”, and “Setup invalidated”.
- Every market analysis UI must show provider, market-data timestamp and stale status.
- Clearly distinguish confirmed facts, interpretation, scenarios, missing information and risk warnings.
- If data is stale or unavailable, disable current-market analysis and show an explicit error.
- Screenshot-extracted values must be editable and confirmed before final position analysis.
- Do not calculate position risk in presentation components. Display verified backend calculations.

## Component rules
- Atoms: generic primitives only.
- Molecules: small combinations such as MarketPrice or StatusIndicator.
- Organisms: complete interface sections such as ChatComposer or MarketContextPanel.
- Templates: page shells and large layouts.
- UI components must not contain business rules or API orchestration.
- Prefer named exports.
- Add accessible labels, keyboard support and visible focus states.

## API integration contract
- Base URL comes from `NEXT_PUBLIC_API_BASE_URL` only for the public backend origin; secrets remain server-side.
- Create typed service functions under feature folders or `src/lib/api`.
- Handle `loading`, `success`, `empty`, `error`, `stale`, and `unauthorized` states explicitly.
- Never invent fallback market prices. Mock data must be clearly labeled as demo data.

## File creation checklist
Before completing a change:
1. TypeScript compiles without errors.
2. No unused imports or variables.
3. Mobile and desktop layouts are considered.
4. Accessibility labels and focus states exist.
5. Public SEO rendering is preserved.
6. Trading safety language is preserved.
7. No secrets or real user chat content are logged.
