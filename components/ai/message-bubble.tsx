"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { RotateCcw, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui/copy-button";

export type MessageRole = "user" | "assistant";
export type MessageFeedback = "up" | "down" | null;
/** Where a bubble sits inside a run of messages from the same sender. */
export type MessagePosition = "single" | "first" | "middle" | "last";

export interface MessageBubbleProps {
  role: MessageRole;
  children: React.ReactNode;
  /** Sender name, used for the avatar label and screen readers. */
  name?: string;
  /** Custom avatar; defaults to initials (user) or a spark glyph (assistant). */
  avatar?: React.ReactNode;
  timestamp?: string;
  position?: MessagePosition;
  /** Plain text copied by the copy action. Defaults to `children` when it is a string. */
  copyText?: string;
  onRetry?: () => void;
  feedback?: MessageFeedback;
  onFeedbackChange?: (value: MessageFeedback) => void;
  /** Hide the actions row entirely. */
  hideActions?: boolean;
  className?: string;
}

const radius: Record<MessageRole, Record<MessagePosition, string>> = {
  user: {
    single: "rounded-[20px] rounded-br-[6px]",
    first: "rounded-[20px] rounded-br-[6px]",
    middle: "rounded-[20px] rounded-r-[6px]",
    last: "rounded-[20px] rounded-tr-[6px]",
  },
  assistant: {
    single: "rounded-[20px] rounded-bl-[6px]",
    first: "rounded-[20px] rounded-bl-[6px]",
    middle: "rounded-[20px] rounded-l-[6px]",
    last: "rounded-[20px] rounded-tl-[6px]",
  },
};

function initials(name?: string) {
  if (!name) return "You";
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ActionButton({ label, pressed, onClick, children }: { label: string; pressed?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.88 }}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center rounded-[8px] outline-none transition-colors focus-visible:shadow-[var(--focus-ring)]",
        pressed ? "bg-volt-soft text-volt-ink" : "text-ink-subtle hover:bg-surface-hover hover:text-ink",
      )}
    >
      {children}
    </motion.button>
  );
}

/** Chat bubble with a spring entrance, avatar, timestamp and an actions row (copy, retry, feedback) revealed on hover or focus. */
export function MessageBubble({
  role,
  children,
  name,
  avatar,
  timestamp,
  position = "single",
  copyText,
  onRetry,
  feedback,
  onFeedbackChange,
  hideActions,
  className,
}: MessageBubbleProps) {
  const reduce = useReducedMotion();
  const [innerFeedback, setInnerFeedback] = React.useState<MessageFeedback>(null);
  const fb = feedback !== undefined ? feedback : innerFeedback;
  const isUser = role === "user";
  const showAvatar = position === "single" || position === "last";
  const showMeta = showAvatar;
  const text = copyText ?? (typeof children === "string" ? children : undefined);

  const setFb = (v: MessageFeedback) => {
    const next = fb === v ? null : v;
    if (feedback === undefined) setInnerFeedback(next);
    onFeedbackChange?.(next);
  };

  const hasActions = !hideActions && (text !== undefined || onRetry || !isUser);

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      style={{ transformOrigin: isUser ? "bottom right" : "bottom left" }}
      className={cn(
        "group/msg flex w-full items-end gap-2.5",
        isUser ? "flex-row-reverse" : "flex-row",
        position === "first" || position === "middle" ? "mb-0.5" : "mb-3",
        className,
      )}
    >
      <div className="w-8 shrink-0" aria-hidden={!showAvatar}>
        {showAvatar &&
          (avatar ?? (
            <span
              aria-hidden
              className={cn(
                "grid size-8 place-items-center rounded-full text-[11px] font-semibold",
                isUser ? "bg-surface text-ink-muted ring-1 ring-border" : "bg-volt text-on-volt",
              )}
            >
              {isUser ? initials(name) : <Sparkles className="size-4" />}
            </span>
          ))}
      </div>

      <div className={cn("flex min-w-0 max-w-[80%] flex-col", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "px-4 py-2.5 text-[14.5px] leading-[22px] [overflow-wrap:anywhere]",
            radius[role][position],
            isUser ? "bg-ink text-bg" : "border border-border bg-surface text-ink",
          )}
        >
          <span className="sr-only">{isUser ? (name ?? "You") : (name ?? "Assistant")} said: </span>
          {children}
        </div>

        {(showMeta || hasActions) && (
          <div className={cn("mt-1 flex h-7 items-center gap-1 px-1", isUser ? "flex-row-reverse" : "flex-row")}>
            {showMeta && timestamp && <span className="px-1 text-[11.5px] text-ink-subtle tabular-nums">{timestamp}</span>}
            {hasActions && (
              <div
                className={cn(
                  "flex items-center gap-0.5 transition-[opacity,transform] duration-200 ease-[var(--ease-spring-soft)]",
                  "opacity-0 translate-y-0.5 group-hover/msg:translate-y-0 group-hover/msg:opacity-100 group-focus-within/msg:translate-y-0 group-focus-within/msg:opacity-100",
                  "[@media(hover:none)]:opacity-100 [@media(hover:none)]:translate-y-0",
                  fb && "opacity-100 translate-y-0",
                )}
              >
                {text !== undefined && <CopyButton value={text} label="Copy message" className="size-7 rounded-[8px] text-ink-subtle [&_svg]:size-3.5" />}
                {onRetry && (
                  <ActionButton label="Retry" onClick={onRetry}>
                    <RotateCcw aria-hidden className="size-3.5" />
                  </ActionButton>
                )}
                {!isUser && (
                  <>
                    <ActionButton label="Good response" pressed={fb === "up"} onClick={() => setFb("up")}>
                      <ThumbsUp aria-hidden className="size-3.5" />
                    </ActionButton>
                    <ActionButton label="Bad response" pressed={fb === "down"} onClick={() => setFb("down")}>
                      <ThumbsDown aria-hidden className="size-3.5" />
                    </ActionButton>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export interface ThreadMessage {
  id: string;
  role: MessageRole;
  content: React.ReactNode;
  name?: string;
  timestamp?: string;
  copyText?: string;
}

export interface MessageThreadProps {
  messages: ThreadMessage[];
  onRetry?: (id: string) => void;
  onFeedbackChange?: (id: string, value: MessageFeedback) => void;
  className?: string;
}

/** Positions consecutive messages from the same sender into a group: one avatar and timestamp per run, tighter corners in between. */
export function groupPositions(messages: { role: MessageRole }[]): MessagePosition[] {
  return messages.map((m, i) => {
    const prev = messages[i - 1]?.role === m.role;
    const next = messages[i + 1]?.role === m.role;
    if (prev && next) return "middle";
    if (prev) return "last";
    if (next) return "first";
    return "single";
  });
}

/** A list of messages with consecutive messages from the same sender grouped. */
export function MessageThread({ messages, onRetry, onFeedbackChange, className }: MessageThreadProps) {
  const positions = groupPositions(messages);
  return (
    <div role="log" aria-live="polite" className={cn("flex flex-col", className)}>
      {messages.map((m, i) => (
        <MessageBubble
          key={m.id}
          role={m.role}
          name={m.name}
          timestamp={m.timestamp}
          position={positions[i]}
          copyText={m.copyText}
          onRetry={m.role === "assistant" && onRetry ? () => onRetry(m.id) : undefined}
          onFeedbackChange={onFeedbackChange ? (v) => onFeedbackChange(m.id, v) : undefined}
        >
          {m.content}
        </MessageBubble>
      ))}
    </div>
  );
}
