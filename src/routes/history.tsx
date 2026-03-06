import { createFileRoute } from '@tanstack/react-router';
import { HistoryPage } from '@/modules/history';

export const Route = createFileRoute('/history')({
  component: HistoryRouteComponent,
});

function HistoryRouteComponent() {
  return <HistoryPage />;
}

