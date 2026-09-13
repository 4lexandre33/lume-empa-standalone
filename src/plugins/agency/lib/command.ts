const PERCEIVE = new Set(["observe", "inspect", "locate", "listen"]);
const COGNIZE = new Set(["evaluate", "remember", "compare", "decide"]);
const ACTION_LEAF = new Set(["move", "go", "look", "inventory", "wait", "communicate"]);
const INTERACT = new Set(["take", "drop", "put", "give", "open", "close", "lock", "unlock", "use", "attack", "talk", "ask", "tell", "bye"]);

export type IntentEffect = { actor: string; command: string };

export function commandFromEffectArgs(args: readonly string[]): IntentEffect | null {
  const [actor, ...rest] = args;
  if (!actor || rest.length === 0) return null;
  const tokens = rest[0]?.toLowerCase() === "intent" ? rest.slice(1) : rest;
  if (tokens.length === 0) return null;
  const head = tokens[0]!.toLowerCase();
  if (head === "action" || head === "perceive" || head === "cognize") {
    return { actor, command: ["intent", ...tokens].join(".") };
  }
  if (PERCEIVE.has(head)) return { actor, command: ["intent", "perceive", ...tokens].join(".") };
  if (COGNIZE.has(head)) return { actor, command: ["intent", "cognize", ...tokens].join(".") };
  if (ACTION_LEAF.has(head)) return { actor, command: ["intent", "action", ...tokens].join(".") };
  if (INTERACT.has(head)) return { actor, command: ["intent", "action", "interact", ...tokens].join(".") };
  return { actor, command: ["intent", "action", ...tokens].join(".") };
}
