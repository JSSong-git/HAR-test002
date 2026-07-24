import { useMemo, type ComponentType } from "react";
import "@/lib/react-dom-finddomnode-shim";
import * as networkViewerNs from "network-viewer";
import "network-viewer/es6/index.css";
import { scopeHarToPage } from "@/lib/scope-har";
import { Card } from "./ui";
import { ViewerErrorBoundary } from "./ViewerErrorBoundary";

type NetworkViewerProps = {
  data?: unknown;
  options?: { showImportHAR?: boolean; showTimeline?: boolean } | null;
  containerClassName?: string | null;
};

function resolveNetworkViewer(): ComponentType<NetworkViewerProps> {
  const ns = networkViewerNs as unknown as {
    NetworkViewer?: ComponentType<NetworkViewerProps>;
    default?:
      | ComponentType<NetworkViewerProps>
      | { NetworkViewer?: ComponentType<NetworkViewerProps> };
  };
  const fromNamed = ns.NetworkViewer;
  if (fromNamed) return fromNamed;
  const d = ns.default;
  if (d && typeof d === "object" && "NetworkViewer" in d && d.NetworkViewer) {
    return d.NetworkViewer;
  }
  if (typeof d === "function") return d;
  throw new Error("network-viewer: NetworkViewer export not found");
}

const NetworkViewer = resolveNetworkViewer();

type Props = {
  harJson: unknown;
  pageId: string;
  masked: boolean;
};

export function NetworkViewerPanel({ harJson, pageId, masked }: Props) {
  const data = useMemo(
    () => scopeHarToPage(harJson, pageId),
    [harJson, pageId],
  );

  if (!data) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted)]">표시할 HAR 데이터가 없습니다.</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-3 overflow-hidden p-2 sm:p-3">
      <div className="px-2 pt-1 text-xs text-[var(--muted)]">
        Sauce Labs Network Viewer · 선택 회차({pageId})만 표시
        {masked ? " · 민감 헤더/쿠키 마스킹 적용" : " · 마스킹 꺼짐"}
        {" · "}타임라인 차트 비활성(라이브러리 null.payload 버그 회피)
      </div>
      <ViewerErrorBoundary>
        <div className="network-viewer-host min-h-[32rem] w-full overflow-auto rounded-lg border border-[var(--border)] bg-white">
          <NetworkViewer
            key={`${pageId}-${masked ? "m" : "raw"}-${data.log.entries?.length ?? 0}`}
            data={data}
            options={{ showImportHAR: false, showTimeline: false }}
            containerClassName="har-test002-network-viewer"
          />
        </div>
      </ViewerErrorBoundary>
    </Card>
  );
}
