import { useCallback, useEffect, useRef, useState } from 'react';
import { db, type Ticket } from '@/db/database';
import { INBOX_COLUMN_ID } from '@/modules/inbox/types';
import { getTicket } from '@/modules/tickets/services/ticket.service';
import { subscribeToTicketsRemoved } from '@/utils/ticketsRemoved';
import { subscribeToTicketMoved } from '@/utils/ticketsMoved';
import { subscribeToTicketUpdated } from '@/utils/ticketsUpdated';
import {
  FOCUS_CUSTOM_LABEL_MAX_LENGTH,
  SETTING_KEYS,
} from '@/modules/focus/constants';
import type { FocusedData } from '@/modules/focus/types';
import { useActiveBoard } from '@/modules/boards/hooks/useActiveBoard';

async function loadFocusState(): Promise<FocusedData | null> {
  const [ticketIdRow, originalColumnRow, customLabelRow] = await Promise.all([
    db.settings.get(SETTING_KEYS.focusTicketId),
    db.settings.get(SETTING_KEYS.focusOriginalColumnId),
    db.settings.get(SETTING_KEYS.focusCustomLabel),
  ]);

  const customLabel = customLabelRow?.value?.trim();
  if (customLabel) {
    return { kind: 'custom', label: customLabel };
  }

  const ticketId = ticketIdRow?.value;
  const originalColumnId = originalColumnRow?.value;

  if (!ticketId || !originalColumnId) {
    return null;
  }

  const ticket = await getTicket(ticketId);
  if (!ticket) {
    await clearPersistedFocus();
    return null;
  }

  return { kind: 'ticket', ticket, originalColumnId };
}

async function persistTicketFocus(
  ticketId: string,
  originalColumnId: string,
): Promise<void> {
  await db.settings.bulkDelete([SETTING_KEYS.focusCustomLabel]);
  await db.settings.bulkPut([
    { key: SETTING_KEYS.focusTicketId, value: ticketId },
    { key: SETTING_KEYS.focusOriginalColumnId, value: originalColumnId },
  ]);
}

async function persistCustomFocus(label: string): Promise<void> {
  await db.settings.bulkDelete([
    SETTING_KEYS.focusTicketId,
    SETTING_KEYS.focusOriginalColumnId,
  ]);
  await db.settings.bulkPut([
    { key: SETTING_KEYS.focusCustomLabel, value: label },
  ]);
}

async function clearPersistedFocus(): Promise<void> {
  await db.settings.bulkDelete([
    SETTING_KEYS.focusTicketId,
    SETTING_KEYS.focusOriginalColumnId,
    SETTING_KEYS.focusCustomLabel,
  ]);
}

function normalizeCustomLabel(raw: string): string | null {
  const label = raw.trim().replace(/\s+/g, ' ');
  if (!label) return null;
  return label.slice(0, FOCUS_CUSTOM_LABEL_MAX_LENGTH);
}

export function useFocusZoneState() {
  const { activeBoardId } = useActiveBoard();
  const [focusedData, setFocusedData] = useState<FocusedData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadFocusState().then((data) => {
      setFocusedData(data);
      setLoaded(true);
    });
  }, []);

  const startFocus = useCallback(async (ticket: Ticket) => {
    const originalColumnId = ticket.columnId;
    await persistTicketFocus(ticket.id, originalColumnId);
    setFocusedData({ kind: 'ticket', ticket, originalColumnId });
  }, []);

  const startCustomFocus = useCallback(async (rawLabel: string) => {
    const label = normalizeCustomLabel(rawLabel);
    if (!label) return;
    await persistCustomFocus(label);
    setFocusedData({ kind: 'custom', label });
  }, []);

  const endFocus = useCallback(async () => {
    await clearPersistedFocus();
    setFocusedData(null);
  }, []);

  const endFocusRef = useRef(endFocus);
  const focusedDataRef = useRef(focusedData);

  useEffect(() => {
    endFocusRef.current = endFocus;
    focusedDataRef.current = focusedData;
  }, [endFocus, focusedData]);

  useEffect(() => {
    const focused = focusedData;
    if (!focused || focused.kind !== 'ticket' || !activeBoardId) {
      return;
    }
    if (focused.ticket.boardId !== activeBoardId) {
      queueMicrotask(() => {
        void endFocusRef.current();
      });
    }
  }, [focusedData, activeBoardId]);

  useEffect(() => {
    return subscribeToTicketsRemoved((ticketIds) => {
      const focused = focusedDataRef.current;
      if (
        focused?.kind === 'ticket' &&
        ticketIds.includes(focused.ticket.id)
      ) {
        void endFocusRef.current();
      }
    });
  }, []);

  useEffect(() => {
    return subscribeToTicketMoved(({ ticketId, newColumnId }) => {
      const focused = focusedDataRef.current;
      if (focused?.kind !== 'ticket') {
        return;
      }
      if (ticketId === focused.ticket.id && newColumnId === INBOX_COLUMN_ID) {
        void endFocusRef.current();
      }
    });
  }, []);

  useEffect(() => {
    return subscribeToTicketUpdated(({ ticketId }) => {
      const focused = focusedDataRef.current;
      if (focused?.kind !== 'ticket' || ticketId !== focused.ticket.id) {
        return;
      }

      void (async () => {
        const ticket = await getTicket(ticketId);
        if (!ticket) {
          await clearPersistedFocus();
          setFocusedData(null);
          return;
        }
        setFocusedData((prev) =>
          prev?.kind === 'ticket' ? { ...prev, ticket } : null,
        );
      })();
    });
  }, []);

  const refreshFocusedTicket = useCallback(async () => {
    if (focusedData?.kind !== 'ticket') return;
    const ticket = await getTicket(focusedData.ticket.id);
    if (!ticket) {
      await clearPersistedFocus();
      setFocusedData(null);
      return;
    }
    setFocusedData((prev) =>
      prev?.kind === 'ticket' ? { ...prev, ticket } : null,
    );
  }, [focusedData]);

  return {
    focusedData,
    focusActive: focusedData !== null,
    loaded,
    startFocus,
    startCustomFocus,
    endFocus,
    refreshFocusedTicket,
  };
}

export type FocusZoneValue = ReturnType<typeof useFocusZoneState>;
