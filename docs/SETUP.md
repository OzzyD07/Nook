# Setup

Nook needs three things you own: a Firebase project (auth + data), a Cloudflare Worker (the MCP server your AI connects to) and a development build of the app. Everything fits in the free tiers for personal use.

All commands run from the repository root unless noted. Set `OPENUI_TELEMETRY_DISABLED=1` in your shell before `npm install` to turn off the install-time telemetry of `@openuidev/lang-core`.

## 1. Firebase

1. Create a project at <https://console.firebase.google.com>.
2. **Authentication → Sign-in method**: enable **Email/Password**.
3. **Firestore Database → Create database** (production mode, pick a region close to you).
4. **Project settings → Your apps → Add app → Web**. Copy the config values into `apps/mobile/.env` (start from `apps/mobile/.env.example`).
5. Deploy the security rules, the index and the idempotency TTL policy:

   ```bash
   cd firebase && npx firebase-tools deploy --only firestore --project <your-project-id>
   ```

6. **Service account for the Worker**: Google Cloud console → IAM & Admin → Service Accounts → create `nook-mcp` with the role **Cloud Datastore User**, then *Keys → Add key → JSON*. Keep the file out of the repository (`*service-account*.json` is git-ignored); you only need its contents in step 2.

## 2. Cloudflare Worker (MCP server)

```bash
cd apps/mcp-server
npx wrangler login
npx wrangler kv namespace create OAUTH_KV
```

Edit `apps/mcp-server/wrangler.jsonc`:

- `kv_namespaces[0].id`: the id printed by the command above.
- `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`: from the Firebase web config.
- `PUBLIC_BASE_URL`: leave empty for `*.workers.dev`, or set your custom domain (e.g. `https://mcp.example.com`).

Set the secrets:

```bash
npx wrangler secret put GCP_SA_JSON        # paste the whole service account JSON on one line
npx wrangler secret put STATE_SIGNING_KEY  # any long random string
npx wrangler secret put ALLOWED_UIDS       # optional: your Firebase uid(s), comma separated
npx wrangler deploy
```

The deploy prints the Worker URL, e.g. `https://nook-mcp.<account>.workers.dev`. Put it (without `/mcp`) into `EXPO_PUBLIC_MCP_BASE_URL` in `apps/mobile/.env`.

`ALLOWED_UIDS` is strongly recommended: without it, anyone who can create an account in your Firebase project could connect an AI to their own (separate) dashboard on your Worker. Find your uid in Firebase console → Authentication after signing up in the app.

For local development copy `.dev.vars.example` to `.dev.vars` and run `npm run dev -w @nook/mcp-server`.

## 3. The app

The app uses Firebase's JS SDK, so it also runs on the web for quick checks:

```bash
npm run web -w nook-mobile
```

Phones need a development build (Expo Go is not required):

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android   # or ios
```

Then `npx expo start` in `apps/mobile` and open the dev build. Sign up with email and password; this is also the account you sign in with when an AI connects.

## 4. Connect an AI

The MCP server address is `<Worker URL>/mcp` (also shown in the app under **Settings → MCP Connection**). Hosts discover OAuth automatically (Dynamic Client Registration and Client ID Metadata Documents are both enabled). When the host opens the Nook sign-in page, sign in with your Nook account and choose whether the AI may delete cards.

| Host | Where |
|---|---|
| Claude (web, desktop, mobile, Cowork) | Settings → Connectors → Add custom connector |
| ChatGPT | Settings → Apps → Advanced → Developer mode → Create app (write tools depend on your plan) |
| Gemini app | Custom apps / MCP, where available for your account and region |
| Claude Code, Antigravity and other CLIs | Add an HTTP MCP server with the URL; OAuth runs in the browser |

Scheduled refreshes run in the AI host (for example Claude Cowork scheduled tasks or Claude Code routines). Ask the AI to create the card, schedule the refresh in its own scheduler and call `register_automation`, so the app can show the schedule and flag the card when updates stop.

Revoke a connection any time in **Settings → AI Connections**.

## Updating

After pulling changes, redeploy whatever changed:

- `firebase/firestore.rules` or indexes: `cd firebase && npx firebase-tools deploy --only firestore --project <your-project-id>`
- `apps/mcp-server` or `packages/*`: `cd apps/mcp-server && npx wrangler deploy`
- The app: preview and production builds contain the JavaScript, so any app change needs a new `eas build`. A development build only needs `npx expo start` restarted, unless native config (icons, plugins, packages with native code) changed.

## Free tier notes

- Workers: 100k requests/day, 10 ms CPU per request. Card validation stays well under that for typical documents.
- Workers KV (OAuth tokens): 1,000 writes/day. Each sign-in and token refresh writes to KV.
- Firestore: 50k reads / 20k writes per day.
