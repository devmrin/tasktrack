import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote',
  'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'div', 'span', 'img',
];

const ALLOWED_ATTR = ['href', 'rel', 'target', 'class', 'src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'];

/**
 * Sanitizes HTML for safe rendering. Allows common formatting tags used in
 * JIRA descriptions and ADF output.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ['target', 'rel'],
  });
}

const BLOCK_TAG_RE = /<\/(p|div|li|ol|ul|br|h[1-6]|blockquote|tr|pre|hr)>/gi;
const BR_TAG_RE = /<br\s*\/?>/gi;

/**
 * Strips HTML tags to produce plain text for previews.
 * Decodes HTML entities via the DOM.
 */
export function stripHtml(html: string): string {
  const spaced = html.replaceAll(BR_TAG_RE, ' ').replaceAll(BLOCK_TAG_RE, ' </$1>');

  if (typeof document === 'undefined') {
    return spaced.replaceAll(/<[^>]*>/g, ' ').replaceAll(/\s+/g, ' ').trim();
  }
  const div = document.createElement('div');
  div.innerHTML = spaced;
  return (div.textContent ?? div.innerText ?? '').replaceAll(/\s+/g, ' ').trim();
}
