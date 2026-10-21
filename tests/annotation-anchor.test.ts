import assert from 'node:assert/strict';
import test from 'node:test';
import * as anchors from '../src/features/annotations/anchor.ts';
import { createAnnotationAnchor, resolveAnnotationAnchor } from '../src/features/annotations/anchor.ts';

test('a unique quote remains attached when surrounding text changes', () => {
  const anchor = createAnnotationAnchor('Bring the blue notebook tomorrow.', 'blue notebook', 10);
  assert.deepEqual(resolveAnnotationAnchor('Please remember the blue notebook tomorrow.', anchor), { status: 'attached', start: 20, end: 33 });
});

test('a repeated quote resolves from nearby context after the quote moves', () => {
  const source = 'First thought: save this line. Later note: save this line. End.';
  const quote = 'save this line';
  const start = source.lastIndexOf(quote);
  const anchor = createAnnotationAnchor(source, quote, start);
  const edited = 'Opening note. First thought: save this line. Later note: save this line. End.';
  const resolvedStart = edited.lastIndexOf(quote);
  assert.deepEqual(resolveAnnotationAnchor(edited, anchor), { status: 'attached', start: resolvedStart, end: resolvedStart + quote.length });
});

test('identical repeated quotes with no unique context are marked ambiguous', () => {
  const anchor = createAnnotationAnchor('red flag and red flag', 'red flag', 2);
  const result = resolveAnnotationAnchor('red flag, then red flag', anchor);
  assert.equal(result.status, 'ambiguous');
  if (result.status === 'ambiguous') assert.deepEqual(result.candidates, [0, 15]);
});

test('a removed quote is marked missing', () => {
  const anchor = createAnnotationAnchor('a small note about rain', 'about rain', 13);
  assert.deepEqual(resolveAnnotationAnchor('a small note about wind', anchor), { status: 'missing', candidates: [] });
});

test('an empty quote never resolves to an arbitrary position', () => {
  const anchor = createAnnotationAnchor('a note', '', 3);
  assert.deepEqual(resolveAnnotationAnchor('a note', anchor), { status: 'missing', candidates: [] });
});

test('plain-text quote offsets map back to rich-text editor positions', () => {
  assert.equal(typeof anchors.plainTextOffsetToEditorPosition, 'function');
  assert.equal(typeof anchors.editorPositionToPlainTextOffset, 'function');
  if (typeof anchors.plainTextOffsetToEditorPosition !== 'function' || typeof anchors.editorPositionToPlainTextOffset !== 'function') return;

  const document = {
    version: 1 as const,
    doc: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second', marks: [{ type: 'bold' }] }] },
      ],
    },
  };
  assert.equal(anchors.plainTextOffsetToEditorPosition(document, 6), 8);
  assert.equal(anchors.plainTextOffsetToEditorPosition(document, 0), 1);
  assert.equal(anchors.plainTextOffsetToEditorPosition(document, 99), null);
  assert.equal(anchors.editorPositionToPlainTextOffset(document, 8), 6);
  assert.equal(anchors.editorPositionToPlainTextOffset(document, 6), 5);
  assert.equal(anchors.editorPositionToPlainTextOffset(document, 99), null);
});

test('position mapping preserves UTF-16 offsets and explicit line breaks', () => {
  const document = {
    version: 1 as const,
    doc: {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'A😀B' }, { type: 'hardBreak' }, { type: 'text', text: 'C' }],
      }],
    },
  };
  assert.equal(anchors.plainTextOffsetToEditorPosition(document, 1), 2);
  assert.equal(anchors.plainTextOffsetToEditorPosition(document, 4), 5);
  assert.equal(anchors.plainTextOffsetToEditorPosition(document, 5), 6);
  assert.equal(anchors.editorPositionToPlainTextOffset(document, 3), 2);
});
