declare module "network-viewer" {
  import type { ComponentType } from "react";

  export type NetworkViewerOptions = {
    showImportHAR?: boolean;
    showTimeline?: boolean;
  };

  export type NetworkViewerProps = {
    data?: unknown;
    file?: string | null;
    containerClassName?: string | null;
    options?: NetworkViewerOptions | null;
    onDataLoaded?: (data: unknown) => void;
    onDataError?: (error: unknown) => void;
    onRequestSelect?: (requestDetail: unknown) => void;
    autoHighlightChange?: boolean;
    scrollTimeStamp?: number | null;
    scrollRequestPosition?: "before" | "after" | "near";
    fetchOptions?: Record<string, unknown>;
  };

  export const NetworkViewer: ComponentType<NetworkViewerProps>;

  const networkViewer: {
    NetworkViewer: ComponentType<NetworkViewerProps>;
  };
  export default networkViewer;
}

declare module "network-viewer/es6/index.css";
