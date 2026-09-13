# Lume — contexto de projeto (ler antes de vasculhar)

Navegar por índice, não por pasta. **Não carregar todos os docs** — só o da linha do pedido.

1. [docs/ai/ROTEAMENTO.md](docs/ai/ROTEAMENTO.md) — pedido → ficheiro
2. `src/plugins/<nome>/CONTEXT.md` — só esse plugin
3. Se o vocabulário for estranho: [docs/ai/GLOSSARIO.md](docs/ai/GLOSSARIO.md)
4. Se for “como adicionar X”: [docs/ai/ENTRYPOINTS.md](docs/ai/ENTRYPOINTS.md)
5. Invariantes só se for mexer no motor: [docs/ai/INVARIANTES.md](docs/ai/INVARIANTES.md)

Mapa completo e playbook existem mas **não se lêem em toda a chamada**:
[docs/ai/MAPA.md](docs/ai/MAPA.md) · [docs/ai/EFICIENCIA.md](docs/ai/EFICIENCIA.md) · caderno humano: [docs/ai/PLANO-CADERNO.md](docs/ai/PLANO-CADERNO.md)

Proibido: `list_dir src/`, grep sem `path` de plugin, segundo motor, copiar Elm/Allegory/ECS, duplicar UI em `src/components/ide/`.
