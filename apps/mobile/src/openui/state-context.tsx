import { EMPTY_CARD_STATE, type CardState, type FieldValue } from '@nook/shared';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { requestRefresh, setField } from '@/services/card-state';
import { effectiveState, useCardStateStore } from '@/store/card-state';

export interface CardStateApi {
  /** False for read-only renders such as version previews; inputs are then disabled. */
  interactive: boolean;
  state: CardState;
  setField: (id: string, value: FieldValue) => void;
  requestRefresh: () => void;
}

const readOnly: CardStateApi = {
  interactive: false,
  state: EMPTY_CARD_STATE,
  setField: () => undefined,
  requestRefresh: () => undefined,
};

const CardStateContext = createContext<CardStateApi>(readOnly);

export function useCardState(): CardStateApi {
  return useContext(CardStateContext);
}

/** Gives interactive components the saved input of one card and a way to change it. */
export function CardStateProvider({ cardId, children }: { cardId: string; children: ReactNode }) {
  const remote = useCardStateStore((store) => store.remote[cardId]);
  const pending = useCardStateStore((store) => store.pending[cardId]);
  const api = useMemo<CardStateApi>(
    () => ({
      interactive: true,
      state: effectiveState(remote, pending),
      setField: (id, value) => setField(cardId, id, value),
      requestRefresh: () => requestRefresh(cardId),
    }),
    [cardId, remote, pending],
  );
  return <CardStateContext.Provider value={api}>{children}</CardStateContext.Provider>;
}
