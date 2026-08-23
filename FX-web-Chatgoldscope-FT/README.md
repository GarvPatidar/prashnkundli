# GoldScope AI Frontend

Production-oriented frontend starter for an XAU/USD-only AI trading copilot.

## Included
- SEO-ready public website using Next.js App Router
- Authenticated trading application shell
- Chat demo with structured analysis cards
- Market status strip with explicitly labelled mock data
- Admin dashboard shell
- Robots and sitemap routes
- Strict TypeScript setup
- Shared design tokens and component architecture
- GitHub Copilot project instructions

## Run locally
```bash
npm install
cp .env.example .env.local
npm run dev
```
Open `http://localhost:3000`.

## Important URLs
- `/` public website
- `/app/chat` trading application demo
- `/admin` admin dashboard demo

## Before production
1. Replace `https://example.com` in metadata, robots and sitemap.
2. Connect authentication and backend API.
3. Replace mock quote and analysis modules.
4. Add private screenshot storage flow.
5. Add market-data freshness and WebSocket states.
6. Add legal text approved for target countries.
7. Pin dependency versions after the first successful install and commit the lockfile.

## Architecture
```text
src/app/(marketing)  Public SEO pages
src/app/app          Authenticated user app
src/app/admin        Internal admin
src/components       Shared component hierarchy
src/features         Domain feature modules
src/lib              Shared utilities and temporary mock data
src/types            Shared TypeScript contracts
```

## Copilot
Repository-wide instructions are available at `.github/copilot-instructions.md`. GitHub Copilot should read them automatically in supported IDEs.
