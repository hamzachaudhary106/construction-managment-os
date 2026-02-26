import React, { createContext, useCallback, useContext, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

type Toast = { id: number; message: string; type: ToastType };

type ToastContextType = {
  toasts: Toast[];
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, type: ToastType) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const success = useCallback((message: string) => add(message, 'success'), [add]);
  const error = useCallback((message: string) => add(message, 'error'), [add]);
  const info = useCallback((message: string) => add(message, 'info'), [add]);
  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, success, error, info, dismiss }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            role="alert"
          >
            <span>{t.message}</span>
            <button type="button" className="toast-dismiss" onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { success: () => {}, error: () => {}, info: () => {}, dismiss: () => {} };
  return ctx;
}
