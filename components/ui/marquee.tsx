import * as React from "react";
import { cn } from "@/lib/utils";

export interface MarqueeProps {
  children: React.ReactNode;
  /** Seconds per loop. */
  duration?: number;
  reverse?: boolean;
  pauseOnHover?: boolean;
  className?: string;
}

/** Infinite horizontal scroller with faded edges. Pauses on hover; stops under reduced motion. */
export function Marquee({ children, duration = 40, reverse, pauseOnHover = true, className }: MarqueeProps) {
  return (
    <div className={cn("group/marquee fade-x relative overflow-hidden", className)}>
      <div
        className={cn(
          "flex w-max gap-4 animate-marquee motion-reduce:animate-none",
          pauseOnHover && "group-hover/marquee:[animation-play-state:paused]",
        )}
        style={{ ["--marquee-duration" as string]: `${duration}s`, animationDirection: reverse ? "reverse" : undefined }}
      >
        <div className="flex gap-4">{children}</div>
        <div className="flex gap-4" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
