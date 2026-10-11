import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface GettingStartedDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const bodyClass = 'text-sm leading-6 text-neutral-700 dark:text-neutral-300';

function TasktrackWordmark() {
  return (
    <span className="inline-block rounded-md bg-[#FDFC74] px-1.5 py-0.5 font-semibold text-black">
      tasktrack
    </span>
  );
}

function GuideSection({
  title,
  children,
}: {
  readonly title: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function GettingStartedDialog({
  open,
  onOpenChange,
}: GettingStartedDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] flex max-h-[80vh] w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-2xl focus:outline-none dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Getting Started
              </Dialog.Title>
              <Dialog.Description className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                How the pieces fit together.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                aria-label="Close getting started"
              >
                <X className="size-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <GuideSection
              title={
                <>
                  What <TasktrackWordmark /> is
                </>
              }
            >
              <p className={bodyClass}>
                A quiet place for the work you mean to finish. Boards, tasks,
                and history stay in this browser. There is no account to create.
              </p>
            </GuideSection>

            <GuideSection title="A board">
              <p className={bodyClass}>
                A board is one body of work. A new one starts as To Do, In
                Progress, and Done. Rename those columns, or add your own, when
                that shape does not fit. Keep another board when the work is
                different, and switch between them at the top.
              </p>
              <p className={bodyClass}>
                Settings, then Boards, is where you rename a board, reorder
                them, choose which one opens by default, or export one.
              </p>
            </GuideSection>

            <GuideSection title="The inbox">
              <p className={bodyClass}>
                The inbox sits beside the board. A task waits there until you
                decide it belongs in a column. Open it from the left rail, write
                a title, and add a description, priority, or due date when you
                already know them.
              </p>
              <p className={bodyClass}>
                Drag a card back to the inbox when you are not ready for it.
                Drag it onto a column when you are.
              </p>
            </GuideSection>

            <GuideSection title="Three ways to look">
              <p className={bodyClass}>
                The switcher at the top is the same board, seen three ways.
              </p>
              <ul className={`list-disc pl-5 space-y-1 ${bodyClass}`}>
                <li>
                  <strong>Board</strong> — move cards as the work moves.
                </li>
                <li>
                  <strong>List</strong> — scan everything in one table, and sort
                  by what you care about.
                </li>
                <li>
                  <strong>Summary</strong> — a look at the last week: what you
                  finished, what changed, what you added, and what is due soon.
                  It also shows how work sits across columns and priorities, and
                  a short trail of what happened recently.
                </li>
              </ul>
            </GuideSection>

            <GuideSection title="One task at a time">
              <p className={bodyClass}>
                Click a title to open it. That is where the description,
                priority, and due date live.
              </p>
              <p className={bodyClass}>
                If a timer helps you stay with one thing, turn Focus on in
                Settings. From a card menu, start a session: a full-screen
                timer you can also keep in a small floating window.
              </p>
            </GuideSection>

            <GuideSection title="Finding your way back">
              <p className={bodyClass}>
                The clock on the left is History. It remembers what you created,
                moved, and renamed, grouped by day or by task. The magnifying
                glass finds a task by name when you do not want to hunt through
                columns.
              </p>
            </GuideSection>

            <GuideSection title="Jira, if you use it">
              <p className={bodyClass}>
                Jira is optional, and you choose it per board. Connect it in
                Settings, then Jira, and turn it on only for the boards that
                should include that work. tasktrack reads the issues assigned
                to you. Changes you make here stay here.
              </p>
              <p className={bodyClass}>
                Boards with Jira call items tickets. Every other board stays
                tasks. You can still write your own tasks on a connected board.
              </p>
            </GuideSection>

            <GuideSection title="A way to begin">
              <ol className={`list-decimal pl-5 space-y-1 ${bodyClass}`}>
                <li>Open the inbox and write down what is actually on your mind.</li>
                <li>Drag the ones you are doing onto the board. Leave the rest.</li>
                <li>
                  Use the board while you work, the list when you want to scan,
                  and Summary when you want a sense of the week.
                </li>
                <li>
                  Connect Jira later, only if a board should include that work.
                </li>
              </ol>
            </GuideSection>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
