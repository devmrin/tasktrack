import { useCallback, useState } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { ToastContext, type ToastData } from '@/contexts/toast-context';

let toastCounter = 0;

export function ToastProvider({ children }: { readonly children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((title: string, description?: string) => {
    toastCounter += 1;
    const id = `toast-${toastCounter}`;
    setToasts((prev) => [...prev, { id, title, description }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext value={{ showToast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}

        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            open
            onOpenChange={(open) => {
              if (!open) removeToast(toast.id);
            }}
            className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg px-3 py-2 flex items-start gap-2 max-w-sm data-[state=open]:animate-toast-slide-in data-[state=closed]:animate-toast-slide-out data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform"
          >
            <div className="flex-1 min-w-0">
              <ToastPrimitive.Title className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {toast.title}
              </ToastPrimitive.Title>
              {toast.description && (
                <ToastPrimitive.Description className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                  {toast.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close
              aria-label="Dismiss"
              className="shrink-0 p-0.5 rounded-md text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <X className="size-3.5" aria-hidden />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}

        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex flex-col gap-1.5 p-3 w-auto max-w-[100vw] outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext>
  );
}
