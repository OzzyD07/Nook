import { ICONS, type IconName } from '@nook/openui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

type SymbolNames = Exclude<SymbolViewProps['name'], string>;
type IosSymbol = NonNullable<SymbolNames['ios']>;
type MaterialSymbol = NonNullable<SymbolNames['android']>;

// Type-checks every curated icon against the real SF Symbol / Material Symbol name lists.
const SYMBOLS: Record<IconName, { ios: IosSymbol; material: MaterialSymbol }> = ICONS;

export function AppIcon({
  name,
  size = 20,
  color,
  style,
}: {
  name: IconName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  const symbol = SYMBOLS[name];
  return (
    <SymbolView
      name={{ ios: symbol.ios, android: symbol.material, web: symbol.material }}
      size={size}
      tintColor={color}
      style={style}
    />
  );
}
