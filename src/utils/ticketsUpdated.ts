const TICKET_UPDATED_EVENT = "ticket-updated";

export interface TicketUpdatedDetail {
  ticketId: string;
}

export function dispatchTicketUpdated(detail: TicketUpdatedDetail): void {
  globalThis.dispatchEvent(
    new CustomEvent<TicketUpdatedDetail>(TICKET_UPDATED_EVENT, {
      detail,
    }),
  );
}

export function subscribeToTicketUpdated(
  handler: (detail: TicketUpdatedDetail) => void,
): () => void {
  const listener = (e: Event) => {
    const ev = e as CustomEvent<TicketUpdatedDetail>;
    if (ev.detail) {
      handler(ev.detail);
    }
  };
  globalThis.addEventListener(TICKET_UPDATED_EVENT, listener);
  return () => globalThis.removeEventListener(TICKET_UPDATED_EVENT, listener);
}
