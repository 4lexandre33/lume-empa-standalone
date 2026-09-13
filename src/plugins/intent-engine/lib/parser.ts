import type {
  Intent,
  IntentFamily,
  IntentParseError,
  IntentParseErrorCode,
  ParseIntentOptions,
} from "../types.ts";
import { catalogPathOf, intentCatalog } from "./catalog.ts";

const IDENT_RE = /^[\p{L}_][\p{L}\p{N}\p{M}_]*$/u;
const FAMILIES = new Set<IntentFamily>(["perceive", "cognize", "action"]);

export function splitCommands(text: string): string[] {
  return text
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function lastCommandText(text: string): string {
  const index = text.lastIndexOf(";");
  if (index < 0) return text;
  return text.slice(index + 1).trimStart();
}

export function joinCommandHead(text: string, nextTail: string): string {
  const index = text.lastIndexOf(";");
  if (index < 0) return nextTail;
  return `${text.slice(0, index + 1).replace(/\s*$/, " ")}${nextTail.replace(/^\s+/, "")}`;
}

function error(code: IntentParseErrorCode, message: string, token?: string): IntentParseError {
  return token ? { code, message, token } : { code, message };
}

function baseIntent(raw: string, options: ParseIntentOptions): Intent {
  return {
    source: options.source ?? "player",
    raw,
    status: "incomplete",
    operation: [],
    args: {},
    actor: options.actor ?? "JOGADOR",
  };
}

function withError(intent: Intent, err: IntentParseError): Intent {
  return { ...intent, status: "invalid", error: err, partialToken: undefined };
}

/**
 * Parse a dotted command into an Intent.
 * Does not consult the world and does not execute anything.
 */
export function parseIntent(text: string, options: ParseIntentOptions = {}): Intent {
  const intent = baseIntent(text, options);
  const trimmed = text.trim();
  if (!trimmed) return intent;

  const trailingDot = trimmed.endsWith(".");
  const segments = trimmed.split(".").map((s) => s.trim());
  if (trailingDot && segments[segments.length - 1] === "") segments.pop();

  if (segments.some((s) => s.length === 0)) {
    return withError(intent, error("EMPTY_SEGMENT", "segmento vazio no comando"));
  }

  for (const segment of segments) {
    if (!IDENT_RE.test(segment)) {
      return withError(intent, error("INVALID_SYNTAX", `token inválido: ${segment}`, segment));
    }
  }

  const root = segments[0]!.toLowerCase();
  if (root !== "intent") {
    return withError(intent, error("UNKNOWN_ROOT", 'comando deve começar com "intent"', segments[0]));
  }

  const rest = segments.slice(1);
  let family: IntentFamily | undefined;
  const operation: string[] = [];
  let node = intentCatalog.getRoot();
  let index = 0;

  while (index < rest.length) {
    const token = rest[index]!;
    const key = token.toLowerCase();
    const childTokens = node.childTokens;

    if (childTokens.includes(key)) {
      const nextPath = catalogPathOf(family, family ? [...operation, key] : []);
      const nextNode = intentCatalog.getNode(family ? nextPath : key);
      if (!nextNode) {
        return withError(intent, error("UNKNOWN_TOKEN", `token desconhecido: ${token}`, token));
      }
      if (!family) {
        if (!FAMILIES.has(key as IntentFamily)) {
          return withError(intent, error("UNKNOWN_TOKEN", `token desconhecido: ${token}`, token));
        }
        family = key as IntentFamily;
      } else {
        operation.push(key);
      }
      node = nextNode;
      index += 1;
      continue;
    }

    const isLast = index === rest.length - 1;
    if (isLast && !trailingDot) {
      const prefixes = childTokens.filter((child) => child.startsWith(key));
      if (prefixes.length > 0) {
        return {
          ...intent,
          status: "incomplete",
          family,
          operation,
          partialToken: token,
        };
      }
    }

    if (childTokens.length > 0) {
      return withError(
        { ...intent, family, operation },
        error("UNKNOWN_TOKEN", `token desconhecido: ${token}`, token),
      );
    }

    const remaining = rest.slice(index);
    const defs = node.arguments;
    if (remaining.length > defs.length) {
      const extra = remaining[defs.length]!;
      return withError(
        { ...intent, family, operation },
        error("UNEXPECTED_ARGUMENT", `argumento inesperado: ${extra}`, extra),
      );
    }

    const args: Record<string, string> = {};
    for (let i = 0; i < remaining.length; i++) {
      args[defs[i]!.name] = remaining[i]!;
    }
    index = rest.length;
    const filled: Intent = { ...intent, family, operation, args };
    return finalize(filled, intentCatalog.getNode(catalogPathOf(family, operation))!, trailingDot);
  }

  const current = { ...intent, family, operation };
  return finalize(current, node, trailingDot);
}

function finalize(intent: Intent, node: { childTokens: string[]; arguments: { name: string; required: boolean }[] }, trailingDot: boolean): Intent {
  if (node.childTokens.length > 0) {
    return { ...intent, status: "incomplete" };
  }

  const missing = node.arguments.filter((arg) => arg.required && intent.args[arg.name] == null);
  if (missing.length > 0) {
    return { ...intent, status: "incomplete" };
  }

  if (trailingDot) {
    const optionalLeft = node.arguments.filter((arg) => !arg.required && intent.args[arg.name] == null);
    if (optionalLeft.length > 0) {
      return { ...intent, status: "incomplete" };
    }
    return withError(intent, error("UNEXPECTED_ARGUMENT", "comando não aceita mais segmentos", "."));
  }

  return { ...intent, status: "complete" };
}

export function catalogPathFromIntent(intent: Intent): string {
  return catalogPathOf(intent.family, intent.operation);
}
