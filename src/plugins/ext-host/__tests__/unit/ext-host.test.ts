import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createCore } from "../../../../core/index.ts";
import { NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin } from "../../../narrative-engine/index.ts";
import { EXT_HOST_MANIFEST, createExtHostPlugin } from "../../index.ts";
import { createExtHostService } from "../../lib/registry.ts";
import { fingerprintFiles, renderKit } from "../../lib/kit.ts";
import { zipStore } from "../../lib/zip.ts";
import { runGuestSource } from "../../lib/sandbox.ts";
import type { SandboxHost } from "../../types.ts";

function silentHost(over: Partial<SandboxHost> = {}): SandboxHost {
  const logs: string[] = [];
  const bag = new Map<string, string>();
  return {
    pluginName: "ext-hello",
    log: (m) => logs.push(m),
    inspect: () => ({ plugins: [], capabilities: [], events: [], world: null }),
    call: () => null,
    on: () => undefined,
    emit: () => undefined,
    storage: {
      get: (key) => bag.get(key) ?? null,
      set: (key, value) => {
        bag.set(key, value);
      },
      remove: (key) => {
        bag.delete(key);
      },
    },
    ...over,
  };
}

describe("ext-host sandbox", () => {
  it("runs activate and blocks Function/eval/DOM", () => {
    const logs: string[] = [];
    const host = silentHost({ log: (m) => logs.push(m) });
    const guest = runGuestSource(
      `function activate(host) { host.log("ok"); host.storage.set("a", "1"); }
       function deactivate() {}`,
      host,
    );
    guest.activate?.(host);
    assert.equal(logs[0], "ok");
    assert.equal(host.storage.get("a"), "1");

    const banned = runGuestSource(
      `function activate(host) {
         try { host.log("fn=" + typeof Function); } catch (e) { host.log("fn-throw"); }
         try { host.log("win=" + typeof window); } catch (e) { host.log("win-throw"); }
       }`,
      host,
    );
    logs.length = 0;
    banned.activate?.(host);
    assert.ok(logs.some((line) => line === "fn=undefined" || line === "fn-throw"));
    assert.ok(logs.some((line) => line === "win=undefined" || line === "win-throw"));
  });

  it("rejects lume-* names and accepts ext-* via the host service", async () => {
    const core = createCore();
    globalThis.__LUME_CORE__ = core;
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    await core.activatePlugin("lume-narrative-engine");
    const { service } = createExtHostService(core);
    assert.throws(
      () =>
        service.load({
          manifest: { name: "lume-evil", version: "1.0.0" },
          source: "function activate() {}",
        }),
      /ext-/,
    );
  });
});

describe("ext-host kit is deterministic and kernel-live", () => {
  it("fingerprint is stable and zip contains host.json", async () => {
    const core = createCore();
    globalThis.__LUME_CORE__ = core;
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    core.registerPlugin(EXT_HOST_MANIFEST, createExtHostPlugin);
    await core.activatePlugin("lume-narrative-engine");
    await core.activatePlugin("lume-ext-host");
    const ext = core.getService<ReturnType<typeof createExtHostPlugin> extends never ? never : import("../../types.ts").ExtHostService>("ExtHost");
    const a = ext.buildKit();
    const b = ext.buildKit();
    assert.equal(a.fingerprint, b.fingerprint);
    assert.equal(a.fingerprint, fingerprintFiles(a.files));
    assert.ok(a.files["host.json"].includes("generatedBy"));
    assert.ok(a.files["host.json"].includes("lume-website"));
    assert.ok(a.files["AGENTS.md"].includes("ext-"));
    assert.ok(JSON.parse(a.files["host.json"]).capabilities.some((c: { name: string }) => c.name === "NarrativeEngine"));
    const zip = zipStore(a.files);
    assert.ok(zip.length > 100);
    assert.equal(zip[0], 0x50);
    assert.equal(zip[1], 0x4b);
  });

  it("guest sees capabilities via inspect but cannot call denied methods", async () => {
    const core = createCore();
    globalThis.__LUME_CORE__ = core;
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    await core.activatePlugin("lume-narrative-engine");
    const { service } = createExtHostService(core);
    const installed = service.load({
      manifest: { name: "ext-hello", version: "1.0.0" },
      source: `function activate(host) {
        var caps = host.inspect().capabilities.map(function (c) { return c.name; }).join(",");
        host.log(caps);
        try { host.call("NarrativeEngine", "getStore"); host.log("leaked"); }
        catch (e) { host.log("denied"); }
        var project = host.call("NarrativeEngine", "createProject", "ViaGuest");
        host.log(project && project.meta && project.meta.name);
      }`,
    });
    assert.equal(installed.status, "active");
    assert.ok(installed.logs.some((line) => line.includes("NarrativeEngine")));
    assert.ok(installed.logs.includes("denied"));
    assert.ok(installed.logs.includes("ViaGuest"));
    const before = core.listActivePlugins();
    service.unload("ext-hello");
    assert.deepEqual(core.listActivePlugins(), before);
  });

  it("loads several ext-* plugins side by side", async () => {
    const core = createCore();
    globalThis.__LUME_CORE__ = core;
    core.registerPlugin(NARRATIVE_ENGINE_MANIFEST, createNarrativeEnginePlugin);
    await core.activatePlugin("lume-narrative-engine");
    const { service } = createExtHostService(core);
    service.load({
      manifest: { name: "ext-one", version: "1.0.0" },
      source: "function activate(host) { host.log('one'); }",
    });
    service.load({
      manifest: { name: "ext-two", version: "1.0.0" },
      source: "function activate(host) { host.log('two'); }",
    });
    const names = service.list().map((g) => g.name);
    assert.deepEqual(names, ["ext-one", "ext-two"]);
    assert.equal(service.list().every((g) => g.status === "active"), true);
    const zip = service.kitZip();
    assert.ok(zip.bytes[0] === 0x50 && zip.bytes[1] === 0x4b);
    assert.equal(service.downloadKit(), false);
  });
});

describe("kit render", () => {
  it("same inspect → same files", () => {
    const inspect = {
      plugins: [{ name: "lume-narrative-engine", version: "1.0.0", provides: [{ name: "NarrativeEngine", version: "1.0.0" }] }],
      capabilities: [{ name: "NarrativeEngine", version: "1.0.0", provider: "lume-narrative-engine", methods: ["compileProject", "createProject"] }],
      events: ["lume:ext-plugin"],
      world: null,
    };
    assert.equal(renderKit(inspect).fingerprint, renderKit(inspect).fingerprint);
  });
});
