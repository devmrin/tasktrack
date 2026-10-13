const EMPTY_HTML = /^<p>(<\/p>|<br\s*\/?>)?<\/p>$/i;

/** Pasted images have no text nodes, but they are still description content. */
const CONTAINS_IMAGE = /<img\b/i;

export function isEmptyEditorHtml(html: string): boolean {
  if (!html || EMPTY_HTML.test(html)) {
    return true;
  }
  if (CONTAINS_IMAGE.test(html)) {
    return false;
  }
  return html.replaceAll(/<[^>]*>/g, '').trim() === '';
}
