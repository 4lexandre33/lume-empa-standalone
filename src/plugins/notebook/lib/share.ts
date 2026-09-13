import { slugOf } from "./notebook.ts";
import { parseCadernoLibrary } from "./pages.ts";

function isCadernoLine(line: string): boolean {
  return /^(caderno)\s*:/i.test(
    line
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .trim(),
  );
}

export function cadernoFilename(title: string): string {
  const slug = slugOf(title).toLowerCase().replace(/_/g, "-") || "caderno";
  return `${slug}.lume.caderno.md`;
}

export function exportCadernoMd(text: string, bookId?: string): string {
  const raw = text.replace(/^\uFEFF/, "");
  if (!bookId) return raw.endsWith("\n") || !raw ? raw : `${raw}\n`;
  const lib = parseCadernoLibrary(raw);
  const book = lib.books.find((item) => item.id === bookId);
  if (!book) return "";
  const lines = raw.split(/\n/);
  const slice = lines.slice(book.startLine - 1, book.endLine).join("\n").replace(/\n+$/, "");
  return slice ? `${slice}\n` : "";
}

export function importCaderno(into: string, incoming: string): string {
  const block = incoming.replace(/^\uFEFF/, "").replace(/\n+$/, "").trim();
  if (!block) return into;
  const first = block.split(/\n/).find((line) => line.trim()) ?? "";
  const body = isCadernoLine(first) ? block : `CADERNO:\n${block}`;
  if (!into.trim()) return `${body}\n`;
  return `${into.replace(/\n+$/, "")}\n\n${body}\n`;
}
