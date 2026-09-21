# Nook

A personal dashboard that your own AI builds. Nook has no AI inside: you tell Claude, ChatGPT or Gemini what you want to see, and it creates and refreshes cards through Nook's MCP server. The app renders those cards natively and keeps them available offline.

```
AI host (Claude / ChatGPT / Gemini)
   │  MCP + OAuth
   ▼
Cloudflare Worker ── validates OpenUI, versions, idempotency, audit
   │  Firestore REST
   ▼
Firebase (Auth + Firestore)
   │  realtime
   ▼
Expo app ── native OpenUI renderer, offline cache
```

## Repository

| Path | What |
|---|---|
| `apps/mobile` | Expo (SDK 57) app: dashboard, card detail, settings |
| `apps/mcp-server` | Cloudflare Worker: remote MCP server, OAuth, Firestore access |
| `packages/shared` | Card model, tool input schemas, grid packing, stale detection |
| `packages/openui-library` | OpenUI component libraries (card + detail), validator, AI reference |
| `firebase` | Firestore security rules and indexes |
| `docs/SETUP.md` | Firebase, Cloudflare and app setup |

Cards are [OpenUI Lang](https://www.openui.com) documents limited to a static subset: only whitelisted components with literal arguments. The same validator runs on the Worker before anything is stored and on the device before anything is rendered.

## Development

```bash
npm install            # with OPENUI_TELEMETRY_DISABLED=1 set
npm test               # vitest: shared, openui, mcp-server
npm run typecheck
npm run lint           # expo lint for the app
npm run web -w nook-mobile
npm run dev -w @nook/mcp-server
```

See [docs/SETUP.md](docs/SETUP.md) to create the Firebase project, deploy the Worker and connect an AI.
