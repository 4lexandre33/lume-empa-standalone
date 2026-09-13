import type { NotebookCompile } from "./lib/notebook.ts";
import type { AssistWorld, NotebookAssist } from "./lib/assist.ts";

export type { NotebookCompile, NotebookIssue } from "./lib/notebook.ts";
export type { AssistWorld, AssistWorldEntity, NotebookAssist } from "./lib/assist.ts";

export interface NotebookService {
  compile(text: string): NotebookCompile;
  assist(text: string, world?: AssistWorld): NotebookAssist;
  exportCaderno(text: string, bookId?: string): string;
  importCaderno(into: string, incoming: string): string;
  cadernoFilename(title: string): string;
}