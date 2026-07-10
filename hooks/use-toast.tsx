"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ToastVariant = "default" | "destructive";

interface Toast {
  id: string;
  description: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (props: { description: string; variant?: ToastVariant }) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback(
    ({ description, variant = "default" }: { description: string; variant?: ToastVariant }) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, description, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "bg-foreground text-background font-display animate-in fade-in slide-in-from-bottom-2 rounded-lg px-4 py-3 text-sm shadow-lg",
              t.variant === "destructive" && "bg-destructive text-destructive-foreground"
            )}>
            {t.description}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    return { toast: () => {} };
  }
  return context;
}
