import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ForgePath rendering failed", error, info);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-dvh place-items-center bg-app-bg px-5 py-10 text-app-text">
        <section
          role="alert"
          className="w-full max-w-lg rounded-panel border border-app-line bg-app-panel p-6 text-center shadow-panel sm:p-8"
        >
          <p className="text-micro font-bold uppercase tracking-eyebrow text-status-amber">
            Application recovery
          </p>
          <h1 className="mt-3 font-manrope text-2xl font-extrabold tracking-tight">
            ForgePath could not display this page
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-app-muted">
            Your saved projects were not changed. Reload the application to
            restore a clean interface state.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload ForgePath
            </button>
            <a className="btn" href="/">
              Return home
            </a>
          </div>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
