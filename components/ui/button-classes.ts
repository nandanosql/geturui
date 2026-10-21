import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-volt text-on-volt hover:shadow-glow",
  secondary: "bg-surface text-ink border border-border hover:bg-surface-raised hover:border-border-strong",
  outline: "bg-transparent text-ink border border-border-strong hover:bg-surface-hover",
  ghost: "bg-transparent text-ink-muted hover:bg-surface-hover hover:text-ink",
  inverse: "bg-ink text-bg hover:opacity-90",
  pro: "bg-ember text-on-ember hover:shadow-[0_8px_28px_var(--ember-soft)]",
  /** Outlined destructive action (kept for compatibility). */
  danger: "bg-transparent text-danger border border-danger hover:bg-surface-hover",
  /** Solid destructive action: the final "Delete" in a confirm dialog. */
  destructive: "bg-danger text-bg hover:shadow-[0_8px_28px_var(--danger-soft)]",
  /** Quiet destructive action: "Remove" in a list row. */
  "destructive-ghost": "bg-transparent text-danger hover:bg-danger-soft",
  /** Inline volt link; the underline draws left to right on hover. */
  link: "text-volt-ink",
  /** Inline muted link that brightens to ink on hover. */
  "link-muted": "text-ink-muted hover:text-ink",
  /** Inline destructive link. */
  "link-destructive": "text-danger",
} as const;

const sizes = {
  xs: "h-7 px-2.5 text-xs gap-1",
  sm: "h-8 px-3.5 text-[13px] gap-1.5",
  md: "h-10 px-[18px] text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
  xl: "h-14 px-7 text-base gap-2.5",
} as const;

const iconSizes = { xs: "size-7", sm: "size-8", md: "size-10", lg: "size-12", xl: "size-14" } as const;

/** Link variants keep only the type scale: no height, padding or pill. */
const linkSizes = { xs: "text-xs gap-1", sm: "text-[13px] gap-1", md: "text-sm gap-1.5", lg: "text-[15px] gap-1.5", xl: "text-base gap-2" } as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

/** True for the inline text-link variants (no padding, underline on hover). */
export function isLinkVariant(variant: ButtonVariant) {
  return variant === "link" || variant === "link-muted" || variant === "link-destructive";
}

/** Class string for anything that should look like a GetUrUI button (links included). Safe to call on the server. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  iconOnly,
  block,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean; block?: boolean; className?: string }) {
  const link = isLinkVariant(variant);
  return cn(
    "group/btn relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full font-medium tracking-[-0.1px]",
    "transition-[background-color,box-shadow,color,border-color,opacity] duration-150 disabled:pointer-events-none disabled:opacity-45",
    "data-[loading]:pointer-events-none",
    "focus-visible:shadow-[var(--focus-ring)] outline-none",
    variants[variant],
    link
      ? cn(
          "h-auto rounded-xs p-0 transition-[background-size,color,opacity] duration-300 ease-[var(--ease-spring)]",
          "[background-image:linear-gradient(currentColor,currentColor)] bg-no-repeat [background-position:0_100%] [background-size:0%_1px] hover:[background-size:100%_1px]",
          linkSizes[size],
        )
      : iconOnly
        ? cn(iconSizes[size], "p-0")
        : sizes[size],
    block && "w-full",
    className,
  );
}
