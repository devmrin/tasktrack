import type { JiraAttachment } from '@/db/database';
import {
  getAtlassianConfig,
  getJiraAttachmentUrl,
  getValidAccessToken,
  type AtlassianConfig,
} from '@/modules/settings';
import { isJiraImageAttachment } from '@/modules/tickets/utils/jiraAttachments';

const MAX_IMAGE_PREVIEWS = 12;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const PREVIEW_CONCURRENCY = 4;
const COVER_MAX_EDGE = 960;

interface PreviewJob {
  issueKey: string;
  index: number;
  attachmentId: string;
  preferFull: boolean;
}

export async function downloadJiraAttachment(attachmentId: string): Promise<Blob> {
  const config = await getAtlassianConfig();
  const accessToken = await getValidAccessToken();
  if (!config || !accessToken) {
    throw new Error('JIRA is not connected');
  }
  const blob = await fetchAttachmentBlob(config, accessToken, attachmentId, 'content');
  if (!blob) {
    throw new Error('Failed to download attachment');
  }
  return blob;
}

export async function withAttachmentPreviews(
  issues: readonly { key: string; attachments?: JiraAttachment[] }[],
  config: AtlassianConfig,
  accessToken: string,
): Promise<Map<string, JiraAttachment[]>> {
  const attachmentsByIssue = new Map<string, JiraAttachment[]>();
  const jobs: PreviewJob[] = [];

  for (const issue of issues) {
    if (issue.attachments === undefined) {
      continue;
    }
    const copies = issue.attachments.map((attachment) => ({ ...attachment }));
    attachmentsByIssue.set(issue.key, copies);
    collectPreviewJobs(issue.key, copies, jobs);
  }

  await mapPool(jobs, PREVIEW_CONCURRENCY, async (job) => {
    const previewDataUrl = await loadImagePreview(
      config,
      accessToken,
      job.attachmentId,
      job.preferFull,
    );
    const current = attachmentsByIssue.get(job.issueKey)?.[job.index];
    if (!previewDataUrl || !current) {
      return;
    }
    const attachments = attachmentsByIssue.get(job.issueKey);
    if (!attachments) {
      return;
    }
    attachments[job.index] = { ...current, previewDataUrl };
  });

  return attachmentsByIssue;
}

function collectPreviewJobs(issueKey: string, attachments: readonly JiraAttachment[], jobs: PreviewJob[]): void {
  let imageCount = 0;
  for (let index = 0; index < attachments.length; index += 1) {
    const attachment = attachments[index];
    if (!attachment || !isJiraImageAttachment(attachment.mimeType, attachment.filename)) {
      continue;
    }
    if (imageCount >= MAX_IMAGE_PREVIEWS) {
      break;
    }
    const tooLarge = attachment.size > MAX_IMAGE_BYTES;
    jobs.push({
      issueKey,
      index,
      attachmentId: attachment.id,
      preferFull: imageCount === 0 && !tooLarge,
    });
    imageCount += 1;
  }
}

async function loadImagePreview(
  config: AtlassianConfig,
  accessToken: string,
  attachmentId: string,
  preferFull: boolean,
): Promise<string | undefined> {
  try {
    if (preferFull) {
      const full = await imageDataUrlFromVariant(config, accessToken, attachmentId, 'content', COVER_MAX_EDGE);
      if (full) {
        return full;
      }
    }
    return await imageDataUrlFromVariant(config, accessToken, attachmentId, 'thumbnail', 480);
  } catch {
    return undefined;
  }
}

async function imageDataUrlFromVariant(
  config: AtlassianConfig,
  accessToken: string,
  attachmentId: string,
  variant: 'content' | 'thumbnail',
  maxEdge: number,
): Promise<string | undefined> {
  const blob = await fetchAttachmentBlob(config, accessToken, attachmentId, variant);
  if (!blob || blob.size > MAX_IMAGE_BYTES || isSvgBlob(blob)) {
    return undefined;
  }
  return resizeImageBlob(blob, maxEdge);
}

async function fetchAttachmentBlob(
  config: AtlassianConfig,
  accessToken: string,
  attachmentId: string,
  variant: 'content' | 'thumbnail',
): Promise<Blob | null> {
  try {
    const url = getJiraAttachmentUrl(config.cloudId, config.instanceUrl, attachmentId, variant);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: '*/*',
      },
    });
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

function isSvgBlob(blob: Blob): boolean {
  return blob.type.split(';')[0]?.trim().toLowerCase() === 'image/svg+xml';
}

async function resizeImageBlob(blob: Blob, maxEdge: number): Promise<string | undefined> {
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(blob);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= 0) {
      return undefined;
    }
    const scale = Math.min(1, maxEdge / longest);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      return undefined;
    }
    context.fillStyle = '#f5f5f5';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const webp = canvas.toDataURL('image/webp', 0.85);
    if (webp.startsWith('data:image/webp')) {
      return webp;
    }
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return undefined;
  } finally {
    bitmap?.close();
  }
}

async function mapPool<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }
  let nextIndex = 0;
  const run = async () => {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      const item = items[current];
      if (item !== undefined) {
        await worker(item);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
}
