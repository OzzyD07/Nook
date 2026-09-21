// EXPO_PUBLIC_* values are inlined at build time and must be read with dot access.
export const env = {
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  },
  /** Base URL of the Cloudflare Worker, e.g. https://nook-mcp.<account>.workers.dev */
  mcpBaseUrl: (process.env.EXPO_PUBLIC_MCP_BASE_URL ?? '').replace(/\/+$/, ''),
};

export const isFirebaseConfigured = Boolean(env.firebase.apiKey && env.firebase.projectId);
