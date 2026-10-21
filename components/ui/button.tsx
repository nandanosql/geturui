"use client";

import * as React from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, type HTMLMotionProps } from "motion/react";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner, type SpinnerSize } from "@/components/ui/spinner";

export { buttonClasses, isLinkVariant, type ButtonVariant, type ButtonSize } from "./button-classes";
import { buttonClasses, isLinkVariant, type ButtonVariant, type ButtonSize } from "./button-classes";

export type ButtonIconComponent = React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
/** An icon component (e.g. a lucide icon) or an already-rendered node. */
export type ButtonIcon = ButtonIconComponent | React.ReactNode;

interface ButtonVisualProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Trailing glyph that nudges on hover. */
  trailing?: "arrow" | "external" | React.ReactNode;
  /** Icon before the label. Pass a component (`Plus`) or a node (`<Plus />`). */
  iconLeading?: ButtonIcon;
  /** Icon after the label. Pass a component or a node. */
  iconTrailing?: ButtonIcon;
  /** Shows a spinner, keeps the width and blocks presses (focus stays on the button). */
  loading?: boolean;
  /** Keep the label visible beside the spinner while loading. */
  showTextWhileLoading?: boolean;
  iconOnly?: boolean;
  block?: boolean;
  children?: React.ReactNode;
}

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children">, ButtonVisualProps {
  /** Renders an <a> with the same look. The forwarded ref then points at the anchor. */
  href?: string;
  target?: string;
  rel?: string;
  download?: boolean | string;
}

export interface ButtonLinkProps extends Omit<HTMLMotionProps<"a">, "children">, ButtonVisualProps {
  href?: string;
  /** Renders without href and with aria-disabled, so it is skipped by Tab and can't be followed. */
  disabled?: boolean;
}

const iconClass: Record<ButtonSize, string> = { xs: "size-3.5", sm: "size-4", md: "size-4", lg: "size-[18px]", xl: "size-5" };
const spinnerSize: Record<ButtonSize, SpinnerSize> = { xs: "xs", sm: "xs", md: "sm", lg: "sm", xl: "md" };

function isComponent(icon: ButtonIcon): icon is ButtonIconComponent {
  if (typeof icon === "function") return true;
  // forwardRef / memo components (lucide icons) are objects carrying $$typeof but are not elements.
  return typeof icon === "object" && icon !== null && !React.isValidElement(icon) && "$$typeof" in icon;
}

function renderIcon(icon: ButtonIcon | undefined, className: string) {
  if (icon == null || icon === false) return null;
  if (isComponent(icon)) return React.createElement(icon, { className, "aria-hidden": true });
  return <span className={cn("inline-flex shrink-0 [&>svg]:size-full", className)}>{icon}</span>;
}

function Trailing({ trailing, size }: { trailing: ButtonProps["trailing"]; size: ButtonSize }) {
  if (!trailing) return null;
  const s = iconClass[size];
  if (trailing === "arrow")
    return <ArrowRight aria-hidden className={cn(s, "transition-transform duration-300 ease-[var(--ease-spring)] group-hover/btn:translate-x-[3px]")} />;
  if (trailing === "external")
    return <ArrowUpRight aria-hidden className={cn(s, "transition-transform duration-300 ease-[var(--ease-spring)] group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5")} />;
  return <>{trailing}</>;
}

/** Shared inner layout: leading icon (or spinner), label, trailing glyphs, and the centred spinner overlay. */
function ButtonInner({
  size,
  loading,
  showTextWhileLoading,
  iconLeading,
  iconTrailing,
  trailing,
  children,
}: Required<Pick<ButtonVisualProps, "size">> & Omit<ButtonVisualProps, "size" | "variant" | "iconOnly" | "block">) {
  const reduce = useReducedMotion();
  const inline = loading && showTextWhileLoading;
  const s = iconClass[size];
  const spin = (
    <motion.span
      key="spin"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, filter: "blur(4px)" }}
      transition={{ type: "spring", stiffness: 520, damping: 30 }}
      className="inline-flex"
    >
      <Spinner size={spinnerSize[size]} label={null} />
    </motion.span>
  );
  const leading = iconLeading ? renderIcon(iconLeading, cn(s, "transition-transform duration-300 ease-[var(--ease-spring)] group-hover/btn:scale-110")) : null;
  return (
    <>
      <span
        className={cn(
          "inline-flex items-center gap-[inherit] transition-[opacity,filter] duration-200",
          loading && !inline && "opacity-0 blur-[2px]",
        )}
      >
        {inline ? <AnimatePresence initial={false}>{spin}</AnimatePresence> : leading}
        {children}
        {renderIcon(iconTrailing, cn(s, "transition-transform duration-300 ease-[var(--ease-spring)] group-hover/btn:translate-x-0.5"))}
        <Trailing trailing={trailing} size={size} />
      </span>
      <AnimatePresence initial={false}>
        {loading && !inline && (
          <motion.span key="overlay" className="absolute inset-0 grid place-items-center" aria-hidden>
            {spin}
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );
}

/** Anchor that looks like a Button: same variants, sizes, icons and spring press. */
export const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant = "primary", size = "md", trailing, iconLeading, iconTrailing, loading, showTextWhileLoading, iconOnly, block, className, children, disabled, href, onClick, ...props },
  ref,
) {
  const inert = disabled || loading;
  const link = isLinkVariant(variant);
  return (
    <motion.a
      ref={ref}
      href={inert ? undefined : href}
      aria-disabled={inert || undefined}
      aria-busy={loading || undefined}
      data-loading={loading ? "" : undefined}
      whileTap={inert || link ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 520, damping: 26 }}
      onClick={(e) => {
        if (inert) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      className={buttonClasses({ variant, size, iconOnly, block, className: cn(disabled && "pointer-events-none opacity-45", className) })}
      {...props}
    >
      <ButtonInner
        size={size}
        loading={loading}
        showTextWhileLoading={showTextWhileLoading}
        iconLeading={iconLeading}
        iconTrailing={iconTrailing}
        trailing={trailing}
      >
        {children}
      </ButtonInner>
    </motion.a>
  );
});

