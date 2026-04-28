import type { BoardTerminology } from '@/modules/boards/types/board.types';

export function boardTerminologyFromJiraEnabled(jiraEnabled: boolean): BoardTerminology {
  if (jiraEnabled) {
    return {
      item: 'ticket',
      Item: 'Ticket',
      items: 'tickets',
      Items: 'Tickets',
    };
  }
  return {
    item: 'task',
    Item: 'Task',
    items: 'tasks',
    Items: 'Tasks',
  };
}
