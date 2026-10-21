"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type AvatarStatus = "online" | "away" | "busy" | "offline";

const box: Record<AvatarSize, string> = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-14 text-lg",
  "2xl": "size-16 text-xl",
};
const iconSize: Record<AvatarSize, string> = { xs: "size-3.5", sm: "size-4", md: "size-5", lg: "size-6", xl: "size-7", "2xl": "size-8" };
const squareRadius: Record<AvatarSize, string> = { xs: "rounded-[5px]", sm: "rounded-xs", md: "rounded-sm", lg: "rounded-sm", xl: "rounded-md", "2xl": "rounded-md" };
const dot: Record<AvatarSize, string> = { xs: "size-1.5", sm: "size-2", md: "size-2.5", lg: "size-3", xl: "size-3.5", "2xl": "size-4" };
const corner: Record<AvatarSize, string> = { xs: "size-2.5", sm: "size-3", md: "size-3.5", lg: "size-4", xl: "size-[18px]", "2xl": "size-5" };
const ringWidth: Record<AvatarSize, string> = { xs: "ring-1", sm: "ring-[1.5px]", md: "ring-2", lg: "ring-2", xl: "ring-[2.5px]", "2xl": "ring-[3px]" };

/** The page colour used to "cut" rings around corner dots and stacked avatars. Override with [--avatar-cut:var(--color-surface)]. */
const CUT = "ring-[var(--avatar-cut,var(--color-bg))]";

const statusTone: Record<AvatarStatus, { dot: string; word: string }> = {
  online: { dot: "bg-success", word: "online" },
  away: { dot: "bg-warning", word: "away" },
  busy: { dot: "bg-danger", word: "busy" },
  offline: { dot: "bg-ink-subtle", word: "offline" },
};

const tints = [
  "from-volt-soft to-success-soft text-volt-ink",
  "from-ember-soft to-warning-soft text-ember-ink",
  "from-info-soft to-volt-soft text-info",
  "from-success-soft to-info-soft text-success",
  "from-warning-soft to-ember-soft text-warning",
  "from-surface-hover to-surface-sunken text-ink-muted",
] as const;

