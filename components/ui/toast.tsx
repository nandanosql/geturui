"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "danger" | "info" | "warning" | "loading";

export interface ToastData {
  id: string;
  tone?: ToastTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  /** ms before auto-dismiss; 0 keeps it. Loading toasts never auto-dismiss. */
  duration?: number;
}

type Listener = (toasts: ToastData[]) => void;
let toasts: ToastData[] = [];
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l(toasts));
/** When each toast was last shown or updated — its auto-dismiss clock starts here. */
const stamps = new Map<string, number>();
let counter = 0;

/** Push a toast from anywhere. Returns its id so you can update or dismiss it. */
export function toast(t: Omit<ToastData, "id"> & { id?: string }) {
  const id = t.id ?? `t${++counter}`;
  const exists = toasts.some((x) => x.id === id);
  toasts = exists ? toasts.map((x) => (x.id === id ? { ...x, ...t, id } : x)) : [{ ...t, id }, ...toasts].slice(0, 6);
  stamps.set(id, Date.now());
  emit();
  return id;
}
toast.success = (title: React.ReactNode, description?: React.ReactNode) => toast({ tone: "success", title, description });
toast.error = (title: React.ReactNode, description?: React.ReactNode) => toast({ tone: "danger", title, description });
toast.info = (title: React.ReactNode, description?: React.ReactNode) => toast({ tone: "info", title, description });
toast.dismiss = (id: string) => {
  toasts = toasts.filter((x) => x.id !== id);
  stamps.delete(id);
  emit();
};

export function useToasts() {
  const [list, setList] = React.useState<ToastData[]>(toasts);
  React.useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);
  return list;
}

const icons = {
  success: <CheckCircle2 className="size-[18px] text-success" aria-hidden />,
  danger: <XCircle className="size-[18px] text-danger" aria-hidden />,
  info: <Info className="size-[18px] text-info" aria-hidden />,
  warning: <AlertTriangle className="size-[18px] text-warning" aria-hidden />,
  loading: <Loader2 className="size-[18px] animate-spin text-ink-muted" aria-hidden />,
};

export function ToastCard({ t, onClose }: { t: ToastData; onClose?: () => void }) {
  const tone = t.tone ?? "info";
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className="grid w-[360px] max-w-[calc(100vw-32px)] grid-cols-[auto_1fr_auto] items-start gap-3 rounded-[14px] bg-surface-raised px-4 py-3.5 text-ink shadow-md"
    >
      <span className="mt-0.5">{icons[tone]}</span>
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-5">{t.title}</div>
        {t.description && <div className="mt-0.5 text-[13px] leading-[18px] text-ink-muted">{t.description}</div>}
        {t.action && (
          <button type="button" onClick={t.action.onClick} className="mt-1.5 text-[13px] font-medium text-volt-ink hover:underline">
            {t.action.label}
          </button>
        )}
      </div>
      {onClose && (
        <button type="button" aria-label="Dismiss" onClick={onClose} className="-mr-1 rounded-md p-1 text-ink-subtle hover:bg-surface-hover hover:text-ink">
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Stack of up to three toasts, bottom-right; hover fans them out. Mount once in your layout. */
export function Toaster({ position = "bottom-right" }: { position?: "bottom-right" | "bottom-center" }) {
  const list = useToasts();
  const [hover, setHover] = React.useState(false);

  // Each toast keeps its own clock (pushing another doesn't extend it); hovering pauses all of them.
  React.useEffect(() => {
    if (hover) return;
    const now = Date.now();
    const timers = list
      .filter((t) => t.tone !== "loading" && t.duration !== 0)
      .map((t) => {
        const elapsed = now - (stamps.get(t.id) ?? now);
        return setTimeout(() => toast.dismiss(t.id), Math.max(0, (t.duration ?? 4200) - elapsed));
      });
    return () => timers.forEach(clearTimeout);
  }, [list, hover]);

  const visible = list.slice(0, 3);
  return (
    <div
      aria-live="polite"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        // Restart the clocks so nothing vanishes the instant the pointer leaves.
        const now = Date.now();
        list.forEach((t) => stamps.set(t.id, now));
        setHover(false);
      }}
      className={cn("fixed bottom-4 z-[100] grid", position === "bottom-right" ? "right-4" : "left-1/2 -translate-x-1/2")}
    >
      <AnimatePresence initial={false}>
        {visible.map((t, i) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.9, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: hover ? -i * 84 : -i * 14, scale: hover ? 1 : 1 - i * 0.05, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.92, filter: "blur(4px)", transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            style={{ gridArea: "1 / 1", zIndex: 10 - i, transformOrigin: "50% 100%", alignSelf: "end" }}
          >
            <ToastCard t={t} onClose={() => toast.dismiss(t.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
