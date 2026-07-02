import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Dashboard render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
              <path d="M10 2 18 16H2z" strokeLinejoin="round" />
              <path d="M10 8v3.5" strokeLinecap="round" />
              <circle cx="10" cy="13.6" r="0.9" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <h2 className="font-display text-base font-bold text-slate-800">Algo se rompió en el dashboard</h2>
          <p className="mt-2 text-sm text-slate-500">
            {this.state.error.message || "Ocurrió un error inesperado renderizando esta vista."}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-5 rounded-full bg-indigo-600 px-5 py-2 text-xs font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }
}
