import { Component, Fragment, type ErrorInfo, type ReactNode } from "react";
import {
  getPublicErrorMessage,
  shouldResetErrorBoundary,
} from "@/lib/ui-utils";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Change this to explicitly reset the boundary (e.g. on route change). */
  resetKey?: unknown;
}

interface State {
  hasError: boolean;
  /** Bumped on retry so the failed child subtree is actually remounted. */
  generation: number;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, generation: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Never surface internal error details to users; only log in development.
    if (import.meta.env.DEV) {
      console.error("Lozana route error", {
        error,
        componentStack: info.componentStack,
      });
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.state.hasError &&
      shouldResetErrorBoundary(
        prevProps.children,
        this.props.children,
        prevProps.resetKey,
        this.props.resetKey
      )
    ) {
      this.setState({ hasError: false });
    }
  }

  private handleRetry = () => {
    this.setState((state) => ({
      hasError: false,
      generation: state.generation + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div style={{ padding: 24, textAlign: "center" }}>
            <h2>Something went wrong</h2>
            <p>{getPublicErrorMessage()}</p>
            <button onClick={this.handleRetry}>Try again</button>
          </div>
        )
      );
    }
    // The key forces React to discard and remount children after a retry.
    return <Fragment key={this.state.generation}>{this.props.children}</Fragment>;
  }
}
