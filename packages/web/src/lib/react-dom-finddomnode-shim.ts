/**
 * React 19 removed ReactDOM.findDOMNode. Sauce Labs `network-viewer`
 * (via react-transition-group without nodeRef) still calls
 * `react-dom.default.findDOMNode(...)`.
 *
 * This shim restores a best-effort findDOMNode for that legacy path only.
 */
import * as ReactDOM from "react-dom";

type AnyRec = Record<string, unknown>;

function readFiber(component: AnyRec): AnyRec | null {
  return (
    (component._reactInternals as AnyRec | undefined) ??
    (component._reactInternalFiber as AnyRec | undefined) ??
    null
  );
}

function findHostNode(fiber: AnyRec | null): Element | Text | null {
  let node: AnyRec | null = fiber;
  while (node) {
    const stateNode = node.stateNode as AnyRec | Element | Text | null | undefined;
    if (stateNode && typeof (stateNode as Node).nodeType === "number") {
      return stateNode as Element | Text;
    }
    if (stateNode && typeof stateNode === "object") {
      const nested = readFiber(stateNode as AnyRec);
      if (nested) {
        const found = findHostNode(nested);
        if (found) return found;
      }
    }
    node = (node.child as AnyRec | undefined) ?? null;
  }
  return null;
}

export function findDOMNode(
  componentOrElement: Element | Text | AnyRec | null | undefined,
): Element | Text | null {
  if (componentOrElement == null) return null;
  if (typeof (componentOrElement as Node).nodeType === "number") {
    return componentOrElement as Element | Text;
  }
  return findHostNode(readFiber(componentOrElement as AnyRec));
}

function patch(target: AnyRec | null | undefined) {
  if (!target || typeof target !== "object") return;
  try {
    Object.defineProperty(target, "findDOMNode", {
      configurable: true,
      writable: true,
      enumerable: true,
      value: findDOMNode,
    });
  } catch {
    (target as { findDOMNode?: typeof findDOMNode }).findDOMNode = findDOMNode;
  }
}

const mod = ReactDOM as unknown as AnyRec;
patch(mod);
patch(mod.default as AnyRec | undefined);

// Vite/CJS interop sometimes exposes module.exports as `default` only.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const req = (globalThis as { require?: (id: string) => AnyRec }).require;
  if (typeof req === "function") {
    patch(req("react-dom"));
  }
} catch {
  /* browser ESM — ignore */
}

export {};
