import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTicketDetail } from '@/hooks/useTicketDetail';
import {
  useBoardListRows,
  type BoardListRow,
} from '@/modules/list/hooks/useBoardListRows';
import { formatDueDate } from '@/modules/tickets/utils/formatDueDate';

function formatUpdated(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function SortIcon({ sorted }: { readonly sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') {
    return <ArrowUp className="size-3.5 shrink-0 opacity-70" aria-hidden />;
  }
  if (sorted === 'desc') {
    return <ArrowDown className="size-3.5 shrink-0 opacity-70" aria-hidden />;
  }
  return <ArrowUpDown className="size-3.5 shrink-0 opacity-40" aria-hidden />;
}

export function TicketListView() {
  const { rows, loading, showPriority, showDueDate } = useBoardListRows();
  const { openTicketDetail } = useTicketDetail();
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'updatedAt', desc: true },
  ]);

  const columns = useMemo<ColumnDef<BoardListRow>[]>(() => {
    const defs: ColumnDef<BoardListRow>[] = [
      {
        id: 'work',
        accessorFn: (row) => `${row.key} ${row.title}`,
        header: 'Work',
        cell: ({ row }) => (
          <div className="flex items-center gap-2 min-w-0">
            {row.original.key ? (
              <span className="shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400">
                {row.original.key}
              </span>
            ) : null}
            <span className="truncate text-sm text-neutral-900 dark:text-neutral-100">
              {row.original.title}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'columnTitle',
        header: 'Column',
        cell: ({ getValue }) => (
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            {String(getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = String(getValue());
          if (status === '—') {
            return <span className="text-sm text-neutral-400">—</span>;
          }
          return (
            <span className="inline-flex max-w-full truncate rounded-full border border-neutral-300 dark:border-neutral-600 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-200">
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: 'assignee',
        header: 'Assignee',
        cell: ({ getValue }) => (
          <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate">
            {String(getValue())}
          </span>
        ),
      },
    ];

    if (showPriority) {
      defs.push({
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ getValue }) => (
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            {String(getValue())}
          </span>
        ),
      });
    }

    if (showDueDate) {
      defs.push({
        id: 'dueDate',
        accessorFn: (row) => row.dueDate ?? '',
        header: 'Due',
        cell: ({ row }) => (
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            {formatDueDate(row.original.dueDate) ?? '—'}
          </span>
        ),
      });
    }

    defs.push(
      {
        accessorKey: 'updatedAt',
        header: 'Updated',
        cell: ({ getValue }) => (
          <span className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
            {formatUpdated(Number(getValue()))}
          </span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => (
          <span className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {String(getValue())}
          </span>
        ),
      },
    );

    return defs;
  }, [showPriority, showDueDate]);

  // TanStack Table returns unstable function identities; React Compiler skips this intentionally.
  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable is the supported table API
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.ticket.id,
  });

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-neutral-600 dark:text-neutral-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col px-3 sm:px-4 lg:px-6 pb-4">
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-800/95 backdrop-blur-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-neutral-200 dark:border-neutral-700"
              >
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 whitespace-nowrap"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-neutral-800 dark:hover:text-neutral-200"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon sorted={sorted} />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400"
                >
                  No work items on this board yet.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 cursor-pointer transition-colors"
                  onClick={() => openTicketDetail(row.original.ticket)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openTicketDetail(row.original.ticket);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="pt-2 text-xs text-neutral-500 dark:text-neutral-400">
        {rows.length} {rows.length === 1 ? 'item' : 'items'}
      </div>
    </div>
  );
}
