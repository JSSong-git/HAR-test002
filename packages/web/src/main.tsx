import { createRoot } from "react-dom/client";
// Must run before any network-viewer / react-transition-group code loads.
import "./lib/react-dom-finddomnode-shim";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
