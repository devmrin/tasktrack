interface JiraSyncChangeCounts {
  readonly created: readonly unknown[];
  readonly updated: readonly unknown[];
  readonly deleted: readonly unknown[];
}

export function formatJiraSyncSummary(result: JiraSyncChangeCounts): string {
  return `${result.created.length} added, ${result.updated.length} modified and ${result.deleted.length} removed`;
}