/** Stable hash of a string (djb2) — the same name always lands on the same tint, on server and client. */
function hash(input: string) {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** First letter of the first and last word, uppercased: "Mei Tanaka" -> "MT". */
export function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const first = words[0][0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

export interface AvatarProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  size?: AvatarSize;
  /** Image URL. If it fails to load the avatar falls back to initials, then the placeholder icon. */
  src?: string | null;
  /** Person or company name. Drives the initials, the tint and the accessible name. */
  name?: string;
  /** Alternative text for the image; defaults to `name`. */
  alt?: string;
  /** Override the initials derived from `name`. */
  initials?: string;
  /** Placeholder shown when there is no image and no name. */
  icon?: React.ReactNode;
  shape?: "circle" | "square";
  /** Presence dot in the bottom-right corner, announced as a word. */
  status?: AvatarStatus;
  /** Volt check badge. Moves to the top-right corner when status is set. */
  verified?: boolean;
  /** Small round node in the bottom-right corner, e.g. a company logo. Hidden when status is set. */
  badge?: React.ReactNode;
  /** Thin outer ring so the avatar reads on busy backgrounds. */
  bordered?: boolean;
  /** Hide from assistive tech when a visible name sits next to it. */
  decorative?: boolean;
}

type LoadState = "idle" | "loading" | "loaded" | "error";

/** Round or square avatar with an image -> initials -> icon fallback chain, a blur-up reveal and corner indicators. */
export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { size = "md", src, name, alt, initials, icon, shape = "circle", status, verified, badge, bordered, decorative, className, ...props },
  ref,
) {
  const reduce = useReducedMotion();
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [load, setLoad] = React.useState<LoadState>(src ? "loading" : "idle");
  const [prevSrc, setPrevSrc] = React.useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setLoad(src ? "loading" : "idle");
  }

  // The image can finish (or fail) before hydration attaches onLoad/onError; read its state once mounted.
  React.useEffect(() => {
    const img = imgRef.current;
    if (!img || !img.complete) return;
    setLoad(img.naturalWidth > 0 ? "loaded" : "error");
  }, [src]);

  const text = initials ?? (name ? getInitials(name) : "");
  const tint = tints[hash(name ?? text ?? "") % tints.length];
  const radius = shape === "circle" ? "rounded-full" : squareRadius[size];
  const showImage = !!src && load !== "error";

  const words = [alt ?? name ?? "User", status ? statusTone[status].word : null, verified ? "verified" : null].filter(Boolean).join(", ");
  const bottomBadge = status ? null : badge;
  const verifiedCorner = verified ? (status || badge ? "top" : "bottom") : null;

  return (
    <span
      ref={ref}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : words}
      aria-hidden={decorative || undefined}
      data-avatar=""
      className={cn("relative inline-flex shrink-0 select-none", box[size], bordered && cn("p-[2px] ring-1 ring-border-strong", radius), className)}
      {...props}
    >
      <span className={cn("relative flex size-full items-center justify-center overflow-hidden bg-surface-raised", radius)}>
        {/* Fallback layer — visible until the image has loaded, and after it fails. */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-linear-to-br font-semibold tracking-[-0.02em]",
            text ? tint : "from-surface-hover to-surface-sunken text-ink-subtle",
          )}
        >
          {text || icon || <User className={iconSize[size]} strokeWidth={1.75} />}
        </span>
        {showImage && (
          <motion.img
            ref={imgRef}
            src={src ?? undefined}
            alt=""
            draggable={false}
            onLoad={() => setLoad("loaded")}
            onError={() => setLoad("error")}
            initial={false}
            animate={
              load === "loaded"
                ? { opacity: 1, scale: 1, filter: "blur(0px)" }
                : { opacity: 0, scale: reduce ? 1 : 1.08, filter: reduce ? "blur(0px)" : "blur(6px)" }
            }
            transition={{ type: "spring", stiffness: 260, damping: 30, opacity: { duration: 0.25 } }}
            className="relative size-full object-cover"
          />
        )}
        {/* Hairline + soft top highlight so photos and tints both get an edge. */}
        <span aria-hidden className={cn("pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-ink)_10%,transparent)]", radius)} />
      </span>

      {status && <StatusDot status={status} size={size} reduce={!!reduce} />}

      {bottomBadge && (
        <span
          aria-hidden
          className={cn(
            "absolute -bottom-0.5 -right-0.5 flex items-center justify-center overflow-hidden rounded-full bg-surface-raised",
            corner[size],
            ringWidth[size],
            CUT,
          )}
        >
          {bottomBadge}
        </span>
      )}

      {verifiedCorner && (
        <span
          aria-hidden
          className={cn(
            "absolute -right-0.5 flex items-center justify-center rounded-full bg-volt text-on-volt",
            verifiedCorner === "top" ? "-top-0.5" : "-bottom-0.5",
            corner[size],
            ringWidth[size],
            CUT,
          )}
        >
          <Check className="size-[70%]" strokeWidth={3.5} />
        </span>
      )}
    </span>
  );
});

