# lume-ext-host

Único dono de plugins **externos** (`ext-*`) e do kit de desenvolvimento gerado pelo website.

## Abrir
- `lib/registry.ts` — load/unload sandbox
- `lib/sandbox.ts` — Function isolada (sem DOM/eval/núcleo)
- `lib/kit.ts` — zip determinístico a partir de `core.getDiagnostics()`
- `lib/zip.ts` — ZIP STORE
- `types.ts` — ExtHost / SandboxHost

## Provides
ExtHost@1.0.0

## Eventos
Emite `lume:ext-plugin`. Ouve beats/world/knowledge/intent e reencaminha JSON ao guest.

## Não fazer
- Guest nunca é `lume-*` e nunca entra no PluginRegistry do kernel
- Não `getStore` / `registerComponent` / `RuleEffects.register` via `call()`
- Kit **não** é escrito à mão nem pela IA — `buildKit()` lê o kernel vivo

## Fora de âmbito
Plugins de primeiro partido → `src/plugins/<nome>/CONTEXT.md`.
