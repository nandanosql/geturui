"use client";

import * as React from "react";
import { animate, motion, useDragControls, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "motion/react";
import { cn } from "@/lib/utils";

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Detents as fractions of the container height, ascending. */
  snapPoints?: number[];
  /** Detent index used each time the sheet opens. */
  defaultSnap?: number;
  /** Controlled detent index. */
  snap?: number;
  onSnapChange?: (index: number) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Swiping below the lowest detent (or tapping the scrim) closes the sheet. */
  dismissible?: boolean;
  /** Position inside the nearest positioned parent instead of the viewport (no scroll lock). */
  contained?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const spring = { type: "spring", stiffness: 380, damping: 34, mass: 0.9 } as const;
const DEFAULT_SNAPS = [0.25, 0.55, 0.9];
/** How far ahead (seconds) a release velocity is projected when choosing a detent. */
const PROJECTION = 0.18;

/**
 * Glass bottom sheet with snap points. Drag the handle or header: release velocity is projected forward to pick
 * the detent, the scrim fades with height, Escape or a fast flick past the lowest detent closes it.
 */
export function BottomSheet({
  open,
  onOpenChange,
  snapPoints: snapPointsProp = DEFAULT_SNAPS,
  defaultSnap = 1,
  snap,
  onSnapChange,
  title,
  description,
  dismissible = true,
  contained = false,
  children,
  className,
}: BottomSheetProps) {
  const reduce = useReducedMotion();
  const uid = React.useId();
  // Inline arrays are common; key the detents by value so effects don't restart on every render.
  const snapKey = snapPointsProp.join(",");
  const snapPoints = React.useMemo(() => snapKey.split(",").map(Number), [snapKey]);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const restoreRef = React.useRef<HTMLElement | null>(null);
  const controls = useDragControls();
  const draggedRef = React.useRef(false);
  const onOpenChangeRef = React.useRef(onOpenChange);
  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  const [present, setPresent] = React.useState(open);
  if (open && !present) setPresent(true);

  const [innerSnap, setInnerSnap] = React.useState(defaultSnap);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && snap === undefined) setInnerSnap(defaultSnap);
  }
  const activeSnap = Math.min(snapPoints.length - 1, Math.max(0, snap ?? innerSnap));

  const [H, setH] = React.useState(0);
  const max = snapPoints[snapPoints.length - 1];
  const sheetH = H * max;
  const yFor = React.useCallback((i: number) => (max - snapPoints[i]) * H, [max, snapPoints, H]);

  // y is the sheet's offset from fully raised (0) down to hidden (sheetH).
  const y = useMotionValue(10000);
  const lowestY = yFor(0);
  const scrim = useTransform(y, (v) => {
    if (!sheetH) return 0;
    if (v >= lowestY) return 0.15 * Math.max(0, 1 - (v - lowestY) / Math.max(1, sheetH - lowestY));
    return 0.15 + 0.85 * (1 - v / Math.max(1, lowestY));
  });

  // Measure the frame (viewport or parent).
  React.useEffect(() => {
    const el = rootRef.current;
    if (!present || !el) return;
    const ro = new ResizeObserver(([e]) => setH(e.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [present]);

  const commitSnap = React.useCallback(
    (i: number) => {
      if (snap === undefined) setInnerSnap(i);
      onSnapChange?.(i);
    },
    [snap, onSnapChange],
  );

  // Open / close / detent animations.
  const shownRef = React.useRef(false);
  React.useEffect(() => {
    if (!present || !H) return;
    const t = reduce ? { duration: 0.2 } : spring;
    if (open) {
      if (!shownRef.current) {
        y.jump(sheetH);
        shownRef.current = true;
      }
      const c = animate(y, yFor(activeSnap), t);
      return () => c.stop();
    }
    const c = animate(y, sheetH, reduce ? { duration: 0.15 } : { ...spring, damping: 40 });
    c.then(() => {
      shownRef.current = false;
      setPresent(false);
    });
    return () => c.stop();
  }, [open, present, H, sheetH, activeSnap, yFor, y, reduce]);

  // Focus management, Escape and scroll lock.
  React.useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => sheetRef.current?.focus({ preventScroll: true }));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChangeRef.current(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    if (!contained) document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      if (!contained) document.body.style.overflow = prev;
      restoreRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, contained]);

  function onDragEnd(_: unknown, info: PanInfo) {
    const projected = y.get() + info.velocity.y * PROJECTION;
    if (dismissible && (projected > sheetH - (sheetH - lowestY) * 0.5 || (y.get() > lowestY && info.velocity.y > 900))) {
      onOpenChange(false);
      return;
    }
    let best = 0;
    snapPoints.forEach((_, i) => {
      if (Math.abs(yFor(i) - projected) < Math.abs(yFor(best) - projected)) best = i;
    });
    animate(y, yFor(best), { ...spring, velocity: info.velocity.y });
    if (best !== activeSnap) commitSnap(best);
  }

  function onHandleKey(e: React.KeyboardEvent) {
    const n = snapPoints.length;
    if (e.key === "ArrowUp") commitSnap(Math.min(n - 1, activeSnap + 1));
    else if (e.key === "ArrowDown") {
      if (activeSnap === 0 && dismissible) onOpenChange(false);
      else commitSnap(Math.max(0, activeSnap - 1));
    } else if (e.key === "Enter" || e.key === " ") commitSnap((activeSnap + 1) % n);
    else return;
    e.preventDefault();
  }

  if (!present) return null;

  return (
    <div ref={rootRef} className={cn(contained ? "absolute" : "fixed", "inset-0 z-[90] overflow-hidden")}>
      <motion.div
        aria-hidden
        style={{ opacity: scrim }}
        onClick={() => dismissible && onOpenChange(false)}
        className="absolute inset-0 bg-scrim"
      />
      <motion.div
        ref={sheetRef}
        role="dialog"
        aria-modal={!contained || undefined}
        aria-labelledby={title ? `${uid}-title` : undefined}
        aria-describedby={description ? `${uid}-desc` : undefined}
        tabIndex={-1}
        drag="y"
        dragListener={false}
        dragControls={controls}
        dragConstraints={{ top: 0, bottom: sheetH }}
        dragElastic={{ top: 0.06, bottom: 0.5 }}
        dragMomentum={false}
        onDragStart={() => {
          draggedRef.current = true;
        }}
        onDragEnd={onDragEnd}
        style={{ y, height: sheetH || undefined, visibility: H ? "visible" : "hidden" }}
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto flex max-w-[640px] flex-col rounded-t-xl border border-b-0 border-border bg-glass shadow-lg outline-none backdrop-blur-xl backdrop-saturate-150",
          className,
        )}
      >
        <div
          onPointerDown={(e) => {
            draggedRef.current = false;
            controls.start(e);
          }}
          className="shrink-0 cursor-grab touch-none select-none px-5 pb-3 pt-2 active:cursor-grabbing"
        >
          <button
            type="button"
            aria-label={`Resize sheet, detent ${activeSnap + 1} of ${snapPoints.length}`}
            onKeyDown={onHandleKey}
            onClick={(e) => {
              // Keyboard activation is handled in onKeyDown; a click after a drag is ignored.
              if (e.detail === 0) return;
              if (draggedRef.current) {
                draggedRef.current = false;
                return;
              }
              commitSnap((activeSnap + 1) % snapPoints.length);
            }}
            className="mx-auto flex h-5 w-16 items-center justify-center rounded-full outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <span className="h-[5px] w-10 rounded-full bg-border-strong" />
          </button>
          {(title || description) && (
            <div className="mt-1">
              {title && (
                <h2 id={`${uid}-title`} className="font-display text-[19px] font-semibold leading-6 tracking-[-0.3px] text-ink">
                  {title}
                </h2>
              )}
              {description && (
                <p id={`${uid}-desc`} className="mt-0.5 text-[13px] leading-[18px] text-ink-muted">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">{children}</div>
      </motion.div>
    </div>
  );
}
