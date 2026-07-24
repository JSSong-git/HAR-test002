import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const FIND_DOM_NODE_POLYFILL = `
;(function () {
  if (typeof module === "undefined" || !module.exports) return;
  var m = module.exports;
  if (m && typeof m.findDOMNode === "function") return;
  function findDOMNode(componentOrElement) {
    if (componentOrElement == null) return null;
    if (typeof componentOrElement.nodeType === "number") return componentOrElement;
    var fiber =
      componentOrElement._reactInternals ||
      componentOrElement._reactInternalFiber ||
      null;
    while (fiber) {
      if (fiber.stateNode && typeof fiber.stateNode.nodeType === "number") {
        return fiber.stateNode;
      }
      fiber = fiber.child;
    }
    return null;
  }
  try {
    Object.defineProperty(m, "findDOMNode", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: findDOMNode,
    });
  } catch (e) {
    m.findDOMNode = findDOMNode;
  }
})();
`;

/** Inject findDOMNode into react-dom CJS bundles for legacy network-viewer. */
function reactDomFindDomNodePlugin(): Plugin {
  return {
    name: "react-dom-finddomnode-cjs",
    enforce: "pre",
    transform(code, id) {
      const normalized = id.replace(/\\/g, "/");
      const isReactDomCjs =
        normalized.includes("/react-dom/") &&
        (normalized.includes("react-dom.development.js") ||
          normalized.includes("react-dom.production.js") ||
          normalized.endsWith("/react-dom/index.js"));
      if (!isReactDomCjs) return null;
      if (code.includes("FIND_DOM_NODE_POLYFILL_APPLIED")) return null;
      return {
        code: `${code}\n/* FIND_DOM_NODE_POLYFILL_APPLIED */\n${FIND_DOM_NODE_POLYFILL}`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [reactDomFindDomNodePlugin(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "network-viewer",
      "immutable",
      "prop-types",
      "classnames",
    ],
  },
  worker: {
    format: "es",
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    commonjsOptions: {
      include: [/network-viewer/, /node_modules/],
    },
  },
});
