import assert from 'node:assert/strict';
import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

const migration = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle/0000_initial.sql'), 'utf8');

test('notes, comments, and the search index survive a database close and reopen', () => {
  const directory = mkdtempSync(join(tmpdir(), 'quiet-notes-'));
  const path = join(directory, 'notes.sqlite');
  let database = new DatabaseSync(path);
  try {
    database.exec(migration);
    database.prepare(`INSERT INTO notes (id, title, document_json, plain_text, collection, pinned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('note-1', 'Kitchen list', '{"version":1}', 'Buy oat milk and tea', 'Personal', 0, 10, 10);
    database.prepare(`INSERT INTO annotations (id, note_id, quote, prefix, suffix, editor_position, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('comment-1', 'note-1', 'oat milk', 'Buy ', ' and tea', 4, 'For coffee', 11);

    assert.equal(database.prepare('SELECT note_id FROM notes_fts WHERE notes_fts MATCH ?').all('"milk"*').length, 1);
    database.prepare('UPDATE notes SET plain_text = ?, updated_at = ? WHERE id = ?').run('Pick up fresh basil', 12, 'note-1');
    assert.equal(database.prepare('SELECT note_id FROM notes_fts WHERE notes_fts MATCH ?').all('"milk"*').length, 0);
    assert.equal(database.prepare('SELECT note_id FROM notes_fts WHERE notes_fts MATCH ?').all('"basil"*').length, 1);

    database.close();
    database = new DatabaseSync(path);
    const persisted = database.prepare('SELECT title, plain_text, updated_at FROM notes WHERE id = ?').get('note-1') as { title: string; plain_text: string; updated_at: number };
    assert.deepEqual({ ...persisted }, { title: 'Kitchen list', plain_text: 'Pick up fresh basil', updated_at: 12 });
    assert.equal(database.prepare('SELECT count(*) AS total FROM annotations WHERE note_id = ?').get('note-1')?.total, 1);
    assert.equal(database.prepare('SELECT note_id FROM notes_fts WHERE notes_fts MATCH ?').all('"basil"*').length, 1);

    database.prepare('DELETE FROM notes WHERE id = ?').run('note-1');
    assert.equal(database.prepare('SELECT count(*) AS total FROM annotations WHERE note_id = ?').get('note-1')?.total, 0);
    assert.equal(database.prepare('SELECT count(*) AS total FROM notes_fts WHERE note_id = ?').get('note-1')?.total, 0);
  } finally {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
