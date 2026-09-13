import type { Project } from "../../narrative-engine/types.ts";

export const KIT_MARK = "# kit:combat";

export const COMBAT_TAXONOMY = `${KIT_MARK}
weapon → object
hostile → agent
mortal → agent
`;

export const COMBAT_RULES = `# attack combat
ON: *.hostile
IF: JOGADOR.intent=attack
IF: $.hp>=1
DO: $.hp-JOGADOR.force
    $.mood - 1
SEMANTIC: agency
narrativa: "{$.name} sofre o golpe."

# death
ON: *.mortal
IF: $.hp<=0
DO: $.dead
    EMIT morte
SEMANTIC: lifecycle
narrativa: "{$.name} cai."
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

export function applyCombatKit(project: Project): Project {
  if (kitApplied(project)) return project;
  return {
    ...project,
    taxonomySource: mergeTaxonomy(project.taxonomySource, COMBAT_TAXONOMY),
    rulesSource: mergeRules(project.rulesSource, COMBAT_RULES),
  };
}
