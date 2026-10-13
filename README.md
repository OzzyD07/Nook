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

Cards can be styled freely within that subset: preset themes, gradient, mesh and photo backgrounds, glass surfaces, bundled fonts, rings, gauges and heatmaps. Detail pages are preferably complete HTML documents (`<!doctype html>`), rendered full screen in a sandboxed web view with a Content-Security-Policy that blocks network access except images, fonts and libraries from a few public CDNs. They can open sub-pages of the same card (`nook.openPage`) and, with the user's own Gemini API key set in Settings → Card AI, call a model through the Worker (`nook.ai.chat`). In development builds, `/gallery` previews every reference card.

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
