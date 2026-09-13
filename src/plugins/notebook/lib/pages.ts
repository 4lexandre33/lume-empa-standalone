import { compileNotebook, slugOf } from "./notebook.ts";

export type CadernoCover = {
  title: string;
  author: string;
  date: string;
  dedication: string;
};

export type CadernoTocItem = {
  id: string;
  level: 0 | 2 | 3;
  title: string;
  line: number;
  bookId?: string;
};

export type CadernoPage = {
  id: string;
  title: string;
  level: 0 | 2 | 3;
  body: string;
  comments: string[];
  startLine: number;
  endLine: number;
  bookId?: string;
};

export type CadernoView = {
  cover: CadernoCover;
  toc: CadernoTocItem[];
  pages: CadernoPage[];
};

export type CadernoBook = CadernoView & {
  id: string;
  index: number;
  startLine: number;
  endLine: number;
};

export type CadernoLibrary = {
  books: CadernoBook[];
  toc: CadernoTocItem[];
  pages: CadernoPage[];
};

const COVER_KEYS = /^(caderno|autora|autor|data|dedicatoria)\s*:/i;

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function commentsOf(body: string): string[] {
  const out: string[] = [];
  for (const raw of body.split(/\n/)) {
    const m = raw.match(/\/\/\s*(.*)$/);
    if (m && m[1]!.trim()) out.push(m[1]!.trim());
  }
  return out;
}

function isMotorHash(line: string): boolean {
  const t = line.trim();
  return t.startsWith("#") && !t.startsWith("##");
}

function isCadernoLine(line: string): boolean {
  return /^caderno\s*:/.test(fold(line.trim()));
}

export function splitCadernoRanges(text: string): { start: number; end: number }[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\n/);
  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (isCadernoLine(lines[i] ?? "")) starts.push(i);
  }
  if (!starts.length) return [{ start: 0, end: lines.length }];
  const ranges: { start: number; end: number }[] = [];
  let lead = 0;
  while (lead < starts[0]! && !(lines[lead] ?? "").trim()) lead += 1;
  if (lead < starts[0]!) ranges.push({ start: 0, end: starts[0]! });
  for (let s = 0; s < starts.length; s++) {
    ranges.push({ start: starts[s]!, end: s + 1 < starts.length ? starts[s + 1]! : lines.length });
  }
  return ranges;
}

