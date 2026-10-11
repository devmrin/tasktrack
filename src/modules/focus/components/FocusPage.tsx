import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Play, Search, Timer } from 'lucide-react';
import type { Ticket } from '@/db/database';
import { useActiveBoard } from '@/modules/boards/hooks/useActiveBoard';
import { useBoardTerminology } from '@/modules/boards/hooks/useBoardTerminology';
import { FOCUS_CUSTOM_LABEL_MAX_LENGTH } from '@/modules/focus/constants';
import { useFocusZone } from '@/modules/focus/hooks/useFocusZone';
import { usePomodoroSettings } from '@/modules/focus/hooks/usePomodoroSettings';
import { useAllTicketsQuery } from '@/modules/tickets/hooks/useTicketsQuery';

const EMPTY_TICKETS: Ticket[] = [];

function ticketDisplayKey(ticket: Ticket): string {
  if (ticket.type === 'jira' && ticket.jiraData?.jiraKey) {
    return ticket.jiraData.jiraKey;
  }
  return ticket.customKey ?? '';
}

function ticketMatchesQuery(ticket: Ticket, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const key = ticketDisplayKey(ticket).toLowerCase();
  return ticket.title.toLowerCase().includes(q) || key.includes(q);
}

export function FocusPage() {
  const navigate = useNavigate();
  const { activeBoard, activeBoardId } = useActiveBoard();
  const terminology = useBoardTerminology(activeBoard);
  const { settings, loaded: settingsLoaded } = usePomodoroSettings();
  const { focusActive, startFocus, startCustomFocus } = useFocusZone();
  const ticketsQuery = useAllTicketsQuery(activeBoardId);
  const tickets = ticketsQuery.data ?? EMPTY_TICKETS;

  const [ticketQuery, setTicketQuery] = useState('');
  const [customLabel, setCustomLabel] = useState('');

  useEffect(() => {
    if (!settingsLoaded) return;
    if (settings.enabled) return;
    if (activeBoard?.slug) {
      void navigate({
        to: '/$boardSlug/$view',
        params: { boardSlug: activeBoard.slug, view: 'board' },
        replace: true,
      });
      return;
    }
    void navigate({ to: '/', replace: true });
  }, [settingsLoaded, settings.enabled, activeBoard, navigate]);

  const filteredTickets = useMemo(() => {
    const matched = tickets.filter((ticket) =>
      ticketMatchesQuery(ticket, ticketQuery),
    );
    return matched.slice(0, 40);
  }, [tickets, ticketQuery]);

  const canStartCustom = customLabel.trim().length > 0 && !focusActive;

  const handlePickTicket = (ticket: Ticket) => {
    if (focusActive) return;
    void startFocus(ticket);
  };

  const handleStartCustom = () => {
    if (!canStartCustom) return;
    void startCustomFocus(customLabel);
    setCustomLabel('');
  };

  if (!settingsLoaded || !settings.enabled) {
    return (
      <div className="flex h-screen items-center justify-center px-6">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto px-6 py-6">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              <Timer className="size-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Focus
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Pick a {terminology.item} or type what you want to work on.
              </p>
            </div>
          </div>
        </header>

        {focusActive ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            A focus session is already open. End it to start something else.
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                From the board
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Search {terminology.items} on{' '}
                {activeBoard?.name ?? 'this board'}.
              </p>
              <label className="relative mt-3 block">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={ticketQuery}
                  onChange={(e) => setTicketQuery(e.target.value)}
                  placeholder={`Search ${terminology.items}…`}
                  className="h-10 w-full rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:ring-neutral-500"
                  aria-label={`Search ${terminology.items}`}
                />
              </label>

              <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
                {ticketsQuery.isLoading && (
                  <li className="px-2 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                    Loading {terminology.items}…
                  </li>
                )}
                {!ticketsQuery.isLoading && filteredTickets.length === 0 && (
                  <li className="px-2 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                    {tickets.length === 0
                      ? `No ${terminology.items} on this board yet.`
                      : `No ${terminology.items} match your search.`}
                  </li>
                )}
                {filteredTickets.map((ticket) => {
                  const key = ticketDisplayKey(ticket);
                  return (
                    <li key={ticket.id}>
                      <button
                        type="button"
                        onClick={() => handlePickTicket(ticket)}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <Play
                          className="size-3.5 shrink-0 text-neutral-400"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {ticket.title}
                          </span>
                          {key && (
                            <span className="mt-0.5 inline-block text-xs text-neutral-500 dark:text-neutral-400">
                              {key}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Something else
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Type a one-off task. It is not saved as a {terminology.item}.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) =>
                    setCustomLabel(
                      e.target.value.slice(0, FOCUS_CUSTOM_LABEL_MAX_LENGTH),
                    )
                  }
                  maxLength={FOCUS_CUSTOM_LABEL_MAX_LENGTH}
                  placeholder="What do you want to focus on?"
                  className="h-10 min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:ring-neutral-500"
                  aria-label="Custom focus task"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleStartCustom();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleStartCustom}
                  disabled={!canStartCustom}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  <Play className="size-3.5" aria-hidden />
                  Start focus
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
