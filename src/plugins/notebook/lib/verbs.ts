/** Leaf intents, same keys as nlp. Notebook does not import nlp. */

function foldKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

const VERBS: Record<string, string> = {};

function add(keys: string[], leaf: string): void {
  for (const key of keys) VERBS[foldKey(key)] = leaf;
}

add(["take", "get", "grab", "pick", "pegar", "pega", "pegue", "apanhar", "apanha", "segurar", "segura", "recolhe"], "take");
add(["drop", "largar", "larga", "soltar", "solta", "deita"], "drop");
add(["put", "insert", "guardar", "guarda", "por", "poe", "mete", "coloca", "meter"], "put");
add(["give", "offer", "dar", "da", "oferece", "entrega"], "give");
add(["open", "abrir", "abre"], "open");
add(["close", "shut", "fechar", "fecha"], "close");
add(["lock", "trancar", "tranca"], "lock");
add(["unlock", "destrancar", "destranca"], "unlock");
add(["use", "usar", "usa"], "use");
add(["attack", "hit", "fight", "smash", "kill", "atacar", "ataca", "bater", "bate", "matar", "mata", "golpeia"], "attack");
add(["talk", "speak", "greet", "hello", "falar", "fala", "conversar", "conversa", "oi", "ola"], "talk");
add(["ask", "perguntar", "pergunta", "questiona"], "ask");
add(["tell", "inform", "contar", "conta", "diz", "dizer"], "tell");
add(["bye", "goodbye", "adeus", "tchau"], "bye");
add(["go", "walk", "enter", "climb", "run", "ir", "vai", "move", "mover", "mova", "entra", "anda"], "go");
add(["look", "l", "olhar", "olha"], "look");
add(["inventory", "i", "inv", "inventario"], "inventory");
add(["wait", "z", "esperar", "espera", "aguarda", "aguardar"], "wait");
add(["communicate", "comunicar", "comunica"], "communicate");
add(["observe", "observar", "observa"], "observe");
add(["inspect", "examine", "x", "check", "read", "inspecionar", "inspeciona", "examina", "examinar", "ler"], "inspect");
add(["listen", "escutar", "escuta", "ouve", "ouvir"], "listen");
add(["locate", "find", "encontrar", "encontra"], "locate");
add(["remember", "recall", "lembrar", "lembra"], "remember");

export function intentLeaf(verb: string): string | null {
  return VERBS[foldKey(verb)] ?? null;
}

const VERB_LABELS: Record<string, string> = {
  take: "pegar",
  drop: "largar",
  put: "guardar",
  give: "oferecer",
  open: "abrir",
  close: "fechar",
  lock: "trancar",
  unlock: "destrancar",
  use: "usar",
  attack: "atacar",
  talk: "falar",
  ask: "perguntar",
  tell: "contar",
  bye: "despedir-se",
  go: "ir",
  look: "olhar",
  inventory: "inventar",
  wait: "esperar",
  communicate: "comunicar",
  observe: "observar",
  inspect: "examinar",
  listen: "ouvir",
  locate: "encontrar",
  remember: "lembrar",
};

export function verbLabel(leaf: string): string {
  return VERB_LABELS[leaf] ?? leaf;
}
