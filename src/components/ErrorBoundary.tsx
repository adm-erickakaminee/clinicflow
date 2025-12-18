import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("❌ ErrorBoundary capturou um erro:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-red-50 p-4 overflow-x-hidden">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-red-600 mb-4">Erro ao renderizar</h1>
            <p className="text-sm sm:text-base text-gray-700 mb-4">
              Ocorreu um erro ao renderizar a aplicação. Por favor, verifique o console para mais
              detalhes.
            </p>
            {this.state.error && (
              <div className="bg-gray-100 rounded p-3 sm:p-4 mb-4 overflow-x-auto">
                <p className="font-semibold text-xs sm:text-sm text-gray-800 mb-2">Erro:</p>
                <pre className="text-xs text-red-600 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}
            {this.state.errorInfo && (
              <div className="bg-gray-100 rounded p-3 sm:p-4 mb-4 overflow-x-auto">
                <p className="font-semibold text-xs sm:text-sm text-gray-800 mb-2">Stack Trace:</p>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm sm:text-base"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
