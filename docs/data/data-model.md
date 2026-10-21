# Local data model

## Schema version 1

`notes` stores a stable UUID, title, versioned editor JSON, derived plain text, collection (`Personal`, `Work`, or `Ideas`), pinned flag, and created/updated millisecond timestamps. `annotations` stores a stable UUID, parent note UUID, selected quote, bounded prefix/suffix context, editor position hint, comment, and creation timestamp. Deleting a note cascades to its comments and removes the FTS row.

`notes_fts` is an FTS5 virtual table with note ID, title, and body columns. Insert/update/delete triggers keep it in step with the `notes` row. The note mutation and annotation insertion use a database transaction when a comment is added with content changes. Migrations are versioned in `drizzle/meta/_journal.json` and applied through Drizzle's migration gate.

## Editor document

The canonical editor value is `{ version: 1, doc: <TipTap JSON> }`. Rich text is persisted as structured JSON rather than executable HTML. A pure traversal derives plain text for search and previews. Supported marks and blocks are intentionally limited to paragraph, heading, bold, italic, underline, highlight, blockquote, bullet/ordered list, list item, and hard break. Comment review maps resolved plain-text ranges back to editor positions for source navigation.

## Annotation recovery

An annotation quote is searched in the latest derived text. One occurrence resolves directly. For repeated occurrences, the stored prefix/suffix choose a unique candidate only when the context score is non-zero and uniquely highest. No candidate means `missing`; tied candidates mean `ambiguous`. The position hint is advisory. The UI keeps the original quote/comment visible when the anchor needs review; manual reattachment is not in the MVP.

## Attachments, PDFs, and lifecycle

There is no attachment/PDF table or file import path in this MVP. PDF identity, page identity, sandbox file paths, integrity metadata, PDFKit annotations, original-file preservation, and export/restore behavior require separate design and device QA. Deleting a note removes its relational comments and search entry; no backup or secure-erasure claim is made.
