import { bootLumePlatform } from "../../../bootstrap.ts";
import type { ExtHostService } from "../types.ts";

function fromGlobal(): ExtHostService | null {
  const g = globalThis as { __LUME_EXT_HOST__?: ExtHostService; __LUME_CORE__?: { getService: (name: string) => ExtHostService } };
  if (g.__LUME_EXT_HOST__) return g.__LUME_EXT_HOST__;
  try {
    if (g.__LUME_CORE__) return g.__LUME_CORE__.getService("ExtHost");
  } catch {
    /* capability not up yet */
  }
  return null;
}

let booting: Promise<ExtHostService | null> | null = null;

export async function ensureExtHost(): Promise<ExtHostService | null> {
  const existing = fromGlobal();
  if (existing) return existing;
  if (!booting) {
    booting = bootLumePlatform()
      .then((boot) => boot.services.extHost)
      .catch(() => fromGlobal())
      .finally(() => {
        booting = null;
      });
  }
  return booting;
}
