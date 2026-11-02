import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCcw, Database, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PixelWordmark } from "@/components/app/PixelWordmark";
import { PixelIcon } from "@/components/pixel/PixelIcon";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  /** Second step for the destructive action, so it cannot be a stray tap. */
  isConfirmingReset: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isConfirmingReset: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private retry = () => {
    this.setState({ hasError: false, error: null, isConfirmingReset: false });
  };

  private resetData = () => {
    localStorage.clear();
    indexedDB.deleteDatabase("keyval-store");
    window.location.reload();
  };

  public render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const { isConfirmingReset, error } = this.state;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-[380px] flex flex-col items-center">
          <div
            className="w-full material-thick squircle rounded-panel
                       px-6 pt-8 pb-6 flex flex-col items-center text-center"
          >
            <span
              className="grid place-items-center w-14 h-14 rounded-card squircle mb-5"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--color-destructive) 16%, transparent)",
                color: "var(--color-destructive)",
              }}
            >
              <PixelIcon name="alert" size={26} />
            </span>

            <h1 className="text-title-2 font-semibold text-text tracking-[-0.02em]">
              Something went wrong
            </h1>
            <p className="text-subheadline text-muted mt-2 leading-relaxed">
              {isConfirmingReset
                ? "This deletes every project, collection and preference stored in this browser. It cannot be undone."
                : "The app hit an unexpected error. Your projects and library are safe."}
            </p>

            {error?.message && !isConfirmingReset && (
              <details className="mt-4 w-full text-left">
                <summary className="text-caption-1 text-faint cursor-pointer hover:text-muted transition-colors">
                  Technical details
                </summary>
                <pre
                  className="mt-2 p-3 rounded-control text-caption-2 text-muted
                             overflow-auto max-h-32 scrollbar-ios"
                  style={{ backgroundColor: "var(--color-surface-secondary)" }}
                >
                  {error.message}
                </pre>
              </details>
            )}

            <div className="w-full flex flex-col gap-2.5 mt-7">
              {isConfirmingReset ? (
                <>
                  <Button
                    variant="danger"
                    size="lg"
                    fullWidth
                    onClick={this.resetData}
                  >
                    Erase everything
                  </Button>
                  <Button
                    variant="gray"
                    size="lg"
                    fullWidth
                    icon={<ChevronLeft size={16} />}
                    onClick={() => this.setState({ isConfirmingReset: false })}
                  >
                    Keep my data
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="filled"
                    size="lg"
                    fullWidth
                    icon={<RotateCcw size={17} />}
                    onClick={this.retry}
                  >
                    Try again
                  </Button>
                  <Button
                    variant="gray"
                    size="lg"
                    fullWidth
                    icon={<Database size={16} />}
                    onClick={() => this.setState({ isConfirmingReset: true })}
                  >
                    Reset local data
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 text-faint">
            <PixelWordmark height={14} />
          </div>
        </div>
      </div>
    );
  }
}
