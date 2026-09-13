import type { ExtHostService } from "../../ext-host/types.ts";

export function getExtHost(): ExtHostService | null {
  return (globalThis as { __LUME_EXT_HOST__?: ExtHostService }).__LUME_EXT_HOST__ ?? null;
}