/**
 * Pill button with a spring press (scale .96), leading/trailing icons, a Spinner loading state and five sizes.
 * Pass `href` to render an anchor with the same look.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    trailing,
    iconLeading,
    iconTrailing,
    loading,
    showTextWhileLoading,
    iconOnly,
    block,
    className,
    children,
    disabled,
    type = "button",
    href,
    onClick,
    ...props
  },
  ref,
) {
  if (href !== undefined) {
    // Button-only attributes are dropped; everything else (aria-*, data-*, handlers, target, rel) carries over.
    const { form: _form, formAction: _fa, formMethod: _fm, formNoValidate: _fnv, formTarget: _ft, name: _n, value: _v, ...rest } = props;
    void [_form, _fa, _fm, _fnv, _ft, _n, _v];
    return (
      <ButtonLink
        ref={ref as unknown as React.Ref<HTMLAnchorElement>}
        href={href}
        variant={variant}
        size={size}
        trailing={trailing}
        iconLeading={iconLeading}
        iconTrailing={iconTrailing}
        loading={loading}
        showTextWhileLoading={showTextWhileLoading}
        iconOnly={iconOnly}
        block={block}
        disabled={disabled}
        className={className}
        onClick={onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}
        {...(rest as unknown as Omit<ButtonLinkProps, "href">)}
      >
        {children}
      </ButtonLink>
    );
  }
  const link = isLinkVariant(variant);
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={link ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 520, damping: 26 }}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      data-loading={loading ? "" : undefined}
      onClick={(e) => {
        // Loading keeps focus (no native disabled) but still blocks presses and implicit form submits.
        if (loading) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      className={buttonClasses({ variant, size, iconOnly, block, className })}
      {...props}
    >
      <ButtonInner
        size={size}
        loading={loading}
        showTextWhileLoading={showTextWhileLoading}
        iconLeading={iconLeading}
        iconTrailing={iconTrailing}
        trailing={trailing}
      >
        {children}
      </ButtonInner>
    </motion.button>
  );
});

export interface StatefulButtonProps extends Omit<ButtonProps, "onClick" | "loading"> {
  /** Resolve to show the success state, reject to shake back. */
  onAction: () => Promise<unknown>;
  successLabel?: React.ReactNode;
}

/** Button that runs an async action: label → spinner → check, with a width spring between states. */
export function StatefulButton({ onAction, successLabel = "Done", children, ...props }: StatefulButtonProps) {
  const [state, setState] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  async function run() {
    if (state === "loading") return;
    setState("loading");
    try {
      await onAction();
      setState("success");
      setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 600);
    }
  }
  return (
    <motion.div animate={state === "error" ? { x: [0, -6, 6, -3, 3, 0] } : { x: 0 }} transition={{ duration: 0.36 }} className="inline-flex">
      {/* The button springs its own width; the label is layout-corrected so it doesn't squash mid-resize. */}
      <Button layout {...props} loading={state === "loading"} onClick={run}>
        <motion.span key={state === "success" ? "success" : "label"} layout="position" className="inline-flex items-center gap-[inherit]">
          {state === "success" ? (
            <>
              <Check className="size-4" aria-hidden />
              {successLabel}
            </>
          ) : (
            children
          )}
        </motion.span>
      </Button>
    </motion.div>
  );
}

/** Button that leans toward the cursor while hovered and springs home on leave. */
export function MagneticButton({ strength = 0.35, className, ...props }: ButtonProps & { strength?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18 });
  const sy = useSpring(y, { stiffness: 260, damping: 18 });
  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      className="inline-flex"
      onPointerMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <Button className={className} {...props} />
    </motion.div>
  );
}
