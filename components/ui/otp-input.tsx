"use client";

import * as React from "react";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type OtpStatus = "idle" | "error" | "success";

export interface OtpInputProps {
  /** Number of slots. */
  length?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /**
   * Called once every slot is filled. Return (or resolve) `true` to show success,
   * `false` to shake and clear, or nothing to leave the status to the `status` prop.
   */
  onComplete?: (value: string) => boolean | void | Promise<boolean | void>;
  /** Controlled status; overrides the result of onComplete. */
  status?: OtpStatus;
  /** Accept digits only, or letters and digits. */
  mode?: "numeric" | "alphanumeric";
  /** Insert a dash after every N slots, e.g. 3 → 123-456. */
  groupSize?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  "aria-label"?: string;
}

/** One-time-code field: a focus ring that glides between slots, digits that roll in, paste support, an error shake and a check that draws itself. */
export function OtpInput({
  length = 6,
  value,
  defaultValue = "",
  onChange,
  onComplete,
  status: statusProp,
  mode = "numeric",
  groupSize,
  disabled,
  autoFocus,
  className,
  ...rest
}: OtpInputProps) {
  const uid = React.useId();
  const reduce = useReducedMotion();
  const [inner, setInner] = React.useState(defaultValue.slice(0, length));
  const code = (value ?? inner).slice(0, length);
  const [focused, setFocused] = React.useState<number | null>(null);
  const [innerStatus, setInnerStatus] = React.useState<OtpStatus>("idle");
  const [checking, setChecking] = React.useState(false);
  const status = statusProp ?? innerStatus;
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const prevStatus = React.useRef<OtpStatus>(status);

  const allowed = mode === "numeric" ? /[0-9]/ : /[a-zA-Z0-9]/;
  const clean = (s: string) =>
    s
      .split("")
      .filter((c) => allowed.test(c))
      .join("")
      .toUpperCase();

  // Shake on every transition into the error state.
  React.useEffect(() => {
    if (status === "error" && prevStatus.current !== "error" && scope.current && !reduce) {
      animate(scope.current, { x: [0, -10, 9, -6, 5, -2, 0] }, { duration: 0.42, ease: "easeOut" });
    }
    prevStatus.current = status;
  }, [status, animate, scope, reduce]);

  const focusSlot = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    el?.select();
  };

  async function commit(next: string) {
    if (value === undefined) setInner(next);
    onChange?.(next);
    if (innerStatus !== "idle") setInnerStatus("idle");
    if (next.length === length && !next.includes(" ") && onComplete) {
      setChecking(true);
      try {
        const ok = await onComplete(next);
        if (ok === true) setInnerStatus("success");
        else if (ok === false) {
          setInnerStatus("error");
          setTimeout(() => {
            if (value === undefined) setInner("");
            onChange?.("");
            focusSlot(0);
          }, 520);
        }
      } finally {
        setChecking(false);
      }
    }
  }

  /** Write `chars` starting at slot `start`, returns the next slot to focus. */
  function writeAt(start: number, chars: string) {
    const arr = code.padEnd(length, " ").split("");
    let i = start;
    for (const c of chars) {
      if (i >= length) break;
      arr[i] = c;
      i++;
    }
    void commit(arr.join("").replace(/\s+$/, ""));
    return i;
  }

  function clearAt(i: number) {
    const arr = code.padEnd(length, " ").split("");
    arr[i] = " ";
    void commit(arr.join("").replace(/\s+$/, ""));
  }

  function onInput(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const raw = clean(e.target.value);
    if (!raw) return;
    // Typing into a filled slot: keep the newest character.
    const current = code[i] && code[i] !== " " ? code[i] : "";
    const chars = raw.length > 1 && current && raw.startsWith(current) ? raw.slice(current.length) : raw.length > 1 && current && raw.endsWith(current) ? raw.slice(0, -current.length) : raw;
    const next = writeAt(i, chars);
    focusSlot(next);
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    const filled = code[i] && code[i] !== " ";
    if (e.key === "Backspace") {
      e.preventDefault();
      if (filled) clearAt(i);
      else if (i > 0) {
        clearAt(i - 1);
        focusSlot(i - 1);
      }
    } else if (e.key === "Delete") {
      e.preventDefault();
      if (filled) clearAt(i);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusSlot(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusSlot(i + 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusSlot(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusSlot(Math.min(code.trimEnd().length, length - 1));
    }
  }

  function onPaste(i: number, e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const chars = clean(e.clipboardData.getData("text"));
    if (!chars) return;
    const start = chars.length >= length ? 0 : i;
    const next = writeAt(start, chars);
    focusSlot(next >= length ? length - 1 : next);
  }

  const tone =
    status === "error" ? "border-danger" : status === "success" ? "border-success" : "border-border-strong";
  const label = rest["aria-label"] ?? "Verification code";

  return (
    <div className={cn("inline-flex flex-col items-center gap-3", className)}>
      <div className="flex items-center gap-3">
        <div ref={scope} role="group" aria-label={label} className="flex items-center gap-2" aria-busy={checking || undefined}>
          {Array.from({ length }, (_, i) => {
            const ch = code[i] && code[i] !== " " ? code[i] : "";
            const on = focused === i;
            const dash = groupSize && i > 0 && i % groupSize === 0;
            return (
              <React.Fragment key={i}>
                {dash && <span aria-hidden className="h-0.5 w-2.5 rounded-full bg-border-strong" />}
                <div
                  className={cn(
                    "relative grid h-14 w-11 place-items-center rounded-[14px] border bg-surface-sunken transition-colors duration-200 sm:w-12",
                    tone,
                    disabled && "opacity-45",
                  )}
                >
                  <input
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    id={`${uid}-${i}`}
                    value={ch}
                    onChange={(e) => onInput(i, e)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    onPaste={(e) => onPaste(i, e)}
                    onFocus={(e) => {
                      setFocused(i);
                      e.currentTarget.select();
                    }}
                    onBlur={(e) => {
                      const to = e.relatedTarget as HTMLElement | null;
                      if (!to || !refs.current.includes(to as HTMLInputElement)) setFocused(null);
                    }}
                    autoFocus={autoFocus && i === 0}
                    disabled={disabled}
                    inputMode={mode === "numeric" ? "numeric" : "text"}
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    autoCapitalize="characters"
                    pattern={mode === "numeric" ? "[0-9]*" : undefined}
                    aria-label={`${label}, character ${i + 1} of ${length}`}
                    aria-invalid={status === "error" || undefined}
                    className="absolute inset-0 size-full cursor-text rounded-[14px] bg-transparent text-center text-transparent caret-transparent outline-none selection:bg-transparent"
                  />
                  <span aria-hidden className="pointer-events-none relative h-8 overflow-hidden font-mono text-[26px] font-semibold leading-8 text-ink">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {ch ? (
                        <motion.span
                          key={ch + i}
                          className="block"
                          initial={reduce ? { opacity: 0 } : { y: 22, opacity: 0, filter: "blur(4px)" }}
                          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                          exit={reduce ? { opacity: 0 } : { y: -18, opacity: 0, filter: "blur(4px)" }}
                          transition={{ type: "spring", stiffness: 520, damping: 30 }}
                        >
                          {ch}
                        </motion.span>
                      ) : on ? (
                        <motion.span
                          key="caret"
                          className="mt-1.5 block h-5 w-[2px] rounded-full bg-volt-ink"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [1, 1, 0, 0] }}
                          exit={{ opacity: 0, transition: { duration: 0.05 } }}
                          transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
                        />
                      ) : null}
                    </AnimatePresence>
                  </span>
                  {on && status !== "success" && (
                    <motion.span
                      layoutId={`${uid}-ring`}
                      aria-hidden
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }}
                      className="pointer-events-none absolute -inset-px rounded-[14px] border-2 border-volt-ink shadow-[0_0_0_4px_var(--volt-soft)]"
                    />
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <AnimatePresence>
          {status === "success" && (
            <motion.span
              key="check"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-success/15 text-success"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
                <motion.path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke="currentColor"
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
                />
              </svg>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <p aria-live="polite" className="sr-only">
        {checking ? "Checking code" : status === "success" ? "Code verified" : status === "error" ? "That code is incorrect" : ""}
      </p>
    </div>
  );
}
