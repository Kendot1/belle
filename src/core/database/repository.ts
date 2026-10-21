import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as Crypto from 'expo-crypto';
import * as schema from './schema';
import { annotations, notes } from './schema';
import { planSearch } from './search';
import type { Annotation, AnnotationDraft, NoteFilters, NotesService } from '../../features/notes/service';
import { EMPTY_DOCUMENT, type Note, type VersionedEditorDocument } from '../../features/notes/types';

type Database = ExpoSQLiteDatabase<typeof schema>;

function toDomainNote(row: typeof notes.$inferSelect): Note {
  const document = row.documentJson?.version === 1 ? row.documentJson : EMPTY_DOCUMENT;
  return {
    id: row.id,
    title: row.title,
    document,
    plainText: row.plainText,
    collection: row.collection,
    pinned: row.pinned,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createNotesRepository(database: Database): NotesService {
  return {
    async list(filters: NoteFilters = {}) {
      const conditions: SQL<unknown>[] = [];
      if (filters.collection) conditions.push(eq(notes.collection, filters.collection));
      if (filters.pinnedOnly) conditions.push(eq(notes.pinned, true));
      const searchPlan = planSearch(filters.query);
      if (searchPlan.kind === 'empty') return [];
      if (searchPlan.kind === 'match') {
        conditions.push(sql`${notes.id} IN (SELECT note_id FROM notes_fts WHERE notes_fts MATCH ${searchPlan.expression})`);
      }
      const rows = await database.select().from(notes)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(notes.pinned), desc(notes.updatedAt));
      return rows.map(toDomainNote);
    },

    async get(id) {
      const [row] = await database.select().from(notes).where(eq(notes.id, id)).limit(1);
      return row ? toDomainNote(row) : null;
    },

    async create(collection = 'Personal') {
      const now = Date.now();
      const row = {
        id: Crypto.randomUUID(), title: '', documentJson: EMPTY_DOCUMENT, plainText: '',
        collection, pinned: false, createdAt: now, updatedAt: now,
      };
      await database.insert(notes).values(row);
      return {
        id: row.id,
        title: row.title,
        document: row.documentJson,
        plainText: row.plainText,
        collection: row.collection,
        pinned: row.pinned,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    },

    async saveContent(id, title, document: VersionedEditorDocument, plainText) {
      await database.update(notes).set({ title, documentJson: document, plainText, updatedAt: Date.now() }).where(eq(notes.id, id));
    },

    async saveContentWithAnnotation(id, title, document: VersionedEditorDocument, plainText, draft: AnnotationDraft) {
      const annotation: Annotation = { ...draft, id: Crypto.randomUUID(), noteId: id, createdAt: Date.now() };
      await database.transaction(async (transaction) => {
        await transaction.update(notes).set({ title, documentJson: document, plainText, updatedAt: Date.now() }).where(eq(notes.id, id));
        await transaction.insert(annotations).values(annotation);
      });
      return annotation;
    },

    async setPinned(id, pinned) {
      await database.update(notes).set({ pinned, updatedAt: Date.now() }).where(eq(notes.id, id));
    },

    async move(id, collection) {
      await database.update(notes).set({ collection, updatedAt: Date.now() }).where(eq(notes.id, id));
    },

    async remove(id) {
      await database.delete(notes).where(eq(notes.id, id));
    },

    async listAnnotations(noteId) {
      return await database.select().from(annotations).where(eq(annotations.noteId, noteId)).orderBy(desc(annotations.createdAt)) as Annotation[];
    },

    async removeAnnotation(id) {
      await database.delete(annotations).where(eq(annotations.id, id));
    },
  };
}
