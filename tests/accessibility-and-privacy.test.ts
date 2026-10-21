import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const readProjectFile = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

test('notes and editor screens expose accessibility labels and useful state controls', () => {
  const list = readProjectFile('src/app/index.tsx');
  const editor = readProjectFile('src/app/note/[id].tsx');
  const buttons = readProjectFile('src/core/components/ActionButton.tsx');
  for (const marker of ['accessibilityLabel="Search notes by title or content"', 'testID="notes-search"', 'accessibilityState={{ selected }}', 'accessibilityLabel={`Actions for']) {
    assert.ok(list.includes(marker), `notes list is missing ${marker}`);
  }
  for (const marker of ['accessibilityLabel="Note title"', 'accessibilityLabel={`Save status: ${statusLabel}`}', 'accessibilityLabel="Bold selected text"', 'accessibilityLabel="Open on-device AI actions"', 'accessibilityRole="alert"', 'testID="cancel-ai"']) {
    assert.ok(editor.includes(marker), `note editor is missing ${marker}`);
  }
  for (const bridge of ['CoreBridge', 'ListItemBridge', 'HardBreakBridge']) {
    assert.ok(editor.includes(bridge), `rich text editor is missing required ${bridge}`);
  }
  assert.ok(editor.includes('editor.setContent(document.doc);'), 'loaded note content must notify the editor content hook');
  assert.ok(list.includes('testID="privacy-info"'));
  assert.ok(editor.includes('testID="open-comments"'));
  assert.ok(editor.includes('testID={`show-annotation-source-${annotation.id}`}'));
  assert.match(list, /filterChip: \{ minHeight: 44/);
  assert.match(editor, /collectionChip: \{ minHeight: 44/);
  assert.match(editor, /removeAnnotation: \{ minHeight: 44/);
  assert.match(buttons, /button: \{ minHeight: 48/);
  assert.match(buttons, /compact: \{ minHeight: 44/);
});

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|swift)$/.test(entry.name) ? [path] : [];
  });
}

test('app source has no remote request APIs or embedded network URLs', () => {
  const files = [
    ...sourceFiles(join(projectRoot, 'src')),
    ...sourceFiles(join(projectRoot, 'modules/local-ai/ios')),
  ];
  const violations = files.filter((file) => /\bfetch\s*\(|XMLHttpRequest|\baxios\b|https?:\/\//i.test(readFileSync(file, 'utf8')));
  assert.deepEqual(violations, []);
});

test('AI remains optional in the UI when the local native module is missing or unavailable', () => {
  const adapter = readProjectFile('src/core/platform/local-ai.ts');
  const editor = readProjectFile('src/app/note/[id].tsx');
  assert.ok(adapter.includes('requireOptionalNativeModule'));
  assert.ok(adapter.includes("Platform.OS === 'ios' ? 'native_module_missing' : 'unsupported_platform'"));
  assert.ok(editor.includes('{aiAvailability.message}'));
  assert.ok(editor.includes('disabled={!aiAvailability.available}'));
});
