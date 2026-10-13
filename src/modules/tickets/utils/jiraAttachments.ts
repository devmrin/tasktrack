import type { JiraAttachment, Ticket } from '@/db/database';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif']);

export function isJiraImageAttachment(mimeType: string, filename: string): boolean {
  const normalized = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  const extension = filename.split('.').pop()?.trim().toLowerCase() ?? '';
  if (normalized === 'image/svg+xml' || extension === 'svg') {
    return false;
  }
  if (normalized.startsWith('image/')) {
    return true;
  }
  return IMAGE_EXTENSIONS.has(extension);
}

export function extractJiraAttachments(raw: unknown): JiraAttachment[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const attachments: JiraAttachment[] = [];
  for (const item of raw) {
    const parsed = parseJiraAttachment(item);
    if (parsed) {
      attachments.push(parsed);
    }
  }
  return attachments;
}

export function getTicketAttachmentCount(ticket: Pick<Ticket, 'jiraData'>): number {
  return ticket.jiraData?.attachments?.length ?? 0;
}

/** Keeps a previously saved image preview when a later sync cannot download it again. */
export function retainAttachmentPreviews(
  previous: readonly JiraAttachment[] | undefined,
  next: readonly JiraAttachment[],
): JiraAttachment[] {
  if (!previous || previous.length === 0) {
    return [...next];
  }
  const previousPreviewById = new Map(
    previous.map((attachment) => [attachment.id, attachment.previewDataUrl]),
  );
  return next.map((attachment) => {
    if (attachment.previewDataUrl) {
      return attachment;
    }
    const previewDataUrl = previousPreviewById.get(attachment.id);
    return previewDataUrl ? { ...attachment, previewDataUrl } : attachment;
  });
}

/**
 * First image in Jira's attachment order. Later images are not used as a fallback cover.
 * When the ticket has no image attachments, the first image in the description is used.
 */
export function getTicketCoverImage(
  ticket: Pick<Ticket, 'jiraData' | 'description'>,
): { src: string; alt: string } | undefined {
  const firstImage = ticket.jiraData?.attachments?.find((attachment) =>
    isJiraImageAttachment(attachment.mimeType, attachment.filename),
  );
  if (firstImage) {
    return firstImage.previewDataUrl
      ? { src: firstImage.previewDataUrl, alt: firstImage.filename }
      : undefined;
  }
  return firstDescriptionImage(ticket.description);
}

export function formatAttachmentSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) {
    return '0 B';
  }
  if (size < 1024) {
    return `${Math.round(size)} B`;
  }
  if (size < 1024 * 1024) {
    return `${formatScaled(size / 1024)} KB`;
  }
  if (size < 1024 * 1024 * 1024) {
    return `${formatScaled(size / (1024 * 1024))} MB`;
  }
  return `${formatScaled(size / (1024 * 1024 * 1024))} GB`;
}

function formatScaled(value: number): string {
  if (value >= 10) {
    return String(Math.round(value));
  }
  const fixed = value.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}

function parseJiraAttachment(item: unknown): JiraAttachment | undefined {
  if (!item || typeof item !== 'object') {
    return undefined;
  }
  const record = item as Record<string, unknown>;
  const id = record.id;
  const filename = record.filename;
  if ((typeof id !== 'string' && typeof id !== 'number') || typeof filename !== 'string') {
    return undefined;
  }
  const trimmedName = filename.trim();
  if (!trimmedName) {
    return undefined;
  }
  const mimeType = typeof record.mimeType === 'string' && record.mimeType.trim()
    ? record.mimeType.trim()
    : 'application/octet-stream';
  const size = typeof record.size === 'number' && Number.isFinite(record.size) ? record.size : 0;
  const createdAt = typeof record.created === 'string' ? record.created : undefined;
  const authorName = readAuthorName(record.author);
  return {
    id: String(id),
    filename: trimmedName,
    mimeType,
    size,
    ...(createdAt ? { createdAt } : {}),
    ...(authorName ? { authorName } : {}),
  };
}

const DESCRIPTION_IMAGE_SRC =
  /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+))/i;
const DESCRIPTION_IMAGE_ALT =
  /\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+))/i;
const SAFE_DATA_IMAGE =
  /^data:image\/(?:png|jpe?g|gif|webp|bmp|avif|heic|heif)(?:[;,]|$)/i;

function firstDescriptionImage(
  html: string | undefined,
): { src: string; alt: string } | undefined {
  if (!html) {
    return undefined;
  }
  const tags = html.match(/<img\b[^>]*>/gi);
  if (!tags) {
    return undefined;
  }
  for (const tag of tags) {
    const src = readHtmlAttribute(tag, DESCRIPTION_IMAGE_SRC);
    if (!src || !isDescriptionCoverSrc(src)) {
      continue;
    }
    return {
      src,
      alt: readHtmlAttribute(tag, DESCRIPTION_IMAGE_ALT) ?? 'Description image',
    };
  }
  return undefined;
}

function readHtmlAttribute(tag: string, pattern: RegExp): string | undefined {
  const match = pattern.exec(tag);
  const raw = match?.[1] ?? match?.[2] ?? match?.[3];
  if (!raw) {
    return undefined;
  }
  const decoded = decodeHtmlAttribute(raw).trim();
  return decoded || undefined;
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function isDescriptionCoverSrc(src: string): boolean {
  if (SAFE_DATA_IMAGE.test(src)) {
    return true;
  }
  if (!/^https?:\/\//i.test(src)) {
    return false;
  }
  const path = src.split(/[?#]/)[0]?.toLowerCase() ?? '';
  return !path.endsWith('.svg');
}

function readAuthorName(author: unknown): string | undefined {
  if (!author || typeof author !== 'object') {
    return undefined;
  }
  const displayName = (author as { displayName?: unknown }).displayName;
  return typeof displayName === 'string' && displayName.trim() ? displayName.trim() : undefined;
}
