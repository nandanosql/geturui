"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { cn } from "@/lib/utils";

export interface DockItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Items are split by a separator wherever the group changes. */
  group?: string;
  /** Number or dot shown on the icon's corner. */
  badge?: number | boolean;
  href?: string;
  onClick?: () => void;
}

export interface DockProps {
  items: DockItem[];
  /** Id of the item with the active dot. */
  activeId?: string;
  defaultActiveId?: string;
  onActiveChange?: (id: string) => void;
  /** Resting icon size, px. */
  size?: number;
  /** Size of the icon under the cursor, px. */
  magnification?: number;
  /** How far (px) the magnification reaches either side of the cursor. */
  distance?: number;
  className?: string;
  "aria-label"?: string;
}

/** macOS-style dock: icons swell with cursor proximity on springs, labels rise above, and the active dot glides between apps. */
export function Dock({
  items,
  activeId,
  defaultActiveId,
  onActiveChange,
  size = 44,
  magnification = 68,
  distance = 140,
  className,
  ...rest
}: DockProps) {
  const uid = React.useId();
  const reduce = useReducedMotion();
  const mouseX = useMotionValue(Infinity);
  const [inner, setInner] = React.useState(defaultActiveId ?? items[0]?.id);
  const active = activeId ?? inner;
  const [focusIndex, setFocusIndex] = React.useState(() => Math.max(0, items.findIndex((i) => i.id === active)));
  const refs = React.useRef<(HTMLElement | null)[]>([]);

  function activate(item: DockItem) {
    if (activeId === undefined) setInner(item.id);
    onActiveChange?.(item.id);
    item.onClick?.();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const n = items.length;
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? n - 1 : (focusIndex + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
    setFocusIndex(next);
    refs.current[next]?.focus();
  }

  const mag = reduce ? size : magnification;

  return (
    <div
      role="toolbar"
      aria-label={rest["aria-label"] ?? "Dock"}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      onPointerMove={(e) => {
        if (e.pointerType === "mouse") mouseX.set(e.clientX);
      }}
      onPointerLeave={() => mouseX.set(Infinity)}
      style={{ height: size + 22 }}
      className={cn(
        "glass mx-auto flex w-max items-end gap-2 rounded-[22px] border border-border px-2.5 pb-2.5 shadow-lg",
        className,
      )}
    >
      {items.map((item, i) => {
        const sep = i > 0 && item.group !== items[i - 1].group;
        return (
          <React.Fragment key={item.id}>
            {sep && <span aria-hidden className="mx-1 w-px self-stretch bg-border-strong/40 my-2.5" />}
            <DockIcon
              item={item}
              index={i}
              mouseX={mouseX}
              size={size}
              magnification={mag}
              distance={distance}
              active={item.id === active}
              tabbable={i === focusIndex}
              indicatorId={`${uid}-dot`}
              reduce={!!reduce}
              onFocusIndex={setFocusIndex}
              onActivate={() => activate(item)}
              setRef={(el) => {
                refs.current[i] = el;
              }}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}

interface DockIconProps {
  item: DockItem;
  index: number;
  mouseX: MotionValue<number>;
  size: number;
  magnification: number;
  distance: number;
  active: boolean;
  tabbable: boolean;
  indicatorId: string;
  reduce: boolean;
  onFocusIndex: (i: number) => void;
  onActivate: () => void;
  setRef: (el: HTMLElement | null) => void;
}

function DockIcon({
  item,
  index,
  mouseX,
  size,
  magnification,
  distance,
  active,
  tabbable,
  indicatorId,
  reduce,
  onFocusIndex,
  onActivate,
  setRef,
}: DockIconProps) {
  const [hover, setHover] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  const elRef = React.useRef<HTMLElement | null>(null);

  const offset = useTransform(mouseX, (x) => {
    const r = elRef.current?.getBoundingClientRect();
    return r ? x - (r.left + r.width / 2) : Infinity;
  });
  const target = useTransform(offset, [-distance, 0, distance], [size, magnification, size]);
  const width = useSpring(target, { mass: 0.12, stiffness: 190, damping: 13 });
  const iconScale = useTransform(width, (w) => w / size);
  const lift = useTransform(width, [size, magnification], [0, -(magnification - size) * 0.18]);

  const showLabel = hover;
  const badge =
    item.badge === true ? (
      <span className="absolute right-0.5 top-0.5 size-2.5 rounded-full bg-ember ring-2 ring-surface" aria-hidden />
    ) : typeof item.badge === "number" && item.badge > 0 ? (
      <span
        aria-hidden
        className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ember px-1 text-[10.5px] font-semibold tabular-nums text-on-ember ring-2 ring-surface"
      >
        {item.badge > 99 ? "99+" : item.badge}
      </span>
    ) : null;

  const label = typeof item.badge === "number" && item.badge > 0 ? `${item.label}, ${item.badge} new` : item.label;

  const shared = {
    ref: (el: HTMLElement | null) => {
      elRef.current = el;
      setRef(el);
    },
    "aria-label": label,
    "aria-current": active ? ("page" as const) : undefined,
    tabIndex: tabbable ? 0 : -1,
    onPointerEnter: () => setHover(true),
    onPointerLeave: () => {
      setHover(false);
      setPressed(false);
    },
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onFocus: (e: React.FocusEvent) => {
      onFocusIndex(index);
      const el = e.currentTarget as HTMLElement;
      if (el.matches(":focus-visible")) {
        const r = el.getBoundingClientRect();
        mouseX.set(r.left + r.width / 2);
        setHover(true);
      }
    },
    onBlur: () => {
      setHover(false);
      mouseX.set(Infinity);
    },
    onClick: onActivate,
    className:
      "relative grid size-full place-items-center rounded-[14px] border border-border bg-surface-raised text-ink outline-none transition-colors duration-150 hover:bg-surface-raised focus-visible:shadow-[var(--focus-ring)]",
  };

  const body = (
    <>
      <motion.span style={{ scale: iconScale }} className="grid place-items-center [&>svg]:size-[22px]">
        {item.icon}
      </motion.span>
      {badge}
    </>
  );

  return (
    <motion.div style={{ width, height: width, y: lift }} className="relative shrink-0">
      <motion.div
        className="size-full"
        animate={{ scale: pressed && !reduce ? 0.9 : 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 26 }}
      >
        {item.href ? (
          <a href={item.href} {...shared}>
            {body}
          </a>
        ) : (
          <button type="button" {...shared}>
            {body}
          </button>
        )}
      </motion.div>
      <AnimatePresence>
        {showLabel && (
          <motion.span
            role="tooltip"
            aria-hidden
            initial={{ opacity: 0, y: 6, x: "-50%", scale: 0.92, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 4, x: "-50%", scale: 0.96, filter: "blur(4px)", transition: { duration: 0.1 } }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-10 origin-bottom whitespace-nowrap rounded-[10px] bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-ink shadow-md"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      <span className="absolute -bottom-[9px] left-1/2 flex h-1 w-1 -translate-x-1/2">
        {active && (
          <motion.span
            layoutId={indicatorId}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 30 }}
            className="size-1 rounded-full bg-ink"
          />
        )}
      </span>
    </motion.div>
  );
}
