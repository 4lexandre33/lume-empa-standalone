import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createCore, type Core } from "../../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import type { NarrativeEngineService } from "../../../narrative-engine/types.ts";
import { SPATIAL_MANIFEST, createSpatialPlugin } from "../../index.ts";
import type { SpatialEntity, SpatialService, SpatialWorld } from "../../types.ts";
import { IN_ALIAS, inOf } from "../../lib/space.ts";

function entity(id: string, links: Record<string, string>, tags: string[] = []): SpatialEntity {
  return { id, links, tags };
}

function world(list: SpatialEntity[]): SpatialWorld {
  const map = new Map(list.map((item) => [item.id, item]));
  return map;
}

const boxRoom = () =>
  world([
    entity("SALA", { exit_n: "CORREDOR" }, ["place"]),
    entity("CORREDOR", { exit_s: "SALA" }, ["place"]),
    entity("CAIXA", { in: "SALA" }, ["object", "container"]),
    entity("CHAVE", { in: "CAIXA" }, ["object"]),
    entity("MESA", { in: "SALA" }, ["object"]),
    entity("LIVRO", { on: "MESA" }, ["object"]),
    entity("JOGADOR", { [IN_ALIAS]: "SALA" }, ["agent"]),
    entity("ESPADA", { held_by: "JOGADOR" }, ["object"]),
    entity("CASACO", { worn_by: "JOGADOR" }, ["object"]),
    entity("PORTA", { from: "SALA", to: "CORREDOR", dir: "n" }, ["connector"]),
  ]);

