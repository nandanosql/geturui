"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, type InputProps } from "@/components/ui/input";

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export interface PasswordRequirement {
  label: string;
  test: (value: string) => boolean;
}

export interface PasswordInputProps extends Omit<InputProps, "type" | "trailing" | "clearable" | "onClear"> {
  /** Show the four-segment strength meter under the field. @default true */
  showStrength?: boolean;
  /** Custom scorer returning 0 (empty) to 4 (strong). Defaults to a length + character-mix heuristic. */
  scorer?: (value: string) => PasswordStrength;
  /** Checklist rendered under the meter; each row ticks when its test passes. */
  requirements?: PasswordRequirement[];
  /** Start with the password visible. */
  defaultVisible?: boolean;
  /** Called when the show/hide toggle flips. */
  onVisibleChange?: (visible: boolean) => void;
}

/** Default scorer: length (8, 12), mixed case, a digit and a symbol, capped at 4. */
export function scorePassword(value: string): PasswordStrength {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  if (value.length < 8) score = Math.min(score, 1);
  return Math.max(1, Math.min(4, score)) as PasswordStrength;
}

const levels: { word: string; bar: string; text: string }[] = [
  { word: "", bar: "bg-border", text: "text-ink-subtle" },
  { word: "Weak", bar: "bg-danger", text: "text-danger" },
  { word: "Fair", bar: "bg-warning", text: "text-warning" },
  { word: "Good", bar: "bg-info", text: "text-info" },
  { word: "Strong", bar: "bg-success", text: "text-success" },
];

/** Eye that blinks on toggle; a slash draws across it while the password is visible. */
function EyeGlyph({ visible, blink }: { visible: boolean; blink: number }) {
  const reduce = useReducedMotion();
  const blinking = !reduce && blink > 0;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
      <motion.path
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"
        animate={blinking ? { scaleY: [1, 0.15, 1] } : undefined}
        key={`lid-${blink}`}
        transition={{ duration: 0.28, ease: "easeInOut" }}
        style={{ transformOrigin: "12px 12px" }}
      />
      <motion.circle
        cx={12}
        cy={12}
        r={3}
        animate={blinking ? { scaleY: [1, 0, 1] } : undefined}
        key={`pupil-${blink}`}
        transition={{ duration: 0.28, ease: "easeInOut" }}
        style={{ transformOrigin: "12px 12px" }}
      />
      <motion.path
        d="M4 4l16 16"
        initial={false}
        animate={{ pathLength: visible ? 1 : 0, opacity: visible ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 30 }}
      />
    </svg>
  );
}

/** Password field with an eye toggle that blinks, a strength meter whose segments spring in, and an optional checklist. */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  {
    showStrength = true,
    scorer = scorePassword,
    requirements,
    defaultVisible = false,
    onVisibleChange,
    value,
    defaultValue,
    onChange,
    wrapperClassName,
    disabled,
    icon,
    iconLeading,
    ...props
  },
  ref,
) {
  const reduce = useReducedMotion();
  const uid = React.useId();
  const inputId = props.id ?? `pw${uid.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [visible, setVisible] = React.useState(defaultVisible);
  const [blink, setBlink] = React.useState(0);
  const [inner, setInner] = React.useState(String(defaultValue ?? ""));
  const current = value !== undefined && value !== null ? String(value) : inner;
  const score = scorer(current);
  const level = levels[score];

  const toggle = (
    <button
      type="button"
      aria-label="Show password"
      aria-pressed={visible}
      aria-controls={inputId}
      disabled={disabled}
      onClick={() => {
        setVisible((v) => !v);
        setBlink((b) => b + 1);
        onVisibleChange?.(!visible);
      }}
      className="-mr-1 grid size-7 shrink-0 place-items-center rounded-[8px] text-ink-subtle outline-none transition-colors hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)]"
    >
      <EyeGlyph visible={visible} blink={blink} />
    </button>
  );

  return (
    <div className={cn("grid gap-2", wrapperClassName)}>
      <Input
        ref={ref}
        {...props}
        id={inputId}
        type={visible ? "text" : "password"}
        autoComplete={props.autoComplete ?? "current-password"}
        spellCheck={false}
        autoCapitalize="off"
        disabled={disabled}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={(e) => {
          setInner(e.target.value);
          onChange?.(e);
        }}
        icon={icon}
        iconLeading={iconLeading ?? (icon ? undefined : Lock)}
        trailing={toggle}
        inputClassName={cn(!visible && current && "tracking-[0.18em]", props.inputClassName)}
      />

      {showStrength && (
        <div className="grid gap-1.5">
          <div className="flex items-center gap-3">
            <div
              role="meter"
              aria-label="Password strength"
              aria-valuemin={0}
              aria-valuemax={4}
              aria-valuenow={score}
              aria-valuetext={level.word || "Empty"}
              className="grid flex-1 grid-cols-4 gap-1"
            >
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className="relative h-1 overflow-hidden rounded-full bg-surface-sunken">
                  <motion.span
                    className={cn("absolute inset-0 origin-left rounded-full", levels[score].bar)}
                    initial={false}
                    animate={{ scaleX: score >= i ? 1 : 0 }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 22, delay: score >= i ? (i - 1) * 0.04 : 0 }
                    }
                  />
                </span>
              ))}
            </div>
            <span className="relative h-4 w-12 text-right text-xs font-medium" aria-live="polite">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={score}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)", y: 4 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)", y: -4 }}
                  transition={{ duration: 0.18 }}
                  className={cn("absolute inset-0", level.text)}
                >
                  {level.word}
                </motion.span>
              </AnimatePresence>
            </span>
          </div>
        </div>
      )}

      {requirements && requirements.length > 0 && (
        <ul className="grid gap-1 sm:grid-cols-2" aria-label="Password requirements">
          {requirements.map((r) => {
            const ok = r.test(current);
            return (
              <li key={r.label} className={cn("flex items-center gap-1.5 text-xs transition-colors duration-200", ok ? "text-ink" : "text-ink-subtle")}>
                <span
                  className={cn(
                    "grid size-3.5 place-items-center rounded-full border transition-colors duration-200",
                    ok ? "border-transparent bg-success-soft text-success" : "border-border-strong",
                  )}
                >
                  <AnimatePresence initial={false}>
                    {ok && (
                      <motion.span
                        initial={reduce ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={reduce ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 600, damping: 24 }}
                        className="grid place-items-center"
                      >
                        <Check className="size-2.5" strokeWidth={3} aria-hidden />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                {r.label}
                <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
