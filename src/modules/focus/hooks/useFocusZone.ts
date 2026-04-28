import { useCallback, useEffect, useRef, useState } from 'react';
import { db, type Ticket } from '@/db/database';
import { INBOX_COLUMN_ID } from '@/modules/inbox/types';
import { getTicket } from '@/modules/tickets/services/ticket.service';
import { subscribeToTicketsRemoved } from '@/utils/ticketsRemoved';
import { subscribeToTicketMoved } from '@/utils/ticketsMoved';
import { subscribeToTicketUpdated } from '@/utils/ticketsUpdated';
import { SETTING_KEYS } from '@/modules/focus/constants';
import type { FocusedTicketData } from '@/modules/focus/types';

async function loadFocusState(): Promise<FocusedTicketData | null> {
  const [ticketIdRow, originalColumnRow] = await Promise.all([
    db.settings.get(SETTING_KEYS.focusTicketId),
    db.settings.get(SETTING_KEYS.focusOriginalColumnId),
  ]);

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

  return { ticket, originalColumnId };
}

async function persistFocus(ticketId: string, originalColumnId: string): Promise<void> {
  await db.settings.bulkPut([
    { key: SETTING_KEYS.focusTicketId, value: ticketId },
    { key: SETTING_KEYS.focusOriginalColumnId, value: originalColumnId },
  ]);
}

async function clearPersistedFocus(): Promise<void> {
  await db.settings.bulkDelete([SETTING_KEYS.focusTicketId, SETTING_KEYS.focusOriginalColumnId]);
}

export function useFocusZone() {
  const [focusedData, setFocusedData] = useState<FocusedTicketData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadFocusState().then((data) => {
      setFocusedData(data);
      setLoaded(true);
    });
  }, []);

  const startFocus = useCallback(async (ticket: Ticket) => {
    const originalColumnId = ticket.columnId;
    await persistFocus(ticket.id, originalColumnId);
    setFocusedData({ ticket, originalColumnId });
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
    return subscribeToTicketsRemoved((ticketIds) => {
      const focused = focusedDataRef.current;
      if (focused && ticketIds.includes(focused.ticket.id)) {
        void endFocusRef.current();
      }
    });
  }, []);

  useEffect(() => {
    return subscribeToTicketMoved(({ ticketId, newColumnId }) => {
      const focused = focusedDataRef.current;
      if (!focused) {
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
      if (!focused || ticketId !== focused.ticket.id) {
        return;
      }

      void (async () => {
        const ticket = await getTicket(ticketId);
        if (!ticket) {
          await clearPersistedFocus();
          setFocusedData(null);
          return;
        }
        setFocusedData((prev) => (prev ? { ...prev, ticket } : null));
      })();
    });
  }, []);

  const refreshFocusedTicket = useCallback(async () => {
    if (!focusedData) return;
    const ticket = await getTicket(focusedData.ticket.id);
    if (!ticket) {
      await clearPersistedFocus();
      setFocusedData(null);
      return;
    }
    setFocusedData((prev) => (prev ? { ...prev, ticket } : null));
  }, [focusedData]);

  return {
    focusedData,
    focusActive: focusedData !== null,
    loaded,
    startFocus,
    endFocus,
    refreshFocusedTicket,
  };
}
