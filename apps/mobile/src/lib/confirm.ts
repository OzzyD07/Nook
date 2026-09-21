import { Alert } from 'react-native';

import { strings } from '@/constants/strings';

export function confirmAsync(title: string, message: string, confirmLabel: string = strings.common.confirm): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: strings.common.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function showError(error: unknown): void {
  Alert.alert(strings.common.error, error instanceof Error ? error.message : String(error));
}
