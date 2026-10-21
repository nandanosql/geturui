"use client";

import * as React from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

export interface TiltCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> {
  /** Maximum rotation on each axis, degrees. */
  maxTilt?: number;
  /** Scale while the pointer is over the card. */
  scale?: number;
  /** CSS perspective distance, px. Lower is more dramatic. */
  perspective?: number;
  /** Cursor-tracked glare highlight. */
  glare?: boolean;
  /** Peak opacity of the glare, 0–1. */
  glareOpacity?: number;
  /** Classes for the inner card surface. Avoid overflow-hidden there if you use TiltCardLayer (it flattens 3D). */
  cardClassName?: string;
}

const SPRING = { stiffness: 260, damping: 22, mass: 0.6 };

/** Card that tilts in 3D toward the pointer on a spring, with a glare that follows the cursor. Springs flat on leave. */
export function TiltCard({
  maxTilt = 12,
  scale = 1.02,
  perspective = 900,
  glare = true,
  glareOpacity = 0.16,
  className,
  cardClassName,
  children,
  style,
  onPointerMove,
  onPointerLeave,
  onPointerEnter,
  ...props
}: TiltCardProps) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const hover = useMotionValue(0);

  const rotateX = useSpring(useTransform(py, [0, 1], [maxTilt, -maxTilt]), SPRING);
  const rotateY = useSpring(useTransform(px, [0, 1], [-maxTilt, maxTilt]), SPRING);
  const s = useSpring(useTransform(hover, [0, 1], [1, scale]), SPRING);
  const glareAlpha = useSpring(useTransform(hover, [0, 1], [0, glareOpacity]), { stiffness: 200, damping: 30 });
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const background = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgb(255 255 255 / ${glareAlpha}), transparent 60%)`;
  const shadowX = useTransform(rotateY, (v) => -v * 1.2);
  const shadowY = useTransform(rotateX, (v) => v * 1.2 + 18);
  const boxShadow = useMotionTemplate`${shadowX}px ${shadowY}px 48px -18px var(--scrim)`;

  function track(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    px.set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    py.set(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
  }

  return (
    <div
      className={cn("relative", className)}
      style={{ perspective, ...style }}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (reduce) return;
        hover.set(1);
        track(e);
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (!reduce) track(e);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        hover.set(0);
        px.set(0.5);
        py.set(0.5);
      }}
      {...props}
    >
      <motion.div
        style={reduce ? undefined : { rotateX, rotateY, scale: s, boxShadow, transformStyle: "preserve-3d" }}
        className={cn(
          "relative h-full rounded-[20px] border border-border bg-surface-raised text-ink will-change-transform",
          cardClassName,
        )}
      >
        {children}
        {glare && !reduce && (
          <motion.span
            aria-hidden
            style={{ background }}
            className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
          />
        )}
      </motion.div>
    </div>
  );
}

export interface TiltCardLayerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** How far the layer floats above the card, px (translateZ). */
  depth?: number;
}

/** A child layer that floats above the card for parallax. Use inside TiltCard. */
export function TiltCardLayer({ depth = 30, className, style, ...props }: TiltCardLayerProps) {
  return <div className={cn("relative", className)} style={{ transform: `translateZ(${depth}px)`, transformStyle: "preserve-3d", ...style }} {...props} />;
}
