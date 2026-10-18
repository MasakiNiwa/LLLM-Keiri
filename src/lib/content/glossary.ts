import { normalizeName } from './accounts.ts';
import type { GlossaryTerm } from './schema.ts';

/** 用語集から、用語または別名で引く */
export function findTerm(
  glossary: GlossaryTerm[] | undefined,
  name: string,
): GlossaryTerm | undefined {
  if (!glossary) return undefined;
  const n = normalizeName(name);
  return glossary.find(
    (g) => normalizeName(g.term) === n || g.aliases.some((a) => normalizeName(a) === n),
  );
}
