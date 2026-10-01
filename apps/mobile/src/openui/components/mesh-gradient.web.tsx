import { StyleSheet, View } from 'react-native';

/**
 * expo-mesh-gradient has no web implementation; layered radial gradients from the
 * corners give a similar soft blend.
 */
export function MeshBackground({ colors }: { colors: string[] }) {
  const columns = colors.length === 4 ? 2 : 3;
  const rows = colors.length / columns;
  const layers = colors.map((color, index) => {
    const x = ((index % columns) / (columns - 1)) * 100;
    const y = (Math.floor(index / columns) / (rows - 1)) * 100;
    return `radial-gradient(circle at ${x}% ${y}%, ${color} 0%, transparent 70%)`;
  });
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        // backgroundImage is web-only; react-native-web passes it through to CSS.
        { backgroundColor: colors[Math.floor(colors.length / 2)], backgroundImage: layers.join(', ') } as object,
      ]}
    />
  );
}
