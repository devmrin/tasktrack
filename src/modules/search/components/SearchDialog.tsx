import { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Fuse, { type FuseResult, type FuseResultMatch, type IFuseOptions } from 'fuse.js';
import { Search, FileText, X } from 'lucide-react';
import { useAllTicketsQuery } from '@/modules/tickets/hooks/useTicketsQuery';
import { useColumnsQuery } from '@/modules/kanban/hooks/useColumnsQuery';
import { useActiveBoard } from '@/modules/boards/hooks/useActiveBoard';
import { useBoardTerminology } from '@/modules/boards/hooks/useBoardTerminology';
import { useTicketDetail } from '@/hooks/useTicketDetail';
import { stripHtml } from '@/utils/sanitizeHtml';
import type { Ticket } from '@/db/database';

interface SearchableTicket {
  readonly ticket: Ticket;
  readonly plainDescription: string;
}

const FUSE_OPTIONS: IFuseOptions<SearchableTicket> = {
  keys: [
    { name: 'ticket.title', weight: 0.7 },
    { name: 'plainDescription', weight: 0.3 },
  ],
  threshold: 0.4,
  includeMatches: true,
  minMatchCharLength: 2,
};

const MAX_RESULTS = 20;
const EMPTY_TICKETS: Ticket[] = [];

interface SearchResult {
  readonly item: SearchableTicket;
  readonly matches?: readonly FuseResultMatch[];
}

function getMatchIndices(
  matches: readonly FuseResultMatch[] | undefined,
  key: string,
): ReadonlyArray<readonly [number, number]> {
  if (!matches) return [];
  const match = matches.find((m) => m.key === key);
  return match?.indices ?? [];
}

function HighlightedText({
  text,
  indices,
}: {
  readonly text: string;
  readonly indices: ReadonlyArray<readonly [number, number]>;
}) {
  if (indices.length === 0) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  for (const [start, end] of indices) {
    if (start > lastEnd) {
      parts.push(text.slice(lastEnd, start));
    }
    parts.push(
      <mark
        key={start}
        className="bg-blue-200 dark:bg-blue-800/60 text-inherit rounded-sm px-0.5"
      >
        {text.slice(start, end + 1)}
      </mark>,
    );
    lastEnd = end + 1;
  }

  if (lastEnd < text.length) {
    parts.push(text.slice(lastEnd));
  }

  return <>{parts}</>;
}

interface SearchDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { openTicketDetail } = useTicketDetail();

  const { activeBoardId, activeBoard } = useActiveBoard();
  const terminology = useBoardTerminology(activeBoard);
  const ticketsQuery = useAllTicketsQuery(activeBoardId);
  const columnsQuery = useColumnsQuery(activeBoardId);
  const tickets = ticketsQuery.data ?? EMPTY_TICKETS;
  const columnsData = columnsQuery.data;

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const columnMap = useMemo(() => {
    const map = new Map<string, string>();
    if (columnsData) {
      for (const col of columnsData) {
        map.set(col.id, col.title);
      }
    }
    return map;
  }, [columnsData]);

  const searchableTickets = useMemo<SearchableTicket[]>(
    () =>
      tickets.map((ticket) => ({
        ticket,
        plainDescription: ticket.description ? stripHtml(ticket.description) : '',
      })),
    [tickets],
  );

  const fuse = useMemo(() => new Fuse(searchableTickets, FUSE_OPTIONS), [searchableTickets]);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) {
      return searchableTickets.slice(0, MAX_RESULTS).map((item) => ({ item }));
    }
    return fuse.search(query, { limit: MAX_RESULTS }).map((r: FuseResult<SearchableTicket>) => ({
      item: r.item,
      matches: r.matches,
    }));
  }, [fuse, query, searchableTickets]);

  function handleSelect(searchable: SearchableTicket) {
    openTicketDetail(searchable.ticket);
    onOpenChange(false);
  }

  function scrollToIndex(index: number) {
    const container = listRef.current;
    if (!container) return;
    const item = container.children[index] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = Math.min(prev + 1, results.length - 1);
          scrollToIndex(next);
          return next;
        });
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          scrollToIndex(next);
          return next;
        });
        break;
      }
      case 'Enter': {
        e.preventDefault();
        const selected = results[activeIndex];
        if (selected) handleSelect(selected.item);
        break;
      }
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setQuery('');
      setActiveIndex(0);
    }
    onOpenChange(nextOpen);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setActiveIndex(0);
  }

  const isMac = navigator.userAgent.includes('Mac');

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className="fixed left-1/2 top-[20%] z-[101] -translate-x-1/2 w-[90vw] max-w-lg bg-white dark:bg-neutral-900 rounded-xl shadow-2xl flex flex-col overflow-hidden focus:outline-none"
          onKeyDown={handleKeyDown}
        >
          <Dialog.Title className="sr-only">{`Search ${terminology.items}`}</Dialog.Title>
          <Dialog.Description className="sr-only">
            {`Search all ${terminology.items} by title or description`}
          </Dialog.Description>

          <div className="flex items-center gap-3 px-4 border-b border-neutral-200 dark:border-neutral-700">
            <Search className="size-4 text-neutral-400 dark:text-neutral-500 shrink-0" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={`Search ${terminology.items}…`}
              className="flex-1 py-3 text-sm bg-transparent text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => handleQueryChange('')}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded transition-colors"
                aria-label="Clear search"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded">
              ESC
            </kbd>
          </div>

          <div
            ref={listRef}
            className="overflow-y-auto max-h-[400px] py-1"
            role="listbox"
            aria-label="Search results"
          >
            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-neutral-400 dark:text-neutral-500">
                <Search className="size-8" aria-hidden />
                <p className="text-sm">{`No ${terminology.items} found`}</p>
              </div>
            ) : (
              results.map(({ item, matches }, index) => {
                const { ticket, plainDescription } = item;
                const isActive = index === activeIndex;
                const columnName = columnMap.get(ticket.columnId);
                const titleIndices = getMatchIndices(matches, 'ticket.title');
                const descIndices = getMatchIndices(matches, 'plainDescription');
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                      isActive
                        ? 'bg-neutral-100 dark:bg-neutral-800'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                    }`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <FileText className="size-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5" aria-hidden />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          <HighlightedText text={ticket.title} indices={titleIndices} />
                        </span>
                        {ticket.type === 'jira' && ticket.jiraData?.jiraKey && (
                          <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 rounded">
                            {ticket.jiraData.jiraKey}
                          </span>
                        )}
                        {ticket.type === 'local' && ticket.customKey && (
                          <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40 rounded">
                            {ticket.customKey}
                          </span>
                        )}
                      </div>
                      {plainDescription && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          <HighlightedText text={plainDescription} indices={descIndices} />
                        </p>
                      )}
                      {columnName && (
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5 block">
                          {columnName}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 text-[10px] text-neutral-400 dark:text-neutral-500">
            <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-[10px]">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-[10px]">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-[10px]">{isMac ? '⌘' : 'Ctrl'}K</kbd>
                Toggle
              </span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
