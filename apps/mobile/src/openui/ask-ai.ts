import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';

import type { AiApp } from '@/store/preferences';

// Claude and ChatGPT accept a prepared prompt in the URL; Gemini does not, so the prompt
// is always copied as well and can be pasted.
const URLS: Record<AiApp, (prompt: string) => string> = {
  claude: (prompt) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
  chatgpt: (prompt) => `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
  gemini: () => 'https://gemini.google.com/app',
};

/** Opens the user's AI app with a prompt the card prepared. */
export async function askAi(app: AiApp, prompt: string): Promise<void> {
  await Clipboard.setStringAsync(prompt);
  await Linking.openURL(URLS[app](prompt));
}
