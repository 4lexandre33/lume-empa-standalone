import type {
  CatalogKind,
  CatalogNode,
  IntentArgumentDef,
  IntentCatalogService,
} from "../types.ts";

type CatalogEntry = {
  token: string;
  kind: CatalogKind;
  label: string;
  description: string;
  arguments: IntentArgumentDef[];
  children: Record<string, CatalogEntry>;
};

function leaf(
  token: string,
  label: string,
  description: string,
  args: IntentArgumentDef[] = [],
): CatalogEntry {
  return { token, kind: "operation", label, description, arguments: args, children: {} };
}

function branch(
  token: string,
  kind: CatalogKind,
  label: string,
  description: string,
  children: Record<string, CatalogEntry>,
): CatalogEntry {
  return { token, kind, label, description, arguments: [], children };
}

const TARGET: IntentArgumentDef = { name: "target", type: "entity", required: true };
const TARGET_OPTIONAL: IntentArgumentDef = { name: "target", type: "entity", required: false };
const SCOPE: IntentArgumentDef = { name: "target", type: "scope", required: true };
const OPTION: IntentArgumentDef = { name: "option", type: "option", required: true };
const DESTINATION: IntentArgumentDef = { name: "destination", type: "entity", required: true };
const GIVE_ARGS: IntentArgumentDef[] = [
  { name: "object", type: "entity", required: true },
  { name: "receiver", type: "entity", required: true },
];
const PUT_ARGS: IntentArgumentDef[] = [
  { name: "object", type: "entity", required: true },
  { name: "target", type: "entity", required: true },
];
const ASK_ARGS: IntentArgumentDef[] = [
  { name: "target", type: "entity", required: true },
  { name: "topic", type: "entity", required: true },
];
const USE_ARGS: IntentArgumentDef[] = [
  { name: "object", type: "entity", required: true },
  { name: "target", type: "entity", required: false },
];
const COMPARE_ARGS: IntentArgumentDef[] = [
  { name: "a", type: "entity", required: true },
  { name: "b", type: "entity", required: true },
];

const PERCEIVE = branch("perceive", "family", "PERCEIVE", "Aquisição deliberada de informação.", {
  observe: leaf("observe", "OBSERVE", "Observar o entorno ou um alvo.", [SCOPE]),
  inspect: leaf("inspect", "INSPECT", "Inspecionar uma entidade visível.", [TARGET]),
  locate: leaf("locate", "LOCATE", "Localizar uma entidade conhecida.", [TARGET]),
  listen: leaf("listen", "LISTEN", "Escutar o entorno ou um alvo.", [TARGET_OPTIONAL]),
});

const COGNIZE = branch("cognize", "family", "COGNIZE", "Operação cognitiva deliberada.", {
  evaluate: leaf("evaluate", "EVALUATE", "Avaliar uma entidade conhecida.", [TARGET]),
  remember: leaf("remember", "REMEMBER", "Recordar uma entidade conhecida.", [TARGET]),
  compare: leaf("compare", "COMPARE", "Comparar duas entidades.", COMPARE_ARGS),
  decide: leaf("decide", "DECIDE", "Decidir entre uma opção.", [OPTION]),
});

const INTERACT = branch("interact", "operation", "INTERACT", "Ação dirigida a uma entidade.", {
  take: leaf("take", "TAKE", "Pegar um objeto.", [TARGET]),
  drop: leaf("drop", "DROP", "Largar um objeto.", [TARGET]),
  put: leaf("put", "PUT", "Guardar um objeto num recipiente.", PUT_ARGS),
  give: leaf("give", "GIVE", "Entregar um objeto a alguém.", GIVE_ARGS),
  open: leaf("open", "OPEN", "Abrir um alvo.", [TARGET]),
  close: leaf("close", "CLOSE", "Fechar um alvo.", [TARGET]),
  lock: leaf("lock", "LOCK", "Trancar um alvo.", [TARGET]),
  unlock: leaf("unlock", "UNLOCK", "Destrancar um alvo.", [TARGET]),
  use: leaf("use", "USE", "Usar um objeto, opcionalmente sobre um alvo.", USE_ARGS),
  attack: leaf("attack", "ATTACK", "Atacar um alvo.", [TARGET]),
  talk: leaf("talk", "TALK", "Falar com um agente.", [TARGET]),
  ask: leaf("ask", "ASK", "Perguntar a um agente sobre um tópico.", ASK_ARGS),
  tell: leaf("tell", "TELL", "Contar um tópico a um agente.", ASK_ARGS),
  bye: leaf("bye", "BYE", "Encerrar a conversa com um agente.", [TARGET]),
});

const ACTION = branch("action", "family", "ACTION", "Intervenção deliberada no mundo.", {
  move: leaf("move", "MOVE", "Mover-se para um lugar.", [DESTINATION]),
  go: leaf("go", "GO", "Ir para um lugar (alias de move).", [DESTINATION]),
  look: leaf("look", "LOOK", "Olhar o lugar actual."),
  inventory: leaf("inventory", "INVENTORY", "Rever o que se carrega."),
  wait: leaf("wait", "WAIT", "Esperar, sem alvo."),
  interact: INTERACT,
  communicate: leaf("communicate", "COMMUNICATE", "Comunicar-se com um agente (alias de talk).", [TARGET]),
});

const ROOT: CatalogEntry = branch("intent", "root", "INTENT", "Raiz da linguagem de intenção.", {
  perceive: PERCEIVE,
  cognize: COGNIZE,
  action: ACTION,
});

function normalizePath(path: string): string[] {
  const parts = path
    .trim()
    .toLowerCase()
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts[0] === "intent") parts.shift();
  return parts;
}

function walk(path: string): { entry: CatalogEntry; path: string } | null {
  const parts = normalizePath(path);
  let entry = ROOT;
  for (const part of parts) {
    const child = entry.children[part];
    if (!child) return null;
    entry = child;
  }
  return { entry, path: parts.join(".") };
}

function toNode(entry: CatalogEntry, path: string): CatalogNode {
  return {
    token: entry.token,
    path,
    kind: entry.kind,
    label: entry.label,
    description: entry.description,
    arguments: entry.arguments.map((a) => ({ ...a })),
    childTokens: Object.keys(entry.children).sort(),
  };
}

function childrenOf(entry: CatalogEntry, parentPath: string): CatalogNode[] {
  return Object.keys(entry.children)
    .sort()
    .map((token) => {
      const child = entry.children[token]!;
      const path = parentPath ? `${parentPath}.${token}` : token;
      return toNode(child, path);
    });
}

export const intentCatalog: IntentCatalogService = {
  getRoot(): CatalogNode {
    return toNode(ROOT, "");
  },

  getNode(path: string): CatalogNode | null {
    const found = walk(path);
    if (!found) return null;
    return toNode(found.entry, found.path);
  },

  getChildren(path: string): CatalogNode[] {
    const found = walk(path);
    if (!found) return [];
    return childrenOf(found.entry, found.path);
  },

  getSignature(path: string): IntentArgumentDef[] {
    const found = walk(path);
    if (!found) return [];
    return found.entry.arguments.map((a) => ({ ...a }));
  },
};

export function catalogPathOf(family?: string, operation: readonly string[] = []): string {
  return [family, ...operation].filter(Boolean).join(".");
}
