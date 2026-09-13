# lume-dry-run

Pré-visualização de um `interact`: o mesmo `findMatchingRule`, DO no clone, mundo vivo intacto.

## Abrir
- `lib/dry-run.ts` — `bindDryRun` (capability)
- Algoritmo: `narrative-engine/lib/dry-run.ts` (`dryRunWith`, `diffWorlds`)

## Provides
DryRun

## Requires
NarrativeEngine

## Não fazer
- Não alterar `findMatchingRule`
- Não chamar `applyRuleEffects` (EMIT / KNOW / INTENT / WAIT / TICK / THEN / LIVE ficam listados, não correm)
- Não mutar history / ruleCounts / tags / stats / links do estado vivo
- Não NLP interrogativo, não transação, não Inspector

## Fora de âmbito
Espaço → spatial. Scope → senses. Kit take/drop → kit-adventure. `posso` / `can i` → nlp.
