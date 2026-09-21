import { gridColumnsForWidth, packGrid, type Card } from '@nook/shared';
import { useMemo } from 'react';
import { View } from 'react-native';

import { CardTile } from '@/components/card-tile';

const GAP = 12;
/** Row height relative to the width of one column. */
const ROW_RATIO = 0.9;

export function DashboardGrid({ cards, width, now }: { cards: Card[]; width: number; now: number }) {
  const columns = gridColumnsForWidth(width);
  const cell = (width - GAP * (columns - 1)) / columns;
  const row = cell * ROW_RATIO;
  const { placements, rows } = useMemo(
    () =>
      packGrid(
        cards.map((card) => ({ id: card.id, ...card.layout })),
        columns,
      ),
    [cards, columns],
  );
  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);

  if (width <= 0) return null;
  return (
    <View style={{ height: rows > 0 ? rows * row + (rows - 1) * GAP : 0 }}>
      {placements.map((placement) => {
        const card = byId.get(placement.id);
        if (!card) return null;
        return (
          <View
            key={placement.id}
            style={{
              position: 'absolute',
              left: placement.x * (cell + GAP),
              top: placement.y * (row + GAP),
              width: placement.w * cell + (placement.w - 1) * GAP,
              height: placement.h * row + (placement.h - 1) * GAP,
            }}>
            <CardTile card={card} now={now} />
          </View>
        );
      })}
    </View>
  );
}
