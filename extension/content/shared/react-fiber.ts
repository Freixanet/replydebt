export function getReactFiberKey(element: Element): string | null {
  const keys = Object.keys(element);
  return keys.find((key) => key.startsWith("__reactFiber")) ?? null;
}

export function getReactPropsKey(element: Element): string | null {
  const keys = Object.keys(element);
  return keys.find((key) => key.startsWith("__reactProps")) ?? null;
}

export function getReactFiber(element: Element): unknown {
  const key = getReactFiberKey(element);
  if (!key) return null;
  return (element as unknown as Record<string, unknown>)[key] ?? null;
}

export function getReactProps(element: Element): unknown {
  const key = getReactPropsKey(element);
  if (!key) return null;
  return (element as unknown as Record<string, unknown>)[key] ?? null;
}

interface FiberNode {
  memoizedProps?: Record<string, unknown>;
  pendingProps?: Record<string, unknown>;
  return?: FiberNode;
  child?: FiberNode;
  sibling?: FiberNode;
}

function readFiberProps(node: FiberNode | null | undefined): Record<string, unknown> | null {
  if (!node) return null;
  return node.memoizedProps ?? node.pendingProps ?? null;
}

export function walkFiberTree(
  root: Element,
  visitor: (props: Record<string, unknown>, element: Element) => void,
  maxDepth = 40,
): void {
  const fiberKey = getReactFiberKey(root);
  if (!fiberKey) return;

  const start = (root as unknown as Record<string, unknown>)[fiberKey] as FiberNode;
  const stack: Array<{ node: FiberNode; depth: number }> = [{ node: start, depth: 0 }];
  const seen = new Set<FiberNode>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current.node) || current.depth > maxDepth) continue;
    seen.add(current.node);

    const props = readFiberProps(current.node);
    if (props) visitor(props, root);

    if (current.node.child) {
      stack.push({ node: current.node.child, depth: current.depth + 1 });
    }
    if (current.node.sibling) {
      stack.push({ node: current.node.sibling, depth: current.depth + 1 });
    }
    if (current.node.return && current.depth < maxDepth) {
      stack.push({ node: current.node.return, depth: current.depth + 1 });
    }
  }
}

export function findFiberProp(
  root: Element,
  matcher: (props: Record<string, unknown>) => boolean,
): Record<string, unknown> | null {
  let found: Record<string, unknown> | null = null;

  walkFiberTree(root, (props) => {
    if (!found && matcher(props)) {
      found = props;
    }
  });

  return found;
}

export function pickString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

export function pickNestedString(
  props: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const direct = pickString(props[key]);
    if (direct) return direct;
  }

  for (const value of Object.values(props)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const key of keys) {
        const nested = pickString((value as Record<string, unknown>)[key]);
        if (nested) return nested;
      }
    }
  }

  return null;
}
