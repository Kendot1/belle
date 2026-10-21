export type EditorNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: EditorNode[];
};

export type VersionedEditorDocument = { version: 1; doc: EditorNode };

export type Note = {
  id: string;
  title: string;
  document: VersionedEditorDocument;
  plainText: string;
  collection: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

export const COLLECTIONS = ['Personal', 'Work', 'Ideas'] as const;
export type NoteCollection = (typeof COLLECTIONS)[number];

export const EMPTY_DOCUMENT: VersionedEditorDocument = {
  version: 1,
  doc: { type: 'doc', content: [{ type: 'paragraph' }] },
};

export function plainTextFromDocument(document: VersionedEditorDocument): string {
  function read(node: EditorNode): string {
    if (node.type === 'text') return node.text ?? '';
    if (node.type === 'hardBreak') return '\n';
    const body = (node.content ?? []).map(read).join('');
    return ['paragraph', 'heading', 'listItem', 'codeBlock'].includes(node.type) ? `${body}\n` : body;
  }
  return read(document.doc).replace(/^\n+|\n+$/g, '').replace(/\n{3,}/g, '\n\n');
}

export function makePreview(text: string, maxLength = 150): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trimEnd()}…` : normalized;
}
