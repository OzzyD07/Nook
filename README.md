<div align="center">

# Nook

### A personal dashboard that your own AI builds.

Tell your AI assistant what you want to see. It designs the cards, fills them with data and keeps them fresh.
Nook renders everything natively, syncs in real time and works offline.

![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-iOS%20%7C%20Android%20%7C%20Web-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?logo=firebase&logoColor=black)
![MCP](https://img.shields.io/badge/MCP-remote%20server-6E56CF)
![Self-hosted](https://img.shields.io/badge/self--hosted-your%20data%2C%20your%20keys-2EA44F)

</div>

---

## Why Nook?

Most dashboards ask you to configure widgets by hand. Nook has **no AI built in and no hosted backend**. It is a small, self-hosted app plus a remote [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server. You connect the assistant you already use (Claude, ChatGPT, Gemini or any MCP client), say what you want ("my week at a glance", "a reading tracker", "today's market summary") and the assistant creates, updates and schedules the cards for you.

- **You own everything.** Your Firebase project, your Cloudflare Worker, your AI account. Nothing is shared with a third party.
- **No model keys in the app.** The AI runs in the host you already use.
- **Native and offline.** Cards render with native components and stay available without a connection.

## Features

| | |
|---|---|
| **Bring your own AI** | Any MCP client over HTTP with OAuth (Dynamic Client Registration and Client ID Metadata Documents). |
| **Native rendering** | Cards are written in a restricted [OpenUI Lang](https://www.openui.com) subset and drawn with native components, not a web view. |
| **Rich styling** | Preset themes, gradient, mesh and photo backgrounds, glass surfaces, bundled fonts, rings, gauges and heatmaps. |
| **Full-screen detail pages** | Complete HTML documents in a sandboxed web view with a strict Content-Security-Policy, sub-pages (`nook.openPage`) and optional in-card AI chat (`nook.ai.chat`) with the user's own key. |
| **Interactive state** | Checklist ticks, notes, choices and ratings made in the app are readable by the AI on its next refresh. |
| **Scheduled refreshes** | The AI schedules updates in its own scheduler and registers them; the app shows the schedule and flags cards that went stale. |
| **Design lock** | Lock a card's design so automated refreshes only change its data. |
| **Safe by construction** | One validator runs on the Worker before storing and on the device before rendering. Writes are versioned, idempotent and audited. |

## How it works

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

1. You sign in to the app and connect your AI to the Worker's `/mcp` address.
2. The AI calls MCP tools to create and update cards. Every document is validated and versioned before it is stored.
3. The app subscribes to Firestore and renders the cards natively, with an offline cache.
4. Your interactions (ticks, notes, ratings) are written back so the AI can use them next time.

### MCP tools

`get_ui_capabilities` · `get_dashboard` · `get_card` · `create_card` · `update_card` · `update_card_content` · `update_card_state` · `move_card` · `resize_card` · `delete_card` · `lock_card_design` · `register_automation` · `validate_ui`

## Quick start

**Requirements:** Node.js 20+, a Firebase project and a Cloudflare account. The free tiers are enough for personal use.

```bash
git clone https://github.com/OzzyD07/Nook.git
cd Nook
npm install
```

Nook is self-hosted, so a few files hold *your* personal values. They are git-ignored; start from the provided templates:

| Template | Copy to | Contains |
|---|---|---|
| `apps/mcp-server/wrangler.jsonc.example` | `apps/mcp-server/wrangler.jsonc` | Worker name, KV namespace id, Firebase project id and web API key |
| `apps/mcp-server/.dev.vars.example` | `apps/mcp-server/.dev.vars` | Local development secrets |
| `apps/mobile/app.json.example` | `apps/mobile/app.json` | App name, bundle identifier, EAS project id |
| `apps/mobile/.env.example` | `apps/mobile/.env` | Firebase web config and Worker URL |

Then follow the step-by-step guide in **[docs/SETUP.md](docs/SETUP.md)**: create the Firebase project, deploy the Worker, build the app and connect your AI.

## Repository layout

An npm-workspaces monorepo.

| Path | Description |
|---|---|
| [`apps/mobile`](apps/mobile) | Expo (SDK 57) app: dashboard, card detail, settings |
| [`apps/mcp-server`](apps/mcp-server) | Cloudflare Worker: remote MCP server, OAuth, Firestore access |
| [`packages/shared`](packages/shared) | Card model, tool input schemas, grid packing, stale detection |
| [`packages/openui-library`](packages/openui-library) | OpenUI component libraries (card and detail), validator, AI reference |
| [`firebase`](firebase) | Firestore security rules and indexes |
| [`docs`](docs) | Setup guide |

## Development

```bash
npm test                          # vitest: shared, openui-library, mcp-server
npm run typecheck                 # TypeScript across all workspaces
npm run lint                      # expo lint for the app
npm run web -w nook-mobile        # run the app in the browser
npm run dev -w @nook/mcp-server   # run the Worker locally
```

In development builds, the `/gallery` route previews every reference card.

## Security and privacy

- Secrets (`.dev.vars`, service-account files, `.env*`, your personal `wrangler.jsonc` and `app.json`) are git-ignored. Only `*.example` templates are committed.
- Card content is limited to a whitelist of components with literal arguments and validated on both server and device.
- Detail pages run in a sandboxed web view; network access is restricted by Content-Security-Policy.
- Set `ALLOWED_UIDS` on the Worker so only your account can connect an AI to it (see the setup guide).
- Users' AI keys are stored encrypted by the Worker and calls are rate limited per day.

## Contributing

Issues and pull requests are welcome. Please run `npm run lint`, `npm run typecheck` and `npm test` before opening a PR.

## License

Released under the [MIT License](LICENSE).
