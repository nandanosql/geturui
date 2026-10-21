"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertCircle, ChevronDown, CircleHelp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, fieldWellClasses, type FieldSize } from "@/components/ui/field";
import { Tooltip } from "@/components/ui/tooltip";

type IconComponent = React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Height: 32, 40 or 48px, matching Button. @default "md" */
  size?: FieldSize;
  /** Leading icon node inside the field. */
  icon?: React.ReactNode;
  /** Leading icon as a component (`Mail`) or node; sized to the field. */
  iconLeading?: IconComponent | React.ReactNode;
  /** Keyboard shortcut chip at the end of the field. */
  kbd?: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  /** Error text. Replaces the hint, turns the border red and shakes once when it appears. */
  error?: React.ReactNode;
  /** Content inside the field after the input, such as a status icon or a small button. */
  trailing?: React.ReactNode;
  /** Joined segment before the field. A string renders a text add-on ("https://"); pass InputAddonSelect or InputAddonButton for controls. */
  leadingAddon?: React.ReactNode;
  /** Joined segment after the field. */
  trailingAddon?: React.ReactNode;
  /** Help text behind a small question-mark button on the label row. */
  tooltip?: React.ReactNode;
  /** Right side of the label row: "Optional", a counter, a link. */
  labelAside?: React.ReactNode;
  /** Show a clear button while the field has a value. */
  clearable?: boolean;
  /** Called after the clear button empties the field. onChange also fires with an empty value. */
  onClear?: () => void;
  /** Classes for the outer grid (label, field, hint). */
  wrapperClassName?: string;
  /** Classes for the <input> itself. */
  inputClassName?: string;
}

const iconSize: Record<FieldSize, string> = { sm: "size-3.5", md: "size-4", lg: "size-[18px]" };

function isComponent(icon: unknown): icon is IconComponent {
  if (typeof icon === "function") return true;
  return typeof icon === "object" && icon !== null && !React.isValidElement(icon) && "$$typeof" in icon;
}

function Addon({ side, children }: { side: "leading" | "trailing"; children: React.ReactNode }) {
  const text = typeof children === "string" || typeof children === "number";
  return (
    <span
      className={cn(
        "flex shrink-0 self-stretch overflow-hidden border-border-strong",
        side === "leading" ? "rounded-l-[inherit] border-r" : "rounded-r-[inherit] border-l",
        text ? "items-center bg-surface px-3 text-ink-muted" : "items-stretch",
      )}
    >
      {children}
    </span>
  );
}

