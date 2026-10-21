"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, fieldWellClasses, type FieldSize } from "@/components/ui/field";

export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "unknown";

export interface CardValue {
  /** Digits only. */
  number: string;
  /** Digits only, MMYY. */
  expiry: string;
  /** Digits only. */
  cvc: string;
}

export interface CardMeta {
  brand: CardBrand;
  numberComplete: boolean;
  /** Full length and passes the Luhn check. */
  numberValid: boolean;
  /** A real month that hasn't passed. */
  expiryValid: boolean;
  cvcValid: boolean;
  complete: boolean;
}

export interface CardInputProps {
  value?: CardValue;
  defaultValue?: Partial<CardValue>;
  onValueChange?: (value: CardValue, meta: CardMeta) => void;
  /** @default "md" */
  size?: FieldSize;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  labelAside?: React.ReactNode;
  /** Prefix for the three inputs' name attributes: `${name}-number`, `${name}-expiry`, `${name}-cvc`. */
  name?: string;
  id?: string;
  /** Classes for the well. */
  className?: string;
  /** Classes for the outer grid. */
  wrapperClassName?: string;
}

const brandSpec: Record<CardBrand, { name: string; groups: number[]; cvc: number; tone: string }> = {
  visa: { name: "Visa", groups: [4, 4, 4, 4], cvc: 3, tone: "bg-info-soft text-info" },
  mastercard: { name: "Mastercard", groups: [4, 4, 4, 4], cvc: 3, tone: "bg-warning-soft text-warning" },
  amex: { name: "American Express", groups: [4, 6, 5], cvc: 4, tone: "bg-success-soft text-success" },
  discover: { name: "Discover", groups: [4, 4, 4, 4], cvc: 3, tone: "bg-ember-soft text-ember-ink" },
  unknown: { name: "Card", groups: [4, 4, 4, 4], cvc: 3, tone: "bg-surface text-ink-subtle" },
};

/** Brand from the leading digits (IIN prefix). */
export function detectCardBrand(digits: string): CardBrand {
  if (/^3[47]/.test(digits)) return "amex";
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(digits)) return "mastercard";
  if (/^(6011|65|64[4-9])/.test(digits)) return "discover";
  return "unknown";
}

function luhn(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return digits.length > 0 && sum % 10 === 0;
}

function formatNumber(digits: string, groups: number[]) {
  const out: string[] = [];
  let i = 0;
  for (const g of groups) {
    if (i >= digits.length) break;
    out.push(digits.slice(i, i + g));
    i += g;
  }
  return out.join(" ");
}

