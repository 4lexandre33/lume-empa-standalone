import type { Project } from "../../narrative-engine/types.ts";
import { RELATION_CATEGORIES } from "../data/relations.ts";

export const KIT_MARK = "# kit:social";

const CATEGORY_LINES = RELATION_CATEGORIES.map((tag) => `${tag} → relation`).join("\n");

export const SOCIAL_TAXONOMY = `${KIT_MARK}
relation → information
memory → information
${CATEGORY_LINES}
`;

export const SOCIAL_RULES = `# talk cold
ON: *.agent
IF: JOGADOR.intent=talk
IF: $.mood=0
SEMANTIC: agency
narrativa: "{$.name} encara-te em silêncio."

# talk social
ON: *.agent
IF: JOGADOR.intent=talk
IF: $.mood>=0
DO: $.mood+1
    (link $.rel).affinity+1
SEMANTIC: agency
narrativa: "{$.name} aquece um pouco."

# communicate cold
ON: *.agent
IF: JOGADOR.intent=communicate
IF: $.mood=0
SEMANTIC: agency
narrativa: "{$.name} encara-te em silêncio."

# communicate social
ON: *.agent
IF: JOGADOR.intent=communicate
IF: $.mood>=0
DO: $.mood+1
    (link $.rel).affinity+1
SEMANTIC: agency
narrativa: "{$.name} aquece um pouco."

# tell social
ON: *.agent
IF: JOGADOR.intent=tell
IF: $.mood>=0
DO: (link $.rel).affinity+1
SEMANTIC: cognition
narrativa: "{$.name} guarda o que ouviu."

# attack mood
ON: *.agent
IF: JOGADOR.intent=attack
IF: $.mood>=0
DO: $.mood - 1
SEMANTIC: agency
narrativa: "{$.name} encara o golpe."

# affinity floor
ON: *.relation
IF: $.affinity<0
SEMANTIC: constraint
narrativa: "A relação está partida."
`;

const CHILD_RE = /^([\p{L}_][\p{L}\p{N}\p{M}_]*)\s*(→|->)/u;

function declaredChildren(source: string): Set<string> {
  const out = new Set<string>();
  for (const line of source.split(/\r?\n/)) {
    const m = line.trim().match(CHILD_RE);
    if (m?.[1]) out.add(m[1]);
  }
  return out;
}

function mergeTaxonomy(existing: string, kit: string): string {
  if (existing.includes(KIT_MARK)) return existing;
  const skip = declaredChildren(existing);
  const kept = kit.split(/\r?\n/).filter((line) => {
    const m = line.trim().match(CHILD_RE);
    if (m?.[1] && skip.has(m[1])) return false;
    return true;
  });
  const body = kept.join("\n").trim();
  if (!body) return existing;
  return existing.trim() ? `${existing.trimEnd()}\n\n${body}\n` : `${body}\n`;
}

function mergeRules(existing: string, kit: string): string {
  return existing.trim() ? `${existing.trimEnd()}\n\n${kit.trim()}\n` : `${kit.trim()}\n`;
}

export function kitApplied(project: Project): boolean {
  return project.taxonomySource.includes(KIT_MARK);
}

export function applySocialKit(project: Project): Project {
  if (kitApplied(project)) return project;
  return {
    ...project,
    taxonomySource: mergeTaxonomy(project.taxonomySource, SOCIAL_TAXONOMY),
    rulesSource: mergeRules(project.rulesSource, SOCIAL_RULES),
  };
}