/**
 * Text field on a sunken well: three sizes, leading icon, joined add-ons, help tooltip, clear button,
 * volt halo on focus and one shake on error.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size = "md",
    icon,
    iconLeading,
    kbd,
    label,
    hint,
    error,
    trailing,
    leadingAddon,
    trailingAddon,
    tooltip,
    labelAside,
    clearable,
    onClear,
    className,
    wrapperClassName,
    inputClassName,
    id,
    disabled,
    required,
    readOnly,
    value,
    defaultValue,
    onChange,
    "aria-describedby": describedByProp,
    ...props
  },
  ref,
) {
  const reduce = useReducedMotion();
  const innerRef = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement, []);
  const [filledInner, setFilledInner] = React.useState(() => String(defaultValue ?? "").length > 0);
  const filled = value !== undefined && value !== null ? String(value).length > 0 : filledInner;
  const showClear = clearable && filled && !disabled && !readOnly;
  const s = iconSize[size];

  const lead =
    iconLeading != null && iconLeading !== false
      ? isComponent(iconLeading)
        ? React.createElement(iconLeading, { className: cn(s, "shrink-0"), "aria-hidden": true })
        : <span className={cn("inline-flex shrink-0 [&>svg]:size-full", s)}>{iconLeading as React.ReactNode}</span>
      : icon;

  function clear() {
    const el = innerRef.current;
    if (!el) return;
    // Go through the native setter so React's onChange fires for controlled and uncontrolled fields alike.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    setFilledInner(false);
    el.focus();
    onClear?.();
  }

  const help = tooltip ? (
    <Tooltip content={tooltip} side="top" arrow>
      <button
        type="button"
        aria-label="More info"
        className="grid size-4 place-items-center rounded-full text-ink-subtle outline-none transition-colors hover:text-ink focus-visible:shadow-[var(--focus-ring)]"
      >
        <CircleHelp className="size-3.5" aria-hidden />
      </button>
    </Tooltip>
  ) : null;
  const aside =
    labelAside || help ? (
      <span className="inline-flex items-center gap-2">
        {labelAside}
        {help}
      </span>
    ) : undefined;

  return (
    <Field label={label} hint={hint} error={error} required={required} labelAside={aside} id={id} disabled={disabled} className={wrapperClassName}>
      {(ids) => (
        <div
          className={fieldWellClasses({
            size,
            invalid: ids.invalid,
            disabled,
            className: cn(leadingAddon != null && "pl-0", trailingAddon != null && "pr-0", className),
          })}
        >
          {leadingAddon != null && <Addon side="leading">{leadingAddon}</Addon>}
          {lead}
          <input
            ref={innerRef}
            id={ids.id}
            disabled={disabled}
            required={required}
            readOnly={readOnly}
            value={value}
            defaultValue={defaultValue}
            onChange={(e) => {
              setFilledInner(e.target.value.length > 0);
              onChange?.(e);
            }}
            aria-invalid={ids.invalid || undefined}
            aria-describedby={[ids.describedBy, describedByProp].filter(Boolean).join(" ") || undefined}
            {...props}
            className={cn(
              "min-w-0 flex-1 self-stretch bg-transparent text-ink outline-none focus-visible:shadow-none placeholder:text-ink-subtle disabled:cursor-not-allowed",
              "[&::-webkit-search-cancel-button]:hidden",
              inputClassName,
            )}
          />
          <AnimatePresence initial={false}>
            {showClear && (
              <motion.button
                key="clear"
                type="button"
                aria-label="Clear"
                onClick={clear}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, filter: "blur(4px)" }}
                transition={{ type: "spring", stiffness: 520, damping: 28 }}
                className="-mr-0.5 grid size-5 shrink-0 place-items-center rounded-full text-ink-subtle outline-none transition-colors hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)]"
              >
                <X className="size-3.5" aria-hidden />
              </motion.button>
            )}
          </AnimatePresence>
          {ids.invalid && trailing == null && <AlertCircle aria-hidden className={cn(s, "shrink-0 text-danger")} />}
          {trailing}
          {kbd && (
            <kbd
              aria-hidden
              className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border border-border bg-surface px-1 font-mono text-[11px] text-ink-muted"
            >
              {kbd}
            </kbd>
          )}
          {trailingAddon != null && <Addon side="trailing">{trailingAddon}</Addon>}
        </div>
      )}
    </Field>
  );
});

export interface InputAddonSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: { value: string; label: string }[];
  /** Required: names the select for screen readers ("Country", "Currency"). */
  "aria-label": string;
}

/** Native select styled as a joined Input add-on (country code, currency, protocol). */
export function InputAddonSelect({ options, className, ...props }: InputAddonSelectProps) {
  return (
    <span className="relative flex">
      <select
        {...props}
        className={cn(
          "cursor-pointer appearance-none bg-transparent pl-3 pr-7 text-ink outline-none transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:shadow-none",
          className,
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-subtle" />
    </span>
  );
}

/** Flat button styled as a joined Input add-on ("Copy", "Apply"). */
export const InputAddonButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(function InputAddonButton(
  { className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      {...props}
      className={cn(
        "inline-flex items-center gap-1.5 bg-surface px-3 font-medium text-ink outline-none transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:shadow-[inset_0_0_0_2px_var(--volt-ink)] disabled:pointer-events-none disabled:opacity-45 [&>svg]:size-4",
        className,
      )}
    />
  );
});
