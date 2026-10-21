export type SearchPlan = { kind: 'all' } | { kind: 'empty' } | { kind: 'match'; expression: string };

export function planSearch(query?: string | null): SearchPlan {
  const normalized = query?.trim() ?? '';
  if (!normalized) return { kind: 'all' };

  const terms = normalized.match(/[\p{L}\p{N}_]+/gu) ?? [];
  if (!terms.length) return { kind: 'empty' };

  const expression = terms.map((term) => `"${term.replace(/"/g, '""')}"*`).join(' AND ');
  return { kind: 'match', expression };
}