function parseSlice(lines: string[], start: number, end: number, bookId?: string): CadernoView {
  const cover: CadernoCover = { title: "", author: "", date: "", dedication: "" };
  let i = start;
  while (i < end) {
    const raw = lines[i] ?? "";
    const trimmed = raw.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }
    if (isMotorHash(trimmed) || isCadernoLine(trimmed)) {
      if (isCadernoLine(trimmed) || COVER_KEYS.test(fold(trimmed))) {
        /* fall through to cover keys */
      } else {
        i += 1;
        continue;
      }
    }
    const folded = fold(trimmed);
    if (COVER_KEYS.test(folded)) {
      const value = trimmed.replace(/^[^:]+:\s*/, "").trim();
      if (folded.startsWith("caderno")) cover.title = value;
      else if (folded.startsWith("autora") || folded.startsWith("autor")) cover.author = value;
      else if (folded.startsWith("data")) cover.date = value;
      else if (folded.startsWith("dedicatoria")) cover.dedication = value;
      i += 1;
      continue;
    }
    break;
  }

  type Head = { line: number; level: 2 | 3; title: string };
  const heads: Head[] = [];
  for (let n = i; n < end; n++) {
    const trimmed = (lines[n] ?? "").trim();
    if (isCadernoLine(trimmed)) break;
    if (/^###\s+/.test(trimmed)) {
      heads.push({ line: n + 1, level: 3, title: trimmed.replace(/^###\s+/, "").trim() });
    } else if (/^##\s+/.test(trimmed)) {
      heads.push({ line: n + 1, level: 2, title: trimmed.replace(/^##\s+/, "").trim() });
    }
  }

  const pages: CadernoPage[] = [];
  const capaId = bookId ? `${bookId}:capa` : "capa";
  const toc: CadernoTocItem[] = [{ id: capaId, level: 0, title: cover.title || "Capa", line: start + 1, bookId }];

  const pageEnd = (index: number): number => {
    const next = heads[index + 1];
    return next ? next.line - 1 : end;
  };

  for (let h = 0; h < heads.length; h++) {
    const head = heads[h]!;
    const last = pageEnd(h);
    const bodyLines: string[] = [];
    for (let n = head.line; n < last; n++) {
      const raw = lines[n] ?? "";
      const trimmed = raw.trim();
      if (isMotorHash(trimmed) || isCadernoLine(trimmed)) continue;
      if (/^###\s+/.test(trimmed) || (/^##\s+/.test(trimmed) && !/^###/.test(trimmed))) continue;
      bodyLines.push(raw);
    }
    const localId = `${head.level}-${slugOf(head.title) || `p${head.line}`}`;
    const id = bookId ? `${bookId}:${localId}` : localId;
    const body = bodyLines.join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
    pages.push({
      id,
      title: head.title,
      level: head.level,
      body,
      comments: commentsOf(body),
      startLine: head.line,
      endLine: last,
      bookId,
    });
    toc.push({ id, level: head.level, title: head.title, line: head.line, bookId });
  }

  if (!pages.length) {
    const rest = lines
      .slice(i, end)
      .filter((line) => !isMotorHash(line.trim()) && !isCadernoLine(line) && !COVER_KEYS.test(fold(line.trim())))
      .join("\n")
      .replace(/^\n+/, "")
      .replace(/\n+$/, "");
    const paginaId = bookId ? `${bookId}:pagina` : "pagina";
    pages.push({
      id: paginaId,
      title: cover.title || "Página",
      level: 0,
      body: rest,
      comments: commentsOf(rest),
      startLine: i + 1,
      endLine: end,
      bookId,
    });
    if (rest) toc.push({ id: paginaId, level: 0, title: "Página", line: i + 1, bookId });
  }

  return { cover, toc, pages };
}

export function parseCadernoLibrary(text: string): CadernoLibrary {
  const lines = text.replace(/^\uFEFF/, "").split(/\n/);
  const ranges = splitCadernoRanges(text);
  const books: CadernoBook[] = ranges.map((range, index) => {
    const titleLine = lines[range.start] ?? "";
    const title = isCadernoLine(titleLine) ? titleLine.replace(/^[^:]+:\s*/, "").trim() : "";
    const id = `book-${index}-${slugOf(title) || index}`;
    const view = parseSlice(lines, range.start, range.end, ranges.length > 1 ? id : undefined);
    return {
      ...view,
      id,
      index,
      startLine: range.start + 1,
      endLine: range.end,
    };
  });
  const toc = books.flatMap((book) => book.toc);
  const pages = books.flatMap((book) => book.pages);
  return { books, toc, pages };
}

export function parseCadernoView(text: string): CadernoView {
  const lines = text.replace(/^\uFEFF/, "").split(/\n/);
  const range = splitCadernoRanges(text)[0] ?? { start: 0, end: lines.length };
  return parseSlice(lines, range.start, range.end);
}

function coverBlock(cover: CadernoCover): string {
  const lines: string[] = [];
  if (cover.title) lines.push(`CADERNO: ${cover.title}`);
  else lines.push("CADERNO:");
  if (cover.author) lines.push(`Autora: ${cover.author}`);
  if (cover.date) lines.push(`Data: ${cover.date}`);
  if (cover.dedication) lines.push(`Dedicatória: ${cover.dedication}`);
  return lines.join("\n");
}

function replaceCoverAt(text: string, cover: CadernoCover, start: number, end: number): string {
  const lines = text.replace(/^\uFEFF/, "").split(/\n/);
  let i = start;
  while (i < end) {
    const trimmed = (lines[i] ?? "").trim();
    if (!trimmed || COVER_KEYS.test(fold(trimmed)) || isMotorHash(trimmed)) {
      i += 1;
      continue;
    }
    break;
  }
  const head = coverBlock(cover);
  const next = [...lines.slice(0, start), ...head.split(/\n/), ...lines.slice(i)];
  return next.join("\n");
}

export function replaceCover(text: string, cover: CadernoCover, bookId?: string): string {
  const lib = parseCadernoLibrary(text);
  const book = bookId ? lib.books.find((item) => item.id === bookId) : lib.books[0];
  if (!book) {
    const head = coverBlock(cover);
    return text.trim() ? `${head}\n\n${text.replace(/^\n+/, "")}` : `${head}\n`;
  }
  const lines = text.replace(/^\uFEFF/, "").split(/\n/);
  return replaceCoverAt(text, cover, book.startLine - 1, book.endLine === lines.length ? lines.length : book.endLine);
}

export function replacePage(text: string, pageId: string, body: string): string {
  const lib = parseCadernoLibrary(text);
  const page = lib.pages.find((item) => item.id === pageId) ?? parseCadernoView(text).pages.find((item) => item.id === pageId);
  if (!page) {
    const trimmed = body.replace(/\n+$/, "");
    if (!text.trim()) return trimmed ? `${trimmed}\n` : "";
    return text;
  }
  if (page.level === 0 && (page.id === "pagina" || page.id.endsWith(":pagina"))) {
    const book = lib.books.find((item) => item.id === page.bookId) ?? lib.books[0];
    const cover = book?.cover ?? parseCadernoView(text).cover;
    const head = coverBlock(cover);
    const next = body.replace(/\n+$/, "");
    if (!book || book.index === 0) {
      if (!head) return next ? `${next}\n` : "";
      return next ? `${head}\n\n${next}\n` : `${head}\n`;
    }
  }
  const lines = text.replace(/^\uFEFF/, "").split(/\n/);
  const headingIndex = page.startLine - 1;
  const after = page.endLine;
  const nextBody = body.replace(/\n+$/, "");
  const rebuilt = [...lines.slice(0, headingIndex + 1), ...(nextBody ? nextBody.split(/\n/) : []), ...lines.slice(after)];
  return rebuilt.join("\n");
}

export function appendCaderno(text: string, title = ""): string {
  const line = title.trim() ? `CADERNO: ${title.trim()}` : "CADERNO:";
  if (!text.trim()) return `${line}\n`;
  return `${text.replace(/\n+$/, "")}\n\n${line}\n`;
}

function joinSources(left: string, right: string): string {
  const a = left.trim();
  const b = right.trim();
  if (!b) return left;
  if (!a) return right.endsWith("\n") ? right : `${right}\n`;
  return `${a}\n\n${b}\n`;
}

export type NotebookProjectSlice = {
  entitiesSource: string;
  rulesSource: string;
  taxonomySource: string;
  extras: Record<string, Record<string, string>>;
  notebooksSource: string;
  meta: { name: string };
};

export function applyNotebookToProject<T extends NotebookProjectSlice>(project: T): T {
  const text = project.notebooksSource ?? "";
  if (!text.trim()) return project;
  const nb = compileNotebook(text);
  const first = parseCadernoLibrary(text).books[0]?.cover.title ?? "";
  return {
    ...project,
    entitiesSource: joinSources(project.entitiesSource, nb.entitiesSource),
    rulesSource: joinSources(project.rulesSource, nb.rulesSource),
    taxonomySource: joinSources(project.taxonomySource, nb.taxonomySource),
    extras: { ...nb.extras, ...project.extras },
    meta: { ...project.meta, name: first || project.meta.name },
  };
}
