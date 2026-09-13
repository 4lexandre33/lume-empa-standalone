import type { Project } from "../../narrative-engine/types.ts";
import { CHANNEL_KINDS } from "../data/channels.ts";

export const KIT_MARK = "# kit:channel";

const KIND_LINES = CHANNEL_KINDS.map((tag) => `${tag} → channel`).join("\n");

export const CHANNEL_TAXONOMY = `${KIT_MARK}
channel → abstract
${KIND_LINES}
`;

export const CHANNEL_RULES = `# channel advance
ON: *.channel
IF: $.intent=advance
IF: $.state>=0
DO: $.state+1
SEMANTIC: process
narrativa: "{$.name} avança."

# channel then
ON: *.channel
IF: $.state>=0
DO: $.state+1
SEMANTIC: process
narrativa: "{$.name} avança."
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

export function applyChannelKit(project: Project): Project {
  if (kitApplied(project)) return project;
  return {
    ...project,
    taxonomySource: mergeTaxonomy(project.taxonomySource, CHANNEL_TAXONOMY),
    rulesSource: mergeRules(project.rulesSource, CHANNEL_RULES),
  };
}
