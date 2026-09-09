import { coerceProject, type Project } from "../../narrative-engine/lib/project.ts";
import type { IdeSettings } from "../../project-cloud/types.ts";

const KEY = "lume:session:v1";

export type SessionDraft = {
  project: Project | null;
  screen: "welcome" | "ide" | "guide";
  tab: "entities" | "taxonomy" | "rules" | "config";
  onboarding: IdeSettings["onboarding"];
};

export function readSessionDraft(): SessionDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionDraft> & { project?: unknown };
    const project = parsed.project ? coerceProject(parsed.project) : null;
    const tab: SessionDraft["tab"] =
      parsed.tab === "rules" || parsed.tab === "config" || parsed.tab === "taxonomy" ? parsed.tab : "entities";
    const onboarding: IdeSettings["onboarding"] =
      parsed.onboarding === "skipped" || parsed.onboarding === "done" ? parsed.onboarding : "pending";
    let screen: SessionDraft["screen"] = parsed.screen === "guide" ? "guide" : parsed.screen === "ide" ? "ide" : "welcome";
    if (project && screen === "welcome") screen = "ide";
    if (!project && screen === "ide") screen = "welcome";
    return { project, screen, tab, onboarding };
  } catch {
    return null;
  }
}

export function writeSessionDraft(draft: SessionDraft) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}
