import React, { ErrorInfo, ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Cập nhật state để lần render tiếp theo hiển thị UI thay thế
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-red-100 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Đã xảy ra lỗi!</h1>
            <p className="text-gray-500 mb-6">
                Ứng dụng gặp sự cố không mong muốn. Đừng lo, dữ liệu của bạn vẫn an toàn trên trình duyệt.
            </p>

            <div className="bg-gray-100 p-4 rounded-lg mb-6 text-left overflow-auto max-h-40 border border-gray-200">
                <p className="text-red-600 font-mono text-sm break-all">
                    {this.state.error?.message || 'Unknown Error'}
                </p>
                <details className="mt-2 text-xs text-gray-500 font-mono cursor-pointer">
                    <summary>Chi tiết Stack Trace</summary>
                    <pre className="mt-2 whitespace-pre-wrap">
                        {this.state.errorInfo?.componentStack}
                    </pre>
                </details>
            </div>

            <div className="flex flex-col gap-3">
                <button 
                    onClick={this.handleReload}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/30"
                >
                    Tải lại trang
                </button>
                <button 
                    onClick={this.handleClearCache}
                    className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-all"
                >
                    Xóa Cache & Tải lại (Nếu lỗi lặp lại)
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;