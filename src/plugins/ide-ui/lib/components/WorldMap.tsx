import { useIdeStore } from "../../../ide-state/lib/orchestrator.ts";
import { graphOf, placeOf } from "../../../spatial/lib/map.ts";

const CELL_W = 120;
const CELL_H = 76;
const BOX_W = 96;
const BOX_H = 48;
const PAD = 28;

export function WorldMap() {
  const compiled = useIdeStore((s) => s.compiled);
  const game = useIdeStore((s) => s.game);
  const selected = useIdeStore((s) => s.selectedEntityId);
  const revealEntity = useIdeStore((s) => s.revealEntity);
  const world = game?.worldModel ?? compiled?.worldModel ?? null;
  const playerId = game?.playerEntityId ?? (compiled?.worldModel.has("JOGADOR") ? "JOGADOR" : null);

  if (!world) {
    return (
      <div className="flex h-full items-start p-4">
        <p className="text-sm text-muted">Sem mundo para mapear.</p>
      </div>
    );
  }

  const map = graphOf(world);
  const here = playerId ? placeOf(world, playerId) : null;

  if (!map.rooms.length) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-paper">
        <div className="border-b border-border px-3 py-1">
          <span className="text-[10px] tracking-[0.14em] text-muted uppercase">Mapa</span>
        </div>
        <p className="px-3 py-3 text-xs text-subtle">Nenhuma sala (`tags: place`). O mapa lê `exit_*` e `in` — não gera mundo.</p>
      </div>
    );
  }

  const xs = map.rooms.map((r) => r.x);
  const ys = map.rooms.map((r) => r.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = (Math.max(...xs) - minX + 1) * CELL_W + PAD * 2;
  const height = (Math.max(...ys) - minY + 1) * CELL_H + PAD * 2;
  const at = (x: number, y: number) => ({
    cx: (x - minX) * CELL_W + PAD + BOX_W / 2,
    cy: (y - minY) * CELL_H + PAD + BOX_H / 2,
  });
  const byId = new Map(map.rooms.map((room) => [room.id, room]));

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <div className="flex items-center justify-between border-b border-border px-3 py-1">
        <span className="text-[10px] tracking-[0.14em] text-muted uppercase">Mapa</span>
        <span className="font-mono text-[10px] text-subtle">{map.rooms.length} salas</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mapa de salas">
          {map.links.map((link, i) => {
            const from = byId.get(link.from);
            const to = byId.get(link.to);
            if (!from || !to) return null;
            const a = at(from.x, from.y);
            const b = at(to.x, to.y);
            const mx = a.cx + (b.cx - a.cx) / 3;
            const my = a.cy + (b.cy - a.cy) / 3;
            return (
              <g key={`${link.from}-${link.dir}-${link.to}-${link.via}-${i}`}>
                <line x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} stroke="var(--color-border)" strokeWidth={1.5} />
                {link.dir ? (
                  <text x={mx} y={my} textAnchor="middle" fill="var(--color-subtle)" fontSize={9} fontFamily="ui-monospace, monospace">
                    {link.dir}
                  </text>
                ) : null}
              </g>
            );
          })}
          {map.rooms.map((room) => {
            const { cx, cy } = at(room.x, room.y);
            const x = cx - BOX_W / 2;
            const y = cy - BOX_H / 2;
            const current = room.id === here;
            const picked = room.id === selected;
            const name = world.get(room.id)?.extra?.name;
            return (
              <g key={room.id}>
                <rect
                  x={x}
                  y={y}
                  width={BOX_W}
                  height={BOX_H}
                  rx={2}
                  fill={current ? "var(--color-elevated)" : "var(--color-surface)"}
                  stroke={picked || current ? "var(--color-fg)" : "var(--color-border)"}
                  strokeWidth={picked || current ? 2 : 1}
                  role="button"
                  tabIndex={0}
                  aria-label={room.id}
                  onClick={() => revealEntity(room.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      revealEntity(room.id);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
                <text
                  x={cx}
                  y={cy - (name ? 6 : 0)}
                  textAnchor="middle"
                  fill="var(--color-fg)"
                  fontSize={11}
                  fontFamily="ui-monospace, monospace"
                  style={{ pointerEvents: "none" }}
                >
                  {room.id}
                </text>
                {name ? (
                  <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--color-muted)" fontSize={9} style={{ pointerEvents: "none" }}>
                    {name}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
