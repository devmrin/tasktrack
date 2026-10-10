const SLUG_SUFFIX_LENGTH = 8;
const SLUG_SUFFIX_PATTERN = /^[a-z0-9]{8}$/i;

/** Lowercase, hyphenate, strip unsafe characters for the readable URL prefix. */
export function slugifyName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .replaceAll(/-{2,}/g, '-');

  return slug.length > 0 ? slug : 'board';
}

/** 8-character alphanumeric id from crypto.randomUUID (no hyphens). */
export function createSlugSuffix(): string {
  const hex = crypto.randomUUID().replaceAll('-', '');
  return hex.slice(0, SLUG_SUFFIX_LENGTH).toLowerCase();
}

export function buildBoardSlug(name: string, slugSuffix: string): string {
  const suffix = slugSuffix.trim().toLowerCase();
  if (!SLUG_SUFFIX_PATTERN.test(suffix)) {
    throw new Error('Invalid board slug suffix');
  }
  return `${slugifyName(name)}-${suffix}`;
}

/**
 * Parse the trailing 8-char suffix from a Notion-style board slug param.
 * Returns null when the last segment is not a valid suffix.
 */
export function parseSlugSuffixFromParam(boardSlug: string): string | null {
  const trimmed = boardSlug.trim();
  if (!trimmed) {
    return null;
  }
  const lastDash = trimmed.lastIndexOf('-');
  if (lastDash < 0) {
    return SLUG_SUFFIX_PATTERN.test(trimmed) ? trimmed.toLowerCase() : null;
  }
  const candidate = trimmed.slice(lastDash + 1);
  return SLUG_SUFFIX_PATTERN.test(candidate) ? candidate.toLowerCase() : null;
}

export function resolveBoardFromSlugParam<T extends { slug: string; slugSuffix: string }>(
  boards: readonly T[],
  boardSlugParam: string,
): T | undefined {
  const exact = boards.find((b) => b.slug === boardSlugParam);
  if (exact) {
    return exact;
  }
  const suffix = parseSlugSuffixFromParam(boardSlugParam);
  if (!suffix) {
    return undefined;
  }
  return boards.find((b) => b.slugSuffix === suffix);
}
