import type { Json, JsonEntity } from "../types.ts";

export function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value, (_key, current) => {
    if (current instanceof Map) return Object.fromEntries(current.entries());
    if (current instanceof Set) return [...current];
    if (typeof current === "function") return undefined;
    if (typeof current === "bigint") return current.toString();
    return current;
  })) as Json;
}

export function worldToJson(world: Map<string, any> | undefined | null): JsonEntity[] | null {
  if (!world) return null;
  const out: JsonEntity[] = [];
  for (const [id, entity] of world.entries()) {
    out.push({
      id,
      tags: entity.tags instanceof Set ? [...entity.tags].sort() : Array.isArray(entity.tags) ? [...entity.tags].sort() : [],
      stats: entity.stats && typeof entity.stats === "object" ? { ...entity.stats } : {},
      links: entity.links && typeof entity.links === "object" ? { ...entity.links } : {},
      extra: entity.extra && typeof entity.extra === "object" ? { ...entity.extra } : undefined,
    });
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

export function fnv1aHex(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
