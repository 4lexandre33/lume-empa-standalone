import { joinCommandHead, lastCommandText, parseIntent } from "./parser.ts";

/**
 * Apply an autocomplete token to the current command text.
 * Replaces a partial last segment, or appends after a trailing dot.
 * Adds a trailing dot when the result is still incomplete.
 */
export function applySuggestion(text: string, token: string): string {
  const tail = lastCommandText(text);
  const applied = applySingleSuggestion(tail, token);
  return joinCommandHead(text, applied);
}

function applySingleSuggestion(text: string, token: string): string {
  const raw = text.trim();
  if (!raw) return `intent.${token}.`;

  const trailingDot = raw.endsWith(".");
  const parts = raw.split(".");
  if (trailingDot && parts[parts.length - 1] === "") parts.pop();

  if (!trailingDot && parts.length === 1 && parts[0]!.toLowerCase() === "intent") {
    parts.push(token);
  } else if (!trailingDot && parts.length > 0) {
    parts[parts.length - 1] = token;
  } else {
    parts.push(token);
  }

  let next = parts.join(".");
  const parsed = parseIntent(next);
  if (parsed.status === "incomplete" && !next.endsWith(".")) next += ".";
  return next;
}

/** Autocomplete opens after a dot: `intent.` or `intent.action.mo`. */
export function isAutocompleteSlot(text: string): boolean {
  const trimmed = lastCommandText(text).trim();
  if (!trimmed.includes(".")) return false;
  return trimmed.endsWith(".") || /\.[^.]+$/.test(trimmed);
}
