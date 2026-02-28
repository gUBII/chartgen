"use client";

import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from "react";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (variant: ToastVariant, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const variantStyles: Record<ToastVariant, string> = {
  success: "border-emerald-400/50 bg-emerald-500/15 text-emerald-100",
  error: "border-red-400/50 bg-red-500/15 text-red-100",
  warning: "border-amber-400/50 bg-amber-500/15 text-amber-100",
  info: "border-blue-400/50 bg-blue-500/15 text-blue-100",
};

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const ms = item.duration ?? 4000;
    const timer = setTimeout(() => onDismiss(item.id), ms);
    return () => clearTimeout(timer);
  }, [item, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border px-4 py-3 text-xs font-medium shadow-lg backdrop-blur-sm transition-all ${variantStyles[item.variant]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span>{item.message}</span>
        <button
          onClick={() => onDismiss(item.id)}
          className="text-current opacity-60 hover:opacity-100 transition"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (variant: ToastVariant, message: string, duration?: number) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, variant, message, duration }]);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export { ToastProvider, useToast };
export type { ToastVariant };