function formatExpiry(digits: string) {
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

function computeMeta(v: CardValue): CardMeta {
  const brand = detectCardBrand(v.number);
  const spec = brandSpec[brand];
  const len = spec.groups.reduce((a, b) => a + b, 0);
  const numberComplete = v.number.length === len;
  const numberValid = numberComplete && luhn(v.number);
  let expiryValid = false;
  if (v.expiry.length === 4) {
    const m = Number(v.expiry.slice(0, 2));
    const y = 2000 + Number(v.expiry.slice(2));
    const now = new Date();
    expiryValid = m >= 1 && m <= 12 && (y > now.getFullYear() || (y === now.getFullYear() && m >= now.getMonth() + 1));
  }
  const cvcValid = v.cvc.length === spec.cvc;
  return { brand, numberComplete, numberValid, expiryValid, cvcValid, complete: numberValid && expiryValid && cvcValid };
}

/** Abstract per-brand mark on a small card chip. Generic shapes only, no real logos. */
function BrandMark({ brand }: { brand: CardBrand }) {
  return (
    <svg viewBox="0 0 28 20" className="size-full" aria-hidden fill="currentColor">
      {brand === "unknown" && (
        <>
          <rect x="1.5" y="2.5" width="25" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="5" y="7" width="5" height="4" rx="1" />
          <rect x="5" y="13" width="12" height="1.5" rx="0.75" />
        </>
      )}
      {brand === "visa" && (
        <>
          <path d="M7 14 L10 6 H12.5 L9.5 14 Z" />
          <path d="M12 14 L15 6 H17.5 L14.5 14 Z" opacity="0.75" />
          <path d="M17 14 L20 6 H22.5 L19.5 14 Z" opacity="0.5" />
        </>
      )}
      {brand === "mastercard" && (
        <>
          <rect x="7.5" y="5.5" width="8" height="8" rx="1.5" transform="rotate(45 11.5 9.5)" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <rect x="12.5" y="6.5" width="8" height="8" rx="1.5" transform="rotate(45 16.5 10.5)" opacity="0.6" />
        </>
      )}
      {brand === "amex" && (
        <>
          <rect x="8" y="4" width="5" height="5" rx="1" />
          <rect x="15" y="4" width="5" height="5" rx="1" opacity="0.6" />
          <rect x="8" y="11" width="5" height="5" rx="1" opacity="0.6" />
          <rect x="15" y="11" width="5" height="5" rx="1" />
        </>
      )}
      {brand === "discover" && (
        <>
          <circle cx="16.5" cy="10" r="4.5" />
          <rect x="5" y="9.25" width="9" height="1.5" rx="0.75" opacity="0.7" />
        </>
      )}
    </svg>
  );
}

const rowHeight: Record<FieldSize, string> = { sm: "h-[30px]", md: "h-[38px]", lg: "h-[46px]" };

/**
 * Card number, expiry and CVC in one well. Numbers group as you type (4-6-5 for Amex-style cards), the brand is
 * detected from the prefix and its mark flips in, and focus advances field to field. Stacks to two rows when narrow.
 */
export function CardInput({
  value,
  defaultValue,
  onValueChange,
  size = "md",
  label,
  hint,
  error,
  required,
  disabled,
  labelAside,
  name,
  id,
  className,
  wrapperClassName,
}: CardInputProps) {
  const reduce = useReducedMotion();
  const [inner, setInner] = React.useState<CardValue>(() => ({
    number: onlyDigits(defaultValue?.number ?? ""),
    expiry: onlyDigits(defaultValue?.expiry ?? ""),
    cvc: onlyDigits(defaultValue?.cvc ?? ""),
  }));
  const card = value ?? inner;
  const brand = detectCardBrand(card.number);
  const spec = brandSpec[brand];
  const maxLen = spec.groups.reduce((a, b) => a + b, 0);
  const numberValid = card.number.length === maxLen && luhn(card.number);

  const numberRef = React.useRef<HTMLInputElement>(null);
  const expiryRef = React.useRef<HTMLInputElement>(null);
  const cvcRef = React.useRef<HTMLInputElement>(null);
  const pendingCaret = React.useRef<{ el: HTMLInputElement; digits: number } | null>(null);

  const update = (patch: Partial<CardValue>) => {
    const next = { ...card, ...patch };
    if (value === undefined) setInner(next);
    onValueChange?.(next, computeMeta(next));
  };

  // Put the caret back after the same number of digits once the formatted text re-renders.
  React.useLayoutEffect(() => {
    const p = pendingCaret.current;
    if (!p) return;
    pendingCaret.current = null;
    if (document.activeElement !== p.el) return;
    let seen = 0;
    let pos = 0;
    const text = p.el.value;
    while (pos < text.length && seen < p.digits) {
      if (/\d/.test(text[pos])) seen++;
      pos++;
    }
    p.el.setSelectionRange(pos, pos);
  });

  const digitsBeforeCaret = (el: HTMLInputElement) => onlyDigits(el.value.slice(0, el.selectionStart ?? el.value.length)).length;

  const rh = rowHeight[size];
  const formattedNumber = formatNumber(card.number, spec.groups);
  const placeholderNumber = brand === "amex" ? "3782 822463 10005" : "1234 1234 1234 1234";

  return (
    <Field label={label} hint={hint} error={error} required={required} labelAside={labelAside} id={id} disabled={disabled} className={wrapperClassName}>
      {(ids) => (
        <div className="@container">
          <div
            role="group"
            aria-labelledby={label ? ids.labelId : undefined}
            aria-describedby={ids.describedBy}
            className={fieldWellClasses({
              size,
              invalid: ids.invalid,
              disabled,
              className: cn("flex-col items-stretch gap-0 px-0 @sm:flex-row", className),
            })}
          >
            <div className={cn("flex min-w-0 shrink-0 items-center gap-2.5 pl-2.5 pr-3 @sm:flex-1", rh, "@sm:h-auto")}>
              <span className="relative h-5 w-7 shrink-0 [perspective:200px]" role="img" aria-label={spec.name}>
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    key={brand}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, rotateY: -90, scale: 0.8, filter: "blur(4px)" }}
                    animate={{ opacity: 1, rotateY: 0, scale: 1, filter: "blur(0px)" }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, rotateY: 90, scale: 0.8, filter: "blur(4px)" }}
                    transition={{ type: "spring", stiffness: 360, damping: 26 }}
                    className={cn("absolute inset-0 grid place-items-center rounded-[4px] p-[1px]", spec.tone)}
                  >
                    <BrandMark brand={brand} />
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="sr-only" aria-live="polite">
                {brand !== "unknown" ? `${spec.name} card detected` : ""}
              </span>
              <input
                ref={numberRef}
                id={ids.id}
                name={name ? `${name}-number` : undefined}
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                aria-label={label ? undefined : "Card number"}
                aria-invalid={ids.invalid || undefined}
                aria-describedby={ids.describedBy}
                required={required}
                disabled={disabled}
                placeholder={placeholderNumber}
                value={formattedNumber}
                onChange={(e) => {
                  const el = e.currentTarget;
                  const raw = onlyDigits(el.value);
                  const b = detectCardBrand(raw);
                  const len = brandSpec[b].groups.reduce((a, c) => a + c, 0);
                  const digits = raw.slice(0, len);
                  pendingCaret.current = { el, digits: Math.min(digitsBeforeCaret(el), digits.length) };
                  update({ number: digits, cvc: card.cvc.slice(0, brandSpec[b].cvc) });
                  if (digits.length === len && (el.selectionStart ?? 0) >= el.value.length && luhn(digits)) expiryRef.current?.focus();
                }}
                className="min-w-0 flex-1 self-stretch bg-transparent tabular-nums text-ink outline-none focus-visible:shadow-none placeholder:text-ink-subtle"
              />
              <AnimatePresence initial={false}>
                {numberValid && (
                  <motion.span
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                    transition={{ type: "spring", stiffness: 520, damping: 24 }}
                    className="shrink-0 text-success"
                  >
                    <Check className="size-4" aria-label="Card number looks valid" />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className={cn("flex items-center border-t border-border-strong @sm:border-t-0", rh, "@sm:h-auto")}>
              <input
                ref={expiryRef}
                name={name ? `${name}-expiry` : undefined}
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                aria-label="Expiry date, month and year"
                aria-invalid={ids.invalid || undefined}
                aria-describedby={ids.describedBy}
                required={required}
                disabled={disabled}
                placeholder="MM / YY"
                value={formatExpiry(card.expiry)}
                onChange={(e) => {
                  const el = e.currentTarget;
                  const typed = onlyDigits(el.value).slice(0, 4);
                  // "4" → "04": a lone first digit above 1 can only be a one-digit month.
                  const digits = typed.length === 1 && Number(typed) > 1 ? `0${typed}` : typed;
                  pendingCaret.current = { el, digits: Math.min(digitsBeforeCaret(el) + (digits.length - typed.length), digits.length) };
                  update({ expiry: digits });
                  if (digits.length === 4 && (el.selectionStart ?? 0) >= el.value.length) cvcRef.current?.focus();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !e.currentTarget.value) {
                    e.preventDefault();
                    numberRef.current?.focus();
                  }
                }}
                className="min-w-0 flex-1 self-stretch bg-transparent px-3 tabular-nums text-ink outline-none focus-visible:shadow-none placeholder:text-ink-subtle @sm:w-[78px] @sm:flex-none @sm:px-2"
              />
              <span aria-hidden className="h-full w-px bg-border-strong @sm:hidden" />
              <input
                ref={cvcRef}
                name={name ? `${name}-cvc` : undefined}
                type="text"
                inputMode="numeric"
                autoComplete="cc-csc"
                aria-label={`Security code, ${spec.cvc} digits`}
                aria-invalid={ids.invalid || undefined}
                aria-describedby={ids.describedBy}
                required={required}
                disabled={disabled}
                placeholder={spec.cvc === 4 ? "CVC4" : "CVC"}
                value={card.cvc}
                onChange={(e) => update({ cvc: onlyDigits(e.currentTarget.value).slice(0, spec.cvc) })}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !e.currentTarget.value) {
                    e.preventDefault();
                    expiryRef.current?.focus();
                  }
                }}
                className="min-w-0 flex-1 self-stretch bg-transparent px-3 tabular-nums text-ink outline-none focus-visible:shadow-none placeholder:text-ink-subtle @sm:w-[52px] @sm:flex-none @sm:pl-2 @sm:pr-3"
              />
            </div>
          </div>
        </div>
      )}
    </Field>
  );
}
