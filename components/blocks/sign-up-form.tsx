"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, StatefulButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface SignUpValues {
  email: string;
  password: string;
}

export interface SignUpFormProps {
  title?: string;
  description?: string;
  /** Called with valid values. Reject to keep the form open and shake the button. */
  onSubmit?: (values: SignUpValues) => Promise<void> | void;
  onGithub?: () => void;
  /** Show the "Continue with GitHub" button and divider. */
  showGithub?: boolean;
  githubLabel?: string;
  minPasswordLength?: number;
  submitLabel?: string;
  termsHref?: string;
  privacyHref?: string;
  /** Shows "Already have an account?" with this link. */
  signInHref?: string;
  successTitle?: string;
  className?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LEVELS = [
  { label: "Too short", tone: "bg-danger", text: "text-danger" },
  { label: "Weak", tone: "bg-danger", text: "text-danger" },
  { label: "Fair", tone: "bg-warning", text: "text-warning" },
  { label: "Good", tone: "bg-info", text: "text-info" },
  { label: "Strong", tone: "bg-success", text: "text-success" },
] as const;

function scorePassword(pw: string, min: number) {
  if (pw.length < min) return 0;
  let s = 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length >= min + 6 && s < 4) s++;
  return s;
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function StrengthMeter({ score, visible }: { score: number; visible: boolean }) {
  const level = LEVELS[score];
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ height: { type: "spring", stiffness: 320, damping: 32 }, opacity: { duration: 0.15 } }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-3 pt-2">
            <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden>
              {[1, 2, 3, 4].map((seg) => (
                <span key={seg} className="h-1.5 overflow-hidden rounded-full bg-surface-sunken ring-1 ring-inset ring-border">
                  <motion.span
                    className={cn("block h-full origin-left rounded-full transition-colors duration-300", level.tone)}
                    initial={false}
                    animate={{ scaleX: score >= seg ? 1 : 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30, delay: score >= seg ? (seg - 1) * 0.04 : 0 }}
                  />
                </span>
              ))}
            </div>
            <span className={cn("w-16 text-right text-xs font-medium", level.text)} aria-live="polite">
              {level.label}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Sign-up card: GitHub button, validated email that shakes on error, animated password-strength meter, stateful submit and a success state that morphs in. */
export function SignUpForm({
  title = "Create your GetUrUI account",
  description = "Free forever for the open library. Upgrade when you need Pro blocks.",
  onSubmit,
  onGithub,
  showGithub = true,
  githubLabel = "Continue with GitHub",
  minPasswordLength = 8,
  submitLabel = "Create account",
  termsHref = "#",
  privacyHref = "#",
  signInHref,
  successTitle = "Check your inbox",
  className,
}: SignUpFormProps) {
  const reduce = useReducedMotion() ?? false;
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [reveal, setReveal] = React.useState(false);
  const [errors, setErrors] = React.useState<{ email?: string; password?: string }>({});
  const [done, setDone] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const score = scorePassword(password, minPasswordLength);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function submit() {
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = email ? "Enter a valid email, like you@company.com" : "Email is required";
    if (password.length < minPasswordLength) next.password = `Use at least ${minPasswordLength} characters`;
    setErrors(next);
    if (next.email || next.password) throw new Error("invalid");
    if (onSubmit) await onSubmit({ email: email.trim(), password });
    else await new Promise((r) => setTimeout(r, 1100));
    const submitted = email.trim();
    timer.current = setTimeout(() => setDone(submitted), 650);
  }

  function reset() {
    setDone(null);
    setPassword("");
    setErrors({});
    timer.current = setTimeout(() => emailRef.current?.focus(), 50);
  }

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className={cn("mx-auto w-full max-w-[420px] overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-lg sm:p-8", className)}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {done === null ? (
          <motion.div
            key="form"
            layout="position"
            initial={{ opacity: 0, filter: "blur(8px)", scale: 0.98 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(8px)", scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="grid gap-6"
          >
            <header className="grid gap-1.5">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">{title}</h2>
              {description && <p className="text-sm leading-[22px] text-ink-muted">{description}</p>}
            </header>

            {showGithub ? (
              <>
                <Button variant="secondary" size="lg" block onClick={onGithub}>
                  <GithubMark className="size-[18px]" />
                  {githubLabel}
                </Button>
                <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.5px] text-ink-subtle">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>
              </>
            ) : null}

            <form
              noValidate
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <Input
                ref={emailRef}
                type="email"
                name="email"
                label="Work email"
                placeholder="you@company.com"
                autoComplete="email"
                icon={<Mail className="size-4" aria-hidden />}
                value={email}
                error={errors.email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((x) => ({ ...x, email: undefined }));
                }}
                onBlur={() => {
                  if (email && !EMAIL_RE.test(email.trim())) setErrors((x) => ({ ...x, email: "Enter a valid email, like you@company.com" }));
                }}
              />
              <div className="grid">
                <Input
                  type={reveal ? "text" : "password"}
                  name="password"
                  label="Password"
                  placeholder={`At least ${minPasswordLength} characters`}
                  autoComplete="new-password"
                  icon={<Lock className="size-4" aria-hidden />}
                  value={password}
                  error={errors.password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((x) => ({ ...x, password: undefined }));
                  }}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setReveal((r) => !r)}
                      aria-label={reveal ? "Hide password" : "Show password"}
                      aria-pressed={reveal}
                      className="-mr-1.5 grid size-7 place-items-center rounded-md text-ink-subtle outline-none transition-colors hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)]"
                    >
                      {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                />
                <StrengthMeter score={score} visible={password.length > 0} />
              </div>
              <StatefulButton type="submit" size="lg" block className="mt-1" onAction={submit} successLabel="Account created">
                {submitLabel}
              </StatefulButton>
            </form>

            <p className="text-center text-xs leading-5 text-ink-subtle">
              By continuing you agree to the{" "}
              <a href={termsHref} className="text-ink-muted underline underline-offset-2 hover:text-ink">
                Terms
              </a>{" "}
              and{" "}
              <a href={privacyHref} className="text-ink-muted underline underline-offset-2 hover:text-ink">
                Privacy policy
              </a>
              .
              {signInHref && (
                <>
                  <br />
                  Already have an account?{" "}
                  <a href={signInHref} className="font-medium text-volt-ink hover:underline">
                    Sign in
                  </a>
                </>
              )}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="done"
            layout="position"
            role="status"
            initial={{ opacity: 0, filter: "blur(8px)", scale: 0.96 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="grid justify-items-center gap-4 py-6 text-center"
          >
            <motion.span
              className="grid size-16 place-items-center rounded-full bg-volt-soft text-volt-ink"
              initial={reduce ? false : { scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.05 }}
            >
              <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <motion.path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                />
              </svg>
            </motion.span>
            <div className="grid gap-1.5">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.5px] text-ink">{successTitle}</h2>
              <p className="text-sm leading-[22px] text-ink-muted">
                We sent a confirmation link to <span className="font-medium text-ink">{done}</span>. It expires in 24 hours.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              Use a different email
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
