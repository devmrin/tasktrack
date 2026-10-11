import { createFileRoute } from '@tanstack/react-router';
import { FocusPage } from '@/modules/focus';

export const Route = createFileRoute('/focus')({
  component: FocusRouteComponent,
});

function FocusRouteComponent() {
  return <FocusPage />;
}
