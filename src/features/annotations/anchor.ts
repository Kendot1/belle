export type AnnotationAnchor = { quote: string; prefix: string; suffix: string; editorPosition: number };

export type AnchorResolution =
  | { status: 'attached'; start: number; end: number }
  | { status: 'ambiguous'; candidates: number[] }
  | { status: 'missing'; candidates: [] };

type AnchorDocumentNode = { type: string; text?: string; content?: AnchorDocumentNode[] };

const CONTEXT_LIMIT = 64;

function occurrenceIndexes(text: string, quote: string): number[] {
  if (!quote) return [];
  const positions: number[] = [];
  let from = 0;
  while (from <= text.length - quote.length) {
    const index = text.indexOf(quote, from);
    if (index < 0) break;
    positions.push(index);
    from = index + 1;
  }
  return positions;
}

export function createAnnotationAnchor(documentText: string, quote: string, editorPosition: number): AnnotationAnchor {
  const candidates = occurrenceIndexes(documentText, quote);
  const nearest = candidates.reduce<number | null>((best, index) => {
    if (best === null) return index;
    return Math.abs(index - editorPosition) < Math.abs(best - editorPosition) ? index : best;
  }, null);
  const start = nearest ?? Math.max(0, Math.min(editorPosition, documentText.length));
  return {
    quote,
    prefix: documentText.slice(Math.max(0, start - CONTEXT_LIMIT), start),
    suffix: nearest === null ? '' : documentText.slice(start + quote.length, start + quote.length + CONTEXT_LIMIT),
    editorPosition,
  };
}

function contextScore(text: string, start: number, anchor: AnnotationAnchor): number {
  const before = text.slice(Math.max(0, start - anchor.prefix.length), start);
  const afterStart = start + anchor.quote.length;
  const after = text.slice(afterStart, afterStart + anchor.suffix.length);
  return Number(Boolean(anchor.prefix) && before === anchor.prefix)
    + Number(Boolean(anchor.suffix) && after === anchor.suffix);
}

export function resolveAnnotationAnchor(documentText: string, anchor: AnnotationAnchor): AnchorResolution {
  const candidates = occurrenceIndexes(documentText, anchor.quote);
  if (!candidates.length) return { status: 'missing', candidates: [] };
  if (candidates.length === 1) return { status: 'attached', start: candidates[0], end: candidates[0] + anchor.quote.length };

  const scores = candidates.map((start) => contextScore(documentText, start, anchor));
  const highest = Math.max(...scores);
  const winners = candidates.filter((_, index) => scores[index] === highest);
  if (highest > 0 && winners.length === 1) return { status: 'attached', start: winners[0], end: winners[0] + anchor.quote.length };
  return { status: 'ambiguous', candidates };
}

function editorPositionsByPlainTextOffset(document: { doc: AnchorDocumentNode }): number[] {
  const rawTextParts: string[] = [];
  const rawPositions: number[] = [];
  const append = (value: string, position: number) => {
    rawTextParts.push(value);
    for (let index = 0; index < value.length; index += 1) rawPositions.push(position + index);
  };

  const read = (node: AnchorDocumentNode, position: number): number => {
    if (node.type === 'text') {
      const value = node.text ?? '';
      append(value, position);
      return position + value.length;
    }
    if (node.type === 'hardBreak') {
      append('\n', position);
      return position + 1;
    }

    let cursor = position + (node.type === 'doc' ? 0 : 1);
    for (const child of node.content ?? []) cursor = read(child, cursor);
    if (['paragraph', 'heading', 'listItem', 'codeBlock'].includes(node.type)) append('\n', cursor);
    return cursor + (node.type === 'doc' ? 0 : 1);
  };

  read(document.doc, 0);
  const rawText = rawTextParts.join('');
  let first = 0;
  let last = rawText.length;
  while (first < last && rawText[first] === '\n') first += 1;
  while (last > first && rawText[last - 1] === '\n') last -= 1;

  const positions: number[] = [];
  for (let index = first; index < last;) {
    if (rawText[index] !== '\n') {
      positions.push(rawPositions[index]);
      index += 1;
      continue;
    }
    let end = index + 1;
    while (end < last && rawText[end] === '\n') end += 1;
    for (let keep = index; keep < Math.min(end, index + 2); keep += 1) positions.push(rawPositions[keep]);
    index = end;
  }
  return positions;
}

export function plainTextOffsetToEditorPosition(document: { doc: AnchorDocumentNode }, offset: number): number | null {
  if (!Number.isInteger(offset) || offset < 0) return null;
  const positions = editorPositionsByPlainTextOffset(document);
  return offset < positions.length ? positions[offset] : null;
}

export function editorPositionToPlainTextOffset(document: { doc: AnchorDocumentNode }, position: number): number | null {
  if (!Number.isInteger(position) || position < 0) return null;
  const offset = editorPositionsByPlainTextOffset(document).indexOf(position);
  return offset >= 0 ? offset : null;
}