function StatusDot({ status, size, reduce }: { status: AvatarStatus; size: AvatarSize; reduce: boolean }) {
  return (
    <span aria-hidden className={cn("absolute bottom-0 right-0 flex items-center justify-center", dot[size])}>
      {status === "online" && !reduce && (
        <motion.span
          className="absolute inset-0 rounded-full bg-success"
          animate={{ scale: [1, 2.2], opacity: [0.45, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={status}
          initial={{ scale: reduce ? 1 : 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: reduce ? 1 : 0.3, opacity: 0 }}
          transition={{ type: "spring", stiffness: 520, damping: 22 }}
          className={cn("relative size-full rounded-full", ringWidth[size], CUT, statusTone[status].dot)}
        />
      </AnimatePresence>
    </span>
  );
}

const overlap: Record<AvatarSize, string> = { xs: "-ml-1.5", sm: "-ml-2", md: "-ml-2.5", lg: "-ml-3", xl: "-ml-3.5", "2xl": "-ml-4" };
const spread: Record<AvatarSize, number> = { xs: 3, sm: 4, md: 5, lg: 6, xl: 7, "2xl": 8 };

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Avatar elements. Their size is set by the group. */
  children: React.ReactNode;
  size?: AvatarSize;
  /** Show at most this many avatars; the rest collapse into a +N chip. */
  max?: number;
  /** Accessible name for the group. */
  label?: string;
  /** Renders a dashed add button at the end of the stack. */
  onAdd?: () => void;
  addLabel?: string;
}

/** Overlapping avatar stack that fans out on hover; extra members collapse into a +N chip that names them. */
export function AvatarGroup({ children, size = "sm", max = 4, label = "Members", onAdd, addLabel = "Add member", className, ...props }: AvatarGroupProps) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = React.useState(false);
  const all = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<AvatarProps>[];
  const visible = all.slice(0, Math.max(0, max));
  const hidden = all.slice(visible.length);
  const hiddenNames = hidden.map((c) => c.props.name ?? c.props.alt).filter(Boolean) as string[];
  const fan = (i: number) => (hovered && !reduce ? i * spread[size] : 0);
  const spring = { type: "spring", stiffness: 420, damping: 28 } as const;

  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex items-center", className)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      {...props}
    >
      {visible.map((child, i) => (
        <motion.span
          key={child.key ?? i}
          className={cn("relative rounded-full", i > 0 && overlap[size])}
          style={{ zIndex: visible.length - i }}
          animate={{ x: fan(i) }}
          whileHover={reduce ? undefined : { y: -4, zIndex: 50 }}
          transition={spring}
        >
          {React.cloneElement(child, {
            size,
            className: cn("rounded-full", ringWidth[size], CUT, child.props.className),
          })}
        </motion.span>
      ))}
      {hidden.length > 0 && (
        <motion.span
          className={cn(
            "relative z-0 inline-flex shrink-0 items-center justify-center rounded-full bg-surface-raised font-mono font-medium text-ink-muted",
            box[size],
            "text-[11px]",
            size === "xs" && "text-[9px]",
            ringWidth[size],
            CUT,
            overlap[size],
          )}
          animate={{ x: fan(visible.length) }}
          transition={spring}
          role="img"
          aria-label={`${hidden.length} more${hiddenNames.length ? `: ${hiddenNames.join(", ")}` : ""}`}
          title={hiddenNames.join(", ") || undefined}
        >
          +{hidden.length}
        </motion.span>
      )}
      {onAdd && (
        <motion.button
          type="button"
          onClick={onAdd}
          aria-label={addLabel}
          title={addLabel}
          animate={{ x: fan(visible.length + (hidden.length ? 1 : 0)) }}
          whileTap={{ scale: 0.92 }}
          transition={spring}
          className={cn(
            "ml-1.5 inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong text-ink-subtle",
            "transition-colors duration-150 hover:border-volt-ink hover:text-volt-ink outline-none focus-visible:shadow-[var(--focus-ring)]",
            box[size],
          )}
        >
          <Plus className={iconSize[size]} strokeWidth={2} />
        </motion.button>
      )}
    </div>
  );
}

const labelSize = {
  sm: { avatar: "sm" as AvatarSize, name: "text-[13px]", sub: "text-xs", gap: "gap-2" },
  md: { avatar: "md" as AvatarSize, name: "text-sm", sub: "text-[13px]", gap: "gap-3" },
  lg: { avatar: "lg" as AvatarSize, name: "text-base", sub: "text-sm", gap: "gap-3.5" },
};

export interface AvatarLabelProps extends Omit<AvatarProps, "size" | "decorative"> {
  name: string;
  /** Second line: email, role or handle. */
  supporting?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

/** Avatar beside a name and a supporting line (email or role); presence is announced next to the name. */
export function AvatarLabel({ name, supporting, size = "md", className, status, verified, ...avatarProps }: AvatarLabelProps) {
  const s = labelSize[size];
  return (
    <span className={cn("inline-flex min-w-0 items-center", s.gap, className)}>
      <Avatar {...avatarProps} name={name} status={status} verified={verified} size={s.avatar} decorative />
      <span className="flex min-w-0 flex-col">
        <span className={cn("truncate font-semibold leading-tight text-ink", s.name)}>
          {name}
          {(status || verified) && (
            <span className="sr-only">
              {status ? `, ${statusTone[status].word}` : ""}
              {verified ? ", verified" : ""}
            </span>
          )}
        </span>
        {supporting && <span className={cn("truncate leading-snug text-ink-muted", s.sub)}>{supporting}</span>}
      </span>
    </span>
  );
}
