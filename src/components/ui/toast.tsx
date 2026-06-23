"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, kind }]);
      setTimeout(() => remove(id), 4500);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const Icon =
            t.kind === "success"
              ? CheckCircle2
              : t.kind === "error"
                ? AlertTriangle
                : Info;
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "glass pointer-events-auto flex items-start gap-2.5 rounded-lg border p-3 text-sm shadow-xl animate-slide-in",
                t.kind === "success" && "border-primary/40",
                t.kind === "error" && "border-danger/40",
                t.kind === "info" && "border-accent/40"
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  t.kind === "success" && "text-primary",
                  t.kind === "error" && "text-danger",
                  t.kind === "info" && "text-accent"
                )}
              />
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                aria-label="Dismiss"
                className="shrink-0 text-text-dim hover:text-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  // No-op fallback so components never crash if rendered outside the provider.
  return ctx ?? { toast: () => {} };
}
