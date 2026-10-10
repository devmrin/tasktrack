import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractJiraAttachments,
  formatAttachmentSize,
  getTicketAttachmentCount,
  getTicketCoverImage,
  isJiraImageAttachment,
  retainAttachmentPreviews,
} from '@/modules/tickets/utils/jiraAttachments';
import type { JiraAttachment } from '@/db/database';

function attachment(
  overrides: Partial<JiraAttachment> & Pick<JiraAttachment, 'id' | 'filename' | 'mimeType'>,
): JiraAttachment {
  return { size: 10, ...overrides };
}

test('extracts jira attachment metadata and skips incomplete entries', () => {
  const parsed = extractJiraAttachments([
    {
      id: 10,
      filename: 'a.png',
      mimeType: 'image/png',
      size: 12,
      created: '2026-01-01T00:00:00.000+0000',
      author: { displayName: 'Ada' },
    },
    { id: '11', filename: 'b.pdf', size: 99 },
    { filename: 'missing-id.txt' },
    null,
  ]);

  assert.deepEqual(parsed, [
    {
      id: '10',
      filename: 'a.png',
      mimeType: 'image/png',
      size: 12,
      createdAt: '2026-01-01T00:00:00.000+0000',
      authorName: 'Ada',
    },
    {
      id: '11',
      filename: 'b.pdf',
      mimeType: 'application/octet-stream',
      size: 99,
    },
  ]);
});

test('treats common image types as images and skips svg', () => {
  assert.equal(isJiraImageAttachment('image/png', 'shot.png'), true);
  assert.equal(isJiraImageAttachment('application/octet-stream', 'screen.PNG'), true);
  assert.equal(isJiraImageAttachment('image/svg+xml', 'icon.svg'), false);
  assert.equal(isJiraImageAttachment('application/pdf', 'notes.pdf'), false);
});

test('cover image is the first image attachment', () => {
  const cover = 'data:image/png;base64,QQ==';
  const ticket = {
    jiraData: {
      jiraId: '1',
      jiraUrl: 'https://example.atlassian.net/browse/KAN-1',
      jiraKey: 'KAN-1',
      attachments: [
        attachment({ id: '1', filename: 'notes.pdf', mimeType: 'application/pdf' }),
        attachment({ id: '2', filename: 'shot.png', mimeType: 'image/png', previewDataUrl: cover }),
        attachment({
          id: '3',
          filename: 'other.png',
          mimeType: 'image/png',
          previewDataUrl: 'data:image/png;base64,Qg==',
        }),
      ],
    },
  };

  assert.deepEqual(getTicketCoverImage(ticket), { src: cover, alt: 'shot.png' });
  assert.equal(getTicketAttachmentCount(ticket), 3);
});

test('does not use a later image when the first image has no preview', () => {
  const ticket = {
    jiraData: {
      jiraId: '1',
      jiraUrl: 'https://example.atlassian.net/browse/KAN-1',
      jiraKey: 'KAN-1',
      attachments: [
        attachment({ id: '1', filename: 'shot.png', mimeType: 'image/png' }),
        attachment({
          id: '2',
          filename: 'other.png',
          mimeType: 'image/png',
          previewDataUrl: 'data:image/png;base64,Qg==',
        }),
      ],
    },
  };

  assert.equal(getTicketCoverImage(ticket), undefined);
});

test('keeps a stored preview when the new sync has none for that file', () => {
  const previous = [
    attachment({
      id: '2',
      filename: 'shot.png',
      mimeType: 'image/png',
      previewDataUrl: 'data:image/png;base64,QQ==',
    }),
  ];
  const next = [attachment({ id: '2', filename: 'shot.png', mimeType: 'image/png', size: 40 })];
  assert.equal(retainAttachmentPreviews(previous, next)[0]?.previewDataUrl, 'data:image/png;base64,QQ==');
});

test('formats attachment sizes', () => {
  assert.equal(formatAttachmentSize(0), '0 B');
  assert.equal(formatAttachmentSize(512), '512 B');
  assert.equal(formatAttachmentSize(1536), '1.5 KB');
  assert.equal(formatAttachmentSize(10 * 1024), '10 KB');
  assert.equal(formatAttachmentSize(2 * 1024 * 1024), '2 MB');
});
