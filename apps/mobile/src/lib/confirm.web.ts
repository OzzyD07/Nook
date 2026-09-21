import { strings } from '@/constants/strings';

// react-native-web's Alert has no buttons, so fall back to the browser dialogs.
export function confirmAsync(title: string, message: string): Promise<boolean> {
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
}

export function showError(error: unknown): void {
  window.alert(`${strings.common.error}\n\n${error instanceof Error ? error.message : String(error)}`);
}
