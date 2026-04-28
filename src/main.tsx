import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import "@radix-ui/themes/styles.css";
import './index.css';
import { routeTree } from './routeTree.gen';
import { DEFAULT_BOARD_ID } from '@/modules/boards/constants/board.constants';
import { ensureDefaultBoardBootstrap } from '@/modules/boards/services/board.service';
import { initializeDefaultColumns } from '@/modules/kanban/services/column.service';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { RadixThemeWrapper } from '@/components/RadixThemeWrapper';
import { ActiveBoardProvider } from '@/contexts/ActiveBoardProvider';

const router = createRouter({ routeTree });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
    },
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

async function bootstrap() {
  await ensureDefaultBoardBootstrap();
  await initializeDefaultColumns(DEFAULT_BOARD_ID);
  createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ActiveBoardProvider>
        <ThemeProvider>
          <RadixThemeWrapper>
            <ToastProvider>
              <TooltipPrimitive.Provider delayDuration={300}>
                <RouterProvider router={router} />
              </TooltipPrimitive.Provider>
            </ToastProvider>
          </RadixThemeWrapper>
        </ThemeProvider>
      </ActiveBoardProvider>
    </QueryClientProvider>
  </StrictMode>
  );
}

bootstrap().catch(console.error);
