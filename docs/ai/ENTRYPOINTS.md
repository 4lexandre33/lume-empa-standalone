# Extensões reais (4). O resto não é entrypoint.

Antes de criar ficheiro: CONTEXT do plugin dono + [INVARIANTES.md](INVARIANTES.md).

## 1. Plugin novo
`src/plugins/<nome>/` com CONTEXT.md, manifest, types, index, 1 teste.
Linha em MAPA.md + `bootstrap.ts` + conta em `platform-bootstrap.test.ts`.
Não importar outro plugin.

## 2. Verbo DO novo (`EMIT`-like)
Parser já devolve `EffectOp`. Plugin dono: `registerRuleEffect(verbo, handler)`.
Teste no plugin. Não meter o efeito em `applyChanges` (só CREATE/DESTROY vivem lá).

## 3. Família de intent nova (`intent.plan.` etc.)
Pedido explícito. `intent-engine/lib/catalog.ts` + parser/resolver testes.
Não criar SEARCH/PLAN “porque o manifesto tinha”.

## 4. Painel / superfície IDE
Componente em `ide-ui/lib/components/`. Registrar em `view-registry.ts`.
`src/components/ide/X.tsx` só reexporta.

## 5. Plugin externo (terceiros / outra IA)
Não criar pasta em `src/plugins/`. Descarregar o kit (Ajuda → Descarregar kit de plugins externos) — o **website** gera host.json a partir do kernel vivo.
A outra IA lê `AGENTS.md` do zip e entrega `ext-<nome>` (JS ou JSON). Instalar em Configuração → Plugins externos.
Sandbox: JSON only, prefixo `ext-`, sem tocar no núcleo.
