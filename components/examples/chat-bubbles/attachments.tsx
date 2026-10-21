"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, Check, FileText, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AttachmentMessagesProps {
  sender?: string;
  note?: string;
  file?: { name: string; size: string; pages?: number };
  /** Voice note length in seconds. */
  voiceSeconds?: number;
  /** Simulated download time, in ms. */
  downloadMs?: number;
  onDownload?: () => void;
  className?: string;
}

const BARS = Array.from({ length: 42 }, (_, i) => Math.round(5 + Math.abs(Math.sin(i * 1.7) * 0.55 + Math.sin(i * 0.43) * 0.45) * 20));
const SPEEDS = [1, 1.5, 2] as const;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Chat messages carrying a file with a ring-progress download and a voice note with a seekable waveform, play/pause morph and speed control. */
export function AttachmentMessages({
  sender = "Priya",
  note = "Brand audit is ready. Pages 4 to 9 cover the new type scale.",
  file = { name: "Q3-brand-audit.pdf", size: "2.4 MB", pages: 18 },
  voiceSeconds = 34,
  downloadMs = 1600,
  onDownload,
  className,
}: AttachmentMessagesProps) {
  const reduce = useReducedMotion() ?? false;
  const [dl, setDl] = React.useState<"idle" | "loading" | "done">("idle");
  const [playing, setPlaying] = React.useState(false);
  const [pos, setPos] = React.useState(0);
  const [speed, setSpeed] = React.useState<(typeof SPEEDS)[number]>(1);
  const dlTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const posRef = React.useRef(0);

  function seek(seconds: number) {
    posRef.current = seconds;
    setPos(seconds);
  }

  React.useEffect(() => () => {
    if (dlTimer.current) clearTimeout(dlTimer.current);
  }, []);

  React.useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const next = posRef.current + 0.1 * speed;
      const ended = next >= voiceSeconds;
      posRef.current = ended ? 0 : next;
      setPos(posRef.current);
      if (ended) setPlaying(false);
    }, 100);
    return () => clearInterval(t);
  }, [playing, speed, voiceSeconds]);

  function download() {
    if (dl !== "idle") return;
    setDl("loading");
    onDownload?.();
    dlTimer.current = setTimeout(() => setDl("done"), downloadMs);
  }

  function seekFromPointer(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * voiceSeconds);
  }

  const played = pos / voiceSeconds;

  return (
    <div role="log" aria-label={`Conversation with ${sender}`} className={cn("flex w-full max-w-[400px] flex-col gap-2 rounded-xl border border-border bg-surface-raised p-4 shadow-sm", className)}>
      <p className="max-w-[85%] self-start rounded-lg rounded-bl-xs border border-border bg-surface px-3.5 py-2 text-[13.5px] leading-5 text-ink">{note}</p>

      <div className="flex w-[85%] items-center gap-3 self-start rounded-lg rounded-tl-xs border border-border bg-surface p-2.5">
        <span aria-hidden className="relative grid h-11 w-9 shrink-0 place-items-center rounded-xs bg-surface-sunken text-ink-muted">
          <FileText className="size-4" />
          <span className="absolute -bottom-1 -right-1 rounded-[4px] bg-ink px-1 font-mono text-[8px] font-semibold text-bg">PDF</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink">{file.name}</p>
          <p className="text-[11.5px] text-ink-subtle">
            {file.size}
            {file.pages ? ` · ${file.pages} pages` : ""}
            {dl === "done" && <span className="text-ink-muted"> · Saved</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={download}
          aria-label={dl === "done" ? `${file.name} downloaded` : dl === "loading" ? `Downloading ${file.name}` : `Download ${file.name}`}
          className="relative grid size-9 shrink-0 place-items-center rounded-full border border-border-strong text-ink outline-none transition-colors hover:bg-surface-hover focus-visible:shadow-[var(--focus-ring)]"
        >
          {dl === "loading" && (
            <svg viewBox="0 0 36 36" className="absolute -inset-px -rotate-90" aria-hidden>
              <motion.circle cx="18" cy="18" r="16.5" fill="none" strokeWidth="2.5" strokeLinecap="round" className="stroke-volt-ink" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: downloadMs / 1000, ease: "easeInOut" }} />
            </svg>
          )}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={dl === "done" ? "d" : "a"} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ type: "spring", stiffness: 500, damping: 26 }}>
              {dl === "done" ? <Check aria-hidden className="size-4 text-volt-ink" strokeWidth={2.75} /> : <ArrowDown aria-hidden className="size-4" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <span className="mb-1 self-start px-1 text-[11px] text-ink-subtle">{sender} · 4:12</span>

      <div className="flex w-[88%] items-center gap-2.5 self-end rounded-lg rounded-br-xs bg-ink py-2 pl-2 pr-3 text-bg">
        <motion.button
          type="button"
          aria-label={playing ? "Pause voice note" : "Play voice note"}
          onClick={() => setPlaying((p) => !p)}
          whileTap={reduce ? undefined : { scale: 0.9 }}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-bg text-ink outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={playing ? "p" : "s"} initial={{ scale: 0.4, opacity: 0, rotate: reduce ? 0 : -45 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ type: "spring", stiffness: 520, damping: 28 }}>
              {playing ? <Pause aria-hidden className="size-4 fill-current" /> : <Play aria-hidden className="ml-0.5 size-4 fill-current" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <div
          role="slider"
          tabIndex={0}
          aria-label="Voice note position"
          aria-valuemin={0}
          aria-valuemax={voiceSeconds}
          aria-valuenow={Math.round(pos)}
          aria-valuetext={`${clock(pos)} of ${clock(voiceSeconds)}`}
          onPointerDown={seekFromPointer}
          onKeyDown={(e) => {
            const step = e.key === "ArrowRight" ? 5 : e.key === "ArrowLeft" ? -5 : 0;
            if (!step) return;
            e.preventDefault();
            seek(Math.max(0, Math.min(voiceSeconds - 0.1, posRef.current + step)));
          }}
          className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-[2px] rounded-xs outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          {BARS.map((h, i) => (
            <span
              key={i}
              aria-hidden
              style={{ height: h }}
              className={cn("w-[3px] flex-1 rounded-full transition-colors duration-150", i / BARS.length < played ? "bg-bg" : "bg-bg/30")}
            />
          ))}
        </div>
        <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-bg/80">{clock(playing || pos > 0 ? pos : voiceSeconds)}</span>
        <button
          type="button"
          aria-label={`Playback speed ${speed}x`}
          onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])}
          className="h-6 w-10 shrink-0 rounded-full bg-bg/15 font-mono text-[11px] font-semibold text-bg outline-none transition-colors hover:bg-bg/25 focus-visible:shadow-[var(--focus-ring)]"
        >
          {speed}x
        </button>
      </div>
      <span className="self-end px-1 text-[11px] text-ink-subtle">You · 4:15</span>
      <span role="status" className="sr-only">
        {dl === "done" ? `${file.name} downloaded` : ""}
      </span>
    </div>
  );
}