describe("Spatial", () => {
  let core: Core;
  let spatial: SpatialService;
  let narrative: NarrativeEngineService;

  beforeEach(async () => {
    core = createCore();
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(SPATIAL_MANIFEST, createSpatialPlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-spatial");
    spatial = core.getService<SpatialService>("Spatial");
    narrative = core.getService<NarrativeEngineService>("NarrativeEngine");
  });

  it("declares Spatial capability", () => {
    assert.equal(SPATIAL_MANIFEST.name, "lume-spatial");
    assert.ok(SPATIAL_MANIFEST.capabilities?.provides?.some((c) => c.name === "Spatial"));
  });

  it("reads in, aliases current_location, and walks the box-in-room chain", () => {
    const w = boxRoom();
    assert.equal(spatial.locationOf(w, "CHAVE"), "CAIXA");
    assert.equal(spatial.locationOf(w, "CAIXA"), "SALA");
    assert.equal(spatial.locationOf(w, "JOGADOR"), "SALA");
    assert.equal(spatial.relationOf(w, "JOGADOR"), "in");
    assert.equal(inOf(w.get("JOGADOR")!), "SALA");
    assert.deepEqual(spatial.contents(w, "SALA"), ["CAIXA", "JOGADOR", "MESA"]);
    assert.equal(spatial.contents(w, "SALA").includes("CHAVE"), false);
    assert.equal(spatial.deepContains(w, "SALA", "CHAVE"), true);
    assert.equal(spatial.deepContains(w, "CAIXA", "CHAVE"), true);
    assert.equal(spatial.deepContains(w, "CAIXA", "JOGADOR"), false);
    assert.deepEqual(spatial.chain(w, "CHAVE"), ["CAIXA", "SALA"]);
  });

  it("prefers in over current_location when both exist", () => {
    const w = world([entity("X", { in: "A", current_location: "B" })]);
    assert.equal(inOf(w.get("X")!), "A");
    assert.equal(spatial.locationOf(w, "X"), "A");
    assert.deepEqual(spatial.contents(w, "A"), ["X"]);
    assert.deepEqual(spatial.contents(w, "B"), []);
  });

  it("treats on, held_by and worn_by as sibling relations", () => {
    const w = boxRoom();
    assert.deepEqual(spatial.contentsOn(w, "MESA"), ["LIVRO"]);
    assert.deepEqual(spatial.heldBy(w, "JOGADOR"), ["ESPADA"]);
    assert.deepEqual(spatial.wornBy(w, "JOGADOR"), ["CASACO"]);
    assert.equal(spatial.locationOf(w, "ESPADA"), "JOGADOR");
    assert.equal(spatial.relationOf(w, "ESPADA"), "held_by");
    assert.equal(spatial.relationOf(w, "LIVRO"), "on");
    assert.equal(spatial.deepContains(w, "SALA", "ESPADA"), true);
    assert.deepEqual(spatial.occupants(w, "JOGADOR"), ["CASACO", "ESPADA"]);
  });

  it("reads travel from exit_* and connector entities", () => {
    const w = boxRoom();
    assert.equal(spatial.destination(w, "SALA", "n"), "CORREDOR");
    assert.equal(spatial.destination(w, "CORREDOR", "s"), "SALA");
    assert.equal(spatial.destination(w, "SALA", "s"), null);
    const fromSala = spatial.exits(w, "SALA");
    assert.ok(fromSala.some((exit) => exit.dir === "n" && exit.to === "CORREDOR" && exit.via === "exit"));
    assert.ok(fromSala.some((exit) => exit.dir === "n" && exit.to === "CORREDOR" && exit.via === "connector"));
    assert.deepEqual(
      spatial.connectorsFrom(w, "SALA").map((c) => c.id),
      ["PORTA"],
    );
  });

  it("does not mutate the world and accepts a compiled WorldModel", () => {
    const project = narrative.createProject("caixa", {
      entitiesSource: `SALA.{ tags: place; links: exit_n=CORREDOR; }
CORREDOR.{ tags: place; links: exit_s=SALA; }
CAIXA.{ tags: object; links: in=SALA; }
CHAVE.{ tags: object; links: in=CAIXA; }
JOGADOR.{ tags: agent; links: current_location=SALA; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"
`,
    });
    const compiled = narrative.compileProject(project);
    assert.equal(compiled.errors.length, 0);
    const before = compiled.worldModel.get("CHAVE")!.links.in;
    assert.equal(spatial.deepContains(compiled.worldModel, "SALA", "CHAVE"), true);
    assert.equal(spatial.locationOf(compiled.worldModel, "JOGADOR"), "SALA");
    assert.equal(spatial.destination(compiled.worldModel, "SALA", "n"), "CORREDOR");
    assert.equal(compiled.worldModel.get("CHAVE")!.links.in, before);
    assert.equal(compiled.worldModel.get("JOGADOR")!.links.current_location, "SALA");
    assert.equal(compiled.worldModel.get("JOGADOR")!.links.in, undefined);
  });

  it("builds a room graph from exit_* and in without mutating the world", () => {
    const w = world([
      entity("SALA", { exit_n: "CORREDOR" }, ["place"]),
      entity("CORREDOR", { exit_s: "SALA" }, ["place"]),
      entity("ALCOVA", { in: "SALA" }, ["place"]),
      entity("JOGADOR", { current_location: "SALA" }, ["agent"]),
    ]);
    const map = spatial.graphOf(w);
    const sala = map.rooms.find((r) => r.id === "SALA");
    const corredor = map.rooms.find((r) => r.id === "CORREDOR");
    const alcova = map.rooms.find((r) => r.id === "ALCOVA");
    assert.ok(sala && corredor && alcova);
    assert.ok(corredor.y < sala.y);
    assert.ok(map.links.some((l) => l.from === "SALA" && l.to === "CORREDOR" && l.dir === "n" && l.via === "exit"));
    assert.ok(map.links.some((l) => l.from === "SALA" && l.to === "ALCOVA" && l.via === "in"));
    assert.equal(spatial.placeOf(w, "JOGADOR"), "SALA");
    assert.equal(w.get("SALA")?.links.exit_n, "CORREDOR");

    const cave = narrative.compileProject(narrative.createProject("cave-map", {
      entitiesSource: `JOGADOR.{ tags: agent; links: current_location=ENTRADA; }
ENTRADA.{ tags: place; }
CAVERNA.{ tags: place; }
start()
`,
      rulesSource: `# start
ON: start
narrativa: "ok"
`,
    }));
    assert.equal(cave.errors.length, 0);
    const rooms = spatial.graphOf(cave.worldModel).rooms.map((r) => r.id).sort();
    assert.deepEqual(rooms, ["CAVERNA", "ENTRADA"]);
  });
});
