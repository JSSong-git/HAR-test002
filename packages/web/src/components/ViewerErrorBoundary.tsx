import { Component, type ErrorInfo, type ReactNode } from "react";
import { Card } from "./ui";

type Props = { children: ReactNode; fallbackTitle?: string };
type State = { error: Error | null };

export class ViewerErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("NetworkViewer error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <Card>
          <h3 className="font-semibold text-[var(--danger)]">
            {this.props.fallbackTitle ?? "네트워크 뷰어 오류"}
          </h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            React Network Viewer가 이 HAR/환경에서 렌더링에 실패했습니다.
            (peer: React 16 권장, 현재 React 19)
          </p>
          <pre className="mt-3 max-h-40 overflow-auto rounded bg-stone-100 p-2 text-xs">
            {this.state.error.message}
          </pre>
        </Card>
      );
    }
    return this.props.children;
  }
}
