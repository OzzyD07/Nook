import { GRID } from './limits';

export interface GridItem {
  id: string;
  columnSpan: number;
  rowSpan: number;
  order: number;
}

export interface GridPlacement {
  id: string;
  /** Column index. */
  x: number;
  /** Row index. */
  y: number;
  w: number;
  h: number;
}

export function gridColumnsForWidth(width: number): number {
  return width >= GRID.tabletMinWidth ? GRID.tabletColumns : GRID.phoneColumns;
}

/**
 * First-fit packing in `order`: each card takes the first free slot scanning rows
 * top to bottom, columns left to right. Deterministic, so every device lays out
 * the same dashboard the same way.
 */
export function packGrid(
  items: readonly GridItem[],
  columns: number,
): { placements: GridPlacement[]; rows: number } {
  const sorted = [...items].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const occupied: boolean[][] = [];
  const isFree = (x: number, y: number, w: number, h: number) => {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        if (occupied[row]?.[col]) return false;
      }
    }
    return true;
  };

  const placements: GridPlacement[] = [];
  let rows = 0;
  for (const item of sorted) {
    const w = Math.min(Math.max(1, Math.round(item.columnSpan)), columns);
    const h = Math.max(1, Math.round(item.rowSpan));
    let placed = false;
    for (let y = 0; !placed; y++) {
      for (let x = 0; x + w <= columns; x++) {
        if (!isFree(x, y, w, h)) continue;
        for (let row = y; row < y + h; row++) {
          occupied[row] ??= [];
          for (let col = x; col < x + w; col++) occupied[row]![col] = true;
        }
        placements.push({ id: item.id, x, y, w, h });
        rows = Math.max(rows, y + h);
        placed = true;
        break;
      }
    }
  }
  return { placements, rows };
}
