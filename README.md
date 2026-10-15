<div align="center">

# Nook

**A personal dashboard that your own AI builds.**

Tell your AI assistant what you want to see. It creates and refreshes the cards. Nook renders them natively and keeps them available offline.

![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-iOS%20%7C%20Android%20%7C%20Web-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?logo=firebase&logoColor=black)
![MCP](https://img.shields.io/badge/MCP-remote%20server-6E56CF)

</div>

---

## What is Nook?

Nook is a mobile dashboard with **no AI built in**. Instead, it exposes a remote [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server. You connect the assistant you already use (Claude, ChatGPT, Gemini, or any MCP-capable client), describe the card you want ("my week at a glance", "a reading tracker", "today's market summary"), and the assistant creates, updates and schedules it for you.

The app renders every card natively, syncs in real time, and works offline from a local cache.

## Highlights

- **Bring your own AI.** Works with any MCP client over HTTP with OAuth. No model keys are bundled in the app.
- **Native rendering.** Cards are written in a restricted [OpenUI Lang](https://www.openui.com) subset and rendered with native components, not a web view.
- **Rich styling.** Preset themes, gradient, mesh and photo backgrounds, glass surfaces, bundled fonts, rings, gauges and heatmaps.
- **Full-screen detail pages.** Complete HTML documents in a sandboxed web view with a strict Content-Security-Policy, sub-pages (`nook.openPage`) and optional in-card AI chat (`nook.ai.chat`) using the user's own key.
- **Safe by construction.** The same validator runs on the Worker before anything is stored and on the device before anything is rendered. Writes are versioned, idempotent and audited.
- **Interactive state.** Checklists, notes, choices and ratings entered in the app are readable by the AI on its next refresh.
- **Scheduled refreshes.** The AI schedules updates in its own scheduler and registers them, so the app can show the schedule and flag cards that have gone stale.
- **Design lock.** Lock a card's design so automated refreshes only change its data.
- **Offline first.** Realtime Firestore sync with a persistent local cache.

## Architecture

```
AI host (Claude / ChatGPT / Gemini / any MCP client)
   │  MCP over HTTP + OAuth
   ▼
Cloudflare Worker ── validates OpenUI, versions, idempotency, audit
   │  Firestore REST
   ▼
Firebase (Auth + Firestore)
   │  realtime
   ▼
Expo app ── native OpenUI renderer, offline cache
```

## Repository layout

This is an npm-workspaces monorepo.

| Path | Description |
|---|---|
| [`apps/mobile`](apps/mobile) | Expo (SDK 57) app: dashboard, card detail, settings |
| [`apps/mcp-server`](apps/mcp-server) | Cloudflare Worker: remote MCP server, OAuth, Firestore access |
| [`packages/shared`](packages/shared) | Card model, tool input schemas, grid packing, stale detection |
| [`packages/openui-library`](packages/openui-library) | OpenUI component libraries (card + detail), validator, AI reference |
| [`firebase`](firebase) | Firestore security rules and indexes |
| [`docs/SETUP.md`](docs/SETUP.md) | Firebase, Cloudflare and app setup guide |

## MCP tools

The Worker exposes tools the AI uses to manage the dashboard:

`get_ui_capabilities` · `get_dashboard` · `get_card` · `create_card` · `update_card` · `update_card_content` · `update_card_state` · `move_card` · `resize_card` · `delete_card` · `lock_card_design` · `register_automation` · `validate_ui`

## Getting started

**Requirements:** Node.js 20+, a Firebase project, and a Cloudflare account (free tiers are enough).

```bash
git clone https://github.com/OzzyD07/Nook.git
cd Nook
npm install
```

Then follow [docs/SETUP.md](docs/SETUP.md) to create the Firebase project, deploy the Worker, configure the app and connect your AI.

### Common commands

```bash
npm test                          # vitest: shared, openui-library, mcp-server
npm run typecheck                 # TypeScript across all workspaces
npm run lint                      # expo lint for the app
npm run web -w nook-mobile        # run the app in the browser
npm run dev -w @nook/mcp-server   # run the Worker locally
```

In development builds, the `/gallery` route previews every reference card.

## Connecting an AI

| Client | Where to add it |
|---|---|
| Claude (web, desktop, mobile) | Settings → Connectors → Add custom connector |
| ChatGPT | Settings → Apps → Advanced → Developer mode → Create app |
| Claude Code and other CLIs | Add an HTTP MCP server with your Worker URL |

Use the Worker URL shown in the app under Settings. OAuth completes in the browser.

## Security

- Secrets (`.dev.vars`, service-account files, `.env*`) are git-ignored; only `*.example` templates are committed.
- Card content is restricted to a whitelist of components with literal arguments and validated on both server and device.
- Detail pages run in a sandboxed web view; network access is limited by Content-Security-Policy.
- AI keys entered by users are stored encrypted on the Worker side.

## Contributing

Issues and pull requests are welcome. Please run `npm run lint`, `npm run typecheck` and `npm test` before opening a PR.

## License

Released under the terms in [LICENSE](LICENSE).
