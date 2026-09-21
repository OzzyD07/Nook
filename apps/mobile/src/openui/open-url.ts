import { isHttpsUrl } from '@nook/shared';
import { openBrowserAsync } from 'expo-web-browser';

/** Opens AI-supplied links; anything but https is ignored (the validator already rejects it). */
export function openUrl(url: unknown): void {
  if (typeof url !== 'string' || !isHttpsUrl(url)) return;
  openBrowserAsync(url).catch(() => undefined);
}
