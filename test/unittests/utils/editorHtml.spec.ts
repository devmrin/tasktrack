import assert from 'node:assert/strict';
import test from 'node:test';
import { isEmptyEditorHtml } from '@/utils/editorHtml';

test('isEmptyEditorHtml treats blank editor markup as empty', () => {
  assert.equal(isEmptyEditorHtml(''), true);
  assert.equal(isEmptyEditorHtml('<p></p>'), true);
  assert.equal(isEmptyEditorHtml('<p><br></p>'), true);
  assert.equal(isEmptyEditorHtml('<p><br/></p>'), true);
  assert.equal(isEmptyEditorHtml('<p><br /></p>'), true);
  assert.equal(isEmptyEditorHtml('<p>   </p>'), true);
  assert.equal(isEmptyEditorHtml('<p></p><p></p>'), true);
});

test('isEmptyEditorHtml treats text as content', () => {
  assert.equal(isEmptyEditorHtml('<p>note</p>'), false);
  assert.equal(isEmptyEditorHtml('<p>hello <strong>there</strong></p>'), false);
});

test('isEmptyEditorHtml treats an image-only description as content', () => {
  const pasted = [
    '<p><img src="data:image/png;base64,iVBORw0KGgo=" alt="Image"',
    ' class="max-w-full h-auto rounded-md my-2" loading="lazy" decoding="async"></p>',
  ].join('');
  assert.equal(isEmptyEditorHtml(pasted), false);
  assert.equal(isEmptyEditorHtml('<img src="https://example.com/a.png" />'), false);
  assert.equal(isEmptyEditorHtml('<p></p><img src="data:image/png;base64,abc" alt="">'), false);
});

test('isEmptyEditorHtml treats an image with surrounding text as content', () => {
  assert.equal(
    isEmptyEditorHtml('<p>see</p><p><img src="data:image/png;base64,abc" alt="shot"></p>'),
    false,
  );
});
