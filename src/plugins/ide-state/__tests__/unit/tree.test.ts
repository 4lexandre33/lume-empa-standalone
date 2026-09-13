import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compileProject, coerceProject, createProject } from "../../../narrative-engine/lib/project.ts";
import { parseRuleBlock } from "../../../narrative-engine/lib/rule-engine.ts";
import {
  ENTITY_SECTIONS,
  RULE_SECTIONS,
  addFolder,
  deleteFolder,
  entitiesBySection,
  entitySection,
  placeItem,
  renameFolder,
  ruleSection,
  rulesBySection,
} from "../../lib/tree.ts";
import { createIdeZustandStore } from "../../lib/orchestrator.ts";

describe("sidebar tree grouping", () => {
  it("keeps ENTITIES sections in order and sends uncategorized to Other", () => {
    assert.deepEqual([...ENTITY_SECTIONS], ["agent", "object", "place", "event", "information", "abstract", "other"]);
    const project = createProject("tree", {
      entitiesSource: `JOGADOR.{ tags: agent; stats: ; links: ; }
TOCHA.{ tags: object; stats: ; links: ; }
SALA.{ tags: place; stats: ; links: ; }
LORE.{ tags: information; stats: ; links: ; }
SOM.{ tags: event; stats: ; links: ; }
IDEIA.{ tags: abstract; stats: ; links: ; }
COISA.{ tags: reliquia; stats: ; links: ; }
start()
`,
    });
    const compiled = compileProject(project);
    const groups = entitiesBySection(compiled.worldModel, compiled.taxonomy);
    assert.equal(groups.agent.some((e) => e.id === "JOGADOR"), true);
    assert.equal(groups.object.some((e) => e.id === "TOCHA"), true);
    assert.equal(groups.place.some((e) => e.id === "SALA"), true);
    assert.equal(groups.event.some((e) => e.id === "SOM"), true);
    assert.equal(groups.information.some((e) => e.id === "LORE"), true);
    assert.equal(groups.abstract.some((e) => e.id === "IDEIA"), true);
    assert.equal(groups.other.some((e) => e.id === "COISA"), true);
    assert.equal(groups.other.some((e) => e.id === "start"), false);
    assert.equal(entitySection(compiled.worldModel.get("COISA")!), "other");
  });

  it("groups RULES by semantic kind and uses Other when none apply", () => {
    assert.equal(RULE_SECTIONS[RULE_SECTIONS.length - 1], "other");
    const start = parseRuleBlock(`# start
ON: start
narrativa: "ok"
`);
    const attack = parseRuleBlock(`# hit
ON: GOBLIN
IF: JOGADOR.intent=attack
DO: GOBLIN.hp-2
SEMANTIC: agency
narrativa: "hit"
`);
    assert.equal(ruleSection({ ...start, index: 0, source: "" }), "other");
    assert.equal(ruleSection({ ...attack, index: 1, source: "" }), "agency");
    const grouped = rulesBySection([
      { ...start, index: 0, source: "" },
      { ...attack, index: 1, source: "" },
    ]);
    assert.equal(grouped.other[0]?.id, "start");
    assert.equal(grouped.agency[0]?.id, "hit");
  });
});

describe("sidebar folders", () => {
  it("creates, renames, places and deletes without dropping sibling data", () => {
    const created = addFolder(undefined, "entities", "agent", "Monstros");
    const renamed = renameFolder(created.tree, "entities", "agent", created.id, "NPCs");
    const placed = placeItem(renamed, "entities", "agent", "GOBLIN", created.id);
    assert.equal(placed.entities.agent.folders[0]?.name, "NPCs");
    assert.equal(placed.entities.agent.placements.GOBLIN, created.id);
    const cleared = deleteFolder(placed, "entities", "agent", created.id);
    assert.equal(cleared.entities.agent.folders.length, 0);
    assert.equal(cleared.entities.agent.placements.GOBLIN, undefined);
  });

  it("persists folders through the ide store", () => {
    const store = createIdeZustandStore();
    store.getState().newBlank();
    const id = store.getState().createSidebarFolder("rules", "constraint");
    assert.ok(id);
    store.getState().renameSidebarFolder("rules", "constraint", id!, "Portas");
    store.getState().placeSidebarItem("rules", "constraint", "abrir", id!);
    const tree = store.getState().project?.settings.tree;
    assert.equal(tree?.rules.constraint.folders[0]?.name, "Portas");
    assert.equal(tree?.rules.constraint.placements.abrir, id);
    store.getState().deleteSidebarFolder("rules", "constraint", id!);
    assert.equal(store.getState().project?.settings.tree?.rules.constraint.folders.length, 0);
  });

  it("round-trips folders through coerceProject", () => {
    const created = addFolder(undefined, "entities", "object", "Chaves");
    const raw = createProject("saved", {
      settings: { playerEntityId: "JOGADOR", debug: true, tree: created.tree },
    });
    const loaded = coerceProject(JSON.parse(JSON.stringify(raw)));
    assert.equal(loaded.settings.tree?.entities.object.folders[0]?.name, "Chaves");
  });
});
