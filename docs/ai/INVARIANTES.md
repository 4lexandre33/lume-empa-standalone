# Invariantes — o que nunca fazer

Se um pedido chocar com isto, **recusar a parte ilegal** e fazer o resto no idioma Lume.

## Motor

1. Um só `findMatchingRule`. Sem motor paralelo.
2. Semântica (`classify`) e `FUNCAO:` **não** alteram score nem vencedor.
3. `interactWith` é o caminho do preview (síncrono). Efeitos DO via `RuleEffects`.
4. Rewind = `initialWorld` + replay de `triggerId`. Efeitos têm de ser replayáveis. Sem store que o `resetGame` esqueça. Seed é dado de `createGame`, **não** relógio de parede.
5. Perceive/cognize **não** chamam `interact` e **não** mudam tags/stats/links.
6. Intent é tentativa: anota links `intent*`, `interact` decide, links apagados.
7. Encadeamento EMIT ≤ `MAX_EFFECT_DEPTH` (4).
8. `INFORMATION` (entidade) ≠ cognição (`knows_<id>` no agent).
9. Dry-run **não** muta mundo vivo, history nem ruleCounts. **Não** corre EMIT/KNOW/INTENT/WAIT/TICK/THEN/LIVE.
10. NLP **não** entra no match. Só frase → `intent.*`. Falha fechado. Sem embeddings.

## Idioma

11. Não copiar Elm: nada de `INTENT(open_door)`, `MODIFY(health, -10)`, `TIME(after 10 seconds)`.
12. Idioma Lume: `JOGADOR.hp-10`, `$.hp-JOGADOR.force`, `IF: JOGADOR.intent=attack`, `DO: EMIT x`, `DO: WAIT 3.FUSE`, `DO: TICK`, `DO: THEN CORREDOR`, `DO: LIVE`, `DO: LIVE GOBLIN`. `intent.a; intent.b` é o mesmo execute.

## Arquitetura

13. Código **novo** não importa outro plugin. Capability + evento.
14. Não criar plugin por categoria (ConstraintEngine, LifecycleEngine, FearEngine).
15. Não primitivas FEAR/FLEE/TALK/ATTACK. Catálogo de intent e regras compostas bastam.
16. UI canónica em `src/plugins/ide-ui/lib/components/`. `src/components/ide/X` reexporta; não duplicar lógica.
17. Pedido “fase N, sem mais e sem menos” = não ouro, não TIME, não tick NPC, não Inspector, salvo o texto do pedido.

## Testes

18. Caverna e planetário compilam e jogam iguais se o pedido não alterar exemplos.
19. Novo plugin: incrementar conta em `platform-bootstrap.test.ts`.
20. Não `clearRuleEffects()` global a meio de testes paralelos de outros plugins.

