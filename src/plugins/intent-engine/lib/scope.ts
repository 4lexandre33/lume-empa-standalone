import type { ScopeFn, ScopeSnapshot } from "../types.ts";

type SensesCap = { scope: ScopeFn };

/** Live host lookup. Unit tests without Core get no scope (legacy index). */
export function scopeFromHost(): ScopeFn | undefined {
  try {
    const core = (globalThis as { __LUME_CORE__?: { getService: (name: string) => SensesCap } }).__LUME_CORE__;
    if (!core) return undefined;
    const senses = core.getService("Senses");
    return (world, observerId) => senses.scope(world, observerId);
  } catch {
    return undefined;
  }
}

export function emptyScope(): ScopeSnapshot {
  return { place: null, see: [], hear: [], touch: [], inventory: [], lit: true };
}
