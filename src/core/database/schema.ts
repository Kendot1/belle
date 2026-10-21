import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { VersionedEditorDocument } from '../../features/notes/types';

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey().notNull(),
  title: text('title').notNull().default(''),
  documentJson: text('document_json', { mode: 'json' }).$type<VersionedEditorDocument>().notNull(),
  plainText: text('plain_text').notNull().default(''),
  collection: text('collection').notNull().default('Personal'),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('notes_updated_at_idx').on(table.updatedAt),
  index('notes_collection_idx').on(table.collection),
]);

export const annotations = sqliteTable('annotations', {
  id: text('id').primaryKey().notNull(),
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  quote: text('quote').notNull(),
  prefix: text('prefix').notNull().default(''),
  suffix: text('suffix').notNull().default(''),
  editorPosition: integer('editor_position').notNull(),
  comment: text('comment').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [index('annotations_note_id_idx').on(table.noteId)]);
