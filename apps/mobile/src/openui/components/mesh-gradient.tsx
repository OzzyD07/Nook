import { MeshGradientView } from 'expo-mesh-gradient';
import { StyleSheet } from 'react-native';

/** Grid points for 4 (2x2), 6 (3x2) or 9 (3x3) colors, row by row. */
function grid(count: number): { columns: number; rows: number; points: number[][] } {
  const columns = count === 4 ? 2 : 3;
  const rows = count / columns;
  const points: number[][] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) points.push([column / (columns - 1), row / (rows - 1)]);
  }
  return { columns, rows, points };
}

export function MeshBackground({ colors }: { colors: string[] }) {
  const { columns, rows, points } = grid(colors.length);
  return <MeshGradientView style={StyleSheet.absoluteFill} columns={columns} rows={rows} colors={colors} points={points} />;
}
