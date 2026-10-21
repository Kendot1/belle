import type { Note, VersionedEditorDocument } from './types';

export type NoteFilters = { query?: string; collection?: string | null; pinnedOnly?: boolean };

export type Annotation = {
  id: string;
  noteId: string;
  quote: string;
  prefix: string;
  suffix: string;
  editorPosition: number;
  comment: string;
  createdAt: number;
};

export type AnnotationDraft = Omit<Annotation, 'id' | 'noteId' | 'createdAt'>;

export interface NotesService {
  list(filters?: NoteFilters): Promise<Note[]>;
  get(id: string): Promise<Note | null>;
  create(collection?: string): Promise<Note>;
  saveContent(id: string, title: string, document: VersionedEditorDocument, plainText: string): Promise<void>;
  saveContentWithAnnotation(id: string, title: string, document: VersionedEditorDocument, plainText: string, annotation: AnnotationDraft): Promise<Annotation>;
  setPinned(id: string, pinned: boolean): Promise<void>;
  move(id: string, collection: string): Promise<void>;
  remove(id: string): Promise<void>;
  listAnnotations(noteId: string): Promise<Annotation[]>;
  removeAnnotation(id: string): Promise<void>;
}
