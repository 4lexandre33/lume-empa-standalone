export type SkeinNode = {
  triggerId: string;
  children: SkeinNode[];
};

export function emptySkein(): SkeinNode {
  return { triggerId: "", children: [] };
}

function cloneNode(node: SkeinNode): SkeinNode {
  return {
    triggerId: node.triggerId,
    children: node.children.map(cloneNode),
  };
}

export function recordPath(root: SkeinNode, triggerIds: readonly string[]): SkeinNode {
  const next = cloneNode(root);
  let node = next;
  for (const id of triggerIds) {
    let child = node.children.find((item) => item.triggerId === id);
    if (!child) {
      child = { triggerId: id, children: [] };
      node.children.push(child);
    }
    node = child;
  }
  return next;
}

export function mergeSkein(a: SkeinNode, b: SkeinNode): SkeinNode {
  const children = a.children.map(cloneNode);
  for (const other of b.children) {
    const index = children.findIndex((item) => item.triggerId === other.triggerId);
    if (index < 0) children.push(cloneNode(other));
    else children[index] = mergeSkein(children[index]!, other);
  }
  return { triggerId: a.triggerId || b.triggerId, children };
}

export function parseSkein(raw: unknown): SkeinNode {
  if (!raw || typeof raw !== "object") return emptySkein();
  const value = raw as Record<string, unknown>;
  const triggerId = typeof value.triggerId === "string" ? value.triggerId : "";
  const children = Array.isArray(value.children) ? value.children.map(parseSkein) : [];
  return { triggerId, children };
}
