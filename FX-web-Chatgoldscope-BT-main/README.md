# GoldScope Backend

Standalone MVP backend scaffold for an XAU/USD-only AI trading copilot.

## Included
- Fastify + strict TypeScript
- CORS, security headers and rate limiting
- Health, market, chat, SSE chat-progress and conversation endpoints
- Mock market/calendar/AI providers that run without paid keys
- Optional OpenAI provider
- In-memory conversation repository
- Prisma/PostgreSQL production schema

## Start
```bash
cp .env.example .env
npm install
npm run dev
```
Windows PowerShell:
```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Backend: `http://localhost:4000`

## Endpoints
- `GET /v1/health`
- `GET /v1/market/snapshot`
- `POST /v1/chat`
- `POST /v1/chat/stream`
- `GET /v1/conversations`
- `GET /v1/conversations/:conversationId`
- `DELETE /v1/conversations/:conversationId`

## Chat body
```json
{
  "message": "Analyse the current XAU/USD market",
  "conversationId": null,
  "position": null,
  "attachment": null,
  "traderProfile": {"experience":"beginner","tradingStyle":"intraday"}
}
```

The default providers are mocks. Switch providers through `.env` only after their real adapters and licences are configured.
