"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   Tiny markdown parser. Produces a tree whose text leaves remember their
   offset in the source, so freshly streamed chunks can fade in on their own.
   Supported: paragraphs, # headings, - / 1. lists, ``` fenced code,
   **bold**, *italic* and `inline code`. Everything renders as React
   elements — never as HTML strings.
   ------------------------------------------------------------------ */

type Inline =
  | { type: "text"; text: string; start: number }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "code"; text: string; start: number };

type Block =
  | { type: "p"; children: Inline[] }
  | { type: "h"; level: 1 | 2 | 3; children: Inline[] }
  | { type: "ul" | "ol"; items: Inline[][] }
  | { type: "code"; lang: string; text: string; start: number };

const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/g;

function parseInline(s: string, base: number): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of s.matchAll(INLINE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ type: "text", text: s.slice(last, i), start: base + last });
    const tok = m[0];
    if (tok.startsWith("**")) out.push({ type: "strong", children: parseInline(tok.slice(2, -2), base + i + 2) });
    else if (tok.startsWith("`")) out.push({ type: "code", text: tok.slice(1, -1), start: base + i + 1 });
    else out.push({ type: "em", children: parseInline(tok.slice(1, -1), base + i + 1) });
    last = i + tok.length;
  }
  if (last < s.length) out.push({ type: "text", text: s.slice(last), start: base + last });
  return out;
}

/** Parses a small markdown subset into blocks. Unclosed code fences run to the end (useful mid-stream). */
export function parseMarkdown(src: string): Block[] {
  const lines: { text: string; start: number }[] = [];
  let off = 0;
  for (const text of src.split("\n")) {
    lines.push({ text, start: off });
    off += text.length + 1;
  }
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const { text, start } = lines[i];
    const fence = text.match(/^\s*```\s*([\w+-]*)\s*$/);
    if (fence) {
      const body: string[] = [];
      const bodyStart = lines[i + 1]?.start ?? start + text.length;
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i].text)) body.push(lines[i++].text);
      i++;
      blocks.push({ type: "code", lang: fence[1] || "text", text: body.join("\n"), start: bodyStart });
      continue;
    }
    if (!text.trim()) {
      i++;
      continue;
    }
    const heading = text.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const lead = text.length - heading[2].length;
      blocks.push({ type: "h", level: heading[1].length as 1 | 2 | 3, children: parseInline(heading[2], start + lead) });
      i++;
      continue;
    }
    const listRe = /^\s*([-*•]|\d+[.)])\s+/;
    const lm = text.match(listRe);
    if (lm) {
      const ordered = /\d/.test(lm[1]);
      const items: Inline[][] = [];
      while (i < lines.length) {
        const m = lines[i].text.match(listRe);
        if (!m || /\d/.test(m[1]) !== ordered) break;
        items.push(parseInline(lines[i].text.slice(m[0].length), lines[i].start + m[0].length));
        i++;
      }
      blocks.push({ type: ordered ? "ol" : "ul", items });
      continue;
    }
    const para: Inline[] = [];
    while (i < lines.length && lines[i].text.trim() && !listRe.test(lines[i].text) && !/^(#{1,3})\s|^\s*```/.test(lines[i].text)) {
      if (para.length) para.push({ type: "text", text: " ", start: lines[i].start - 1 });
      para.push(...parseInline(lines[i].text, lines[i].start));
      i++;
    }
    blocks.push({ type: "p", children: para });
  }
  return blocks;
}

/* ------------------------------------------------------------------ */

interface FadeCtx {
  /** Text before this offset renders plain; after it, per-chunk fading spans. */
  fadeFrom: number;
  chunks: number[];
  reduce: boolean;
}

function renderText(text: string, start: number, ctx: FadeCtx | null): React.ReactNode {
  const end = start + text.length;
  if (!ctx || end <= ctx.fadeFrom) return text;
  const parts: React.ReactNode[] = [];
  let cursor = start;
  if (ctx.fadeFrom > start) {
    parts.push(<React.Fragment key="plain">{text.slice(0, ctx.fadeFrom - start)}</React.Fragment>);
    cursor = ctx.fadeFrom;
  }
  const bounds = ctx.chunks.filter((c) => c > cursor && c < end);
  const edges = [cursor, ...bounds, end];
  for (let k = 0; k < edges.length - 1; k++) {
    const a = edges[k];
    const b = edges[k + 1];
    parts.push(
      <motion.span
        key={a}
        initial={ctx.reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        {text.slice(a - start, b - start)}
      </motion.span>,
    );
  }
  return parts;
}

function renderInline(nodes: Inline[], ctx: FadeCtx | null): React.ReactNode[] {
  return nodes.map((n, i) => {
    if (n.type === "text") return <React.Fragment key={i}>{renderText(n.text, n.start, ctx)}</React.Fragment>;
    if (n.type === "code")
      return (
        <code key={i} className="rounded-[6px] border border-border bg-surface-sunken px-1.5 py-px font-mono text-[0.88em] text-ink">
          {renderText(n.text, n.start, ctx)}
        </code>
      );
    if (n.type === "strong")
      return (
        <strong key={i} className="font-semibold text-ink">
          {renderInline(n.children, ctx)}
        </strong>
      );
    return (
      <em key={i} className="italic">
        {renderInline(n.children, ctx)}
      </em>
    );
  });
}

function renderBlocks(blocks: Block[], ctx: FadeCtx | null, caret: React.ReactNode) {
  return blocks.map((b, i) => {
    const tail = i === blocks.length - 1 ? caret : null;
    switch (b.type) {
      case "p":
        return (
          <p key={i} className="my-0 [&:not(:first-child)]:mt-3">
            {renderInline(b.children, ctx)}
            {tail}
          </p>
        );
      case "h": {
        const Tag = (`h${b.level + 2}` as "h3" | "h4" | "h5");
        return (
          <Tag key={i} className={cn("font-semibold text-ink [&:not(:first-child)]:mt-4", b.level === 1 ? "text-[17px]" : "text-[15.5px]")}>
            {renderInline(b.children, ctx)}
            {tail}
          </Tag>
        );
      }
      case "ul":
      case "ol": {
        const List = b.type;
        return (
          <List
            key={i}
            className={cn(
              "my-0 space-y-1 pl-5 [&:not(:first-child)]:mt-3 marker:text-ink-subtle",
              b.type === "ul" ? "list-disc" : "list-decimal",
            )}
          >
            {b.items.map((item, j) => (
              <li key={j} className="pl-1">
                {renderInline(item, ctx)}
                {j === b.items.length - 1 ? tail : null}
              </li>
            ))}
          </List>
        );
      }
      case "code":
        return (
          <div key={i} className="overflow-hidden rounded-md border border-border bg-surface-sunken [&:not(:first-child)]:mt-3">
            <div className="border-b border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.5px] text-ink-subtle">{b.lang}</div>
            <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[12.5px] leading-[20px] text-ink">
              <code>
                {renderText(b.text, b.start, ctx)}
                {tail}
              </code>
            </pre>
          </div>
        );
    }
  });
}

/** Renders a markdown string as React elements (no HTML injection). */
export function Markdown({ children, className }: { children: string; className?: string }) {
  const blocks = React.useMemo(() => parseMarkdown(children), [children]);
  return <div className={cn("text-[14.5px] leading-[23px] text-ink", className)}>{renderBlocks(blocks, null, null)}</div>;
}

/* ------------------------------------------------------------------ */

export interface StreamingResponseProps {
  /** A full string (revealed token by token) or an async stream of chunks. */
  content: string | AsyncIterable<string>;
  /** Milliseconds between tokens when `content` is a string. */
  speed?: number;
  /** false renders `content` immediately (strings only) without fades or caret. */
  animate?: boolean;
  /** Show the blinking caret while streaming. */
  caret?: boolean;
  /** Called once with the full text when the stream ends. */
  onComplete?: (text: string) => void;
  /** Called with the text revealed so far, after each chunk. */
  onProgress?: (text: string) => void;
  className?: string;
}

interface StreamState {
  source: string | AsyncIterable<string>;
  text: string;
  chunks: number[];
  done: boolean;
}

const FADE_CHUNKS = 10;

/** Renders a response token by token with a blinking caret and a soft fade on each new chunk; supports a safe markdown subset. */
export function StreamingResponse({ content, speed = 28, animate = true, caret = true, onComplete, onProgress, className }: StreamingResponseProps) {
  const reduce = useReducedMotion() ?? false;
  const [state, setState] = React.useState<StreamState>({ source: content, text: "", chunks: [], done: false });
  if (state.source !== content) setState({ source: content, text: "", chunks: [], done: false });

  const staticText = !animate && typeof content === "string";
  const cbs = React.useRef({ onComplete, onProgress });
  React.useEffect(() => {
    cbs.current = { onComplete, onProgress };
  });

  React.useEffect(() => {
    if (staticText) return;
    let cancelled = false;
    const push = (chunk: string) =>
      setState((s) => (s.source !== content ? s : { ...s, text: s.text + chunk, chunks: [...s.chunks, s.text.length] }));
    const finish = (full: string) => {
      setState((s) => (s.source !== content ? s : { ...s, done: true }));
      cbs.current.onComplete?.(full);
    };

    if (typeof content === "string") {
      const tokens = content.match(/\s*\S+/g) ?? [];
      const trailing = content.slice(tokens.join("").length);
      let i = 0;
      let acc = "";
      let timer: ReturnType<typeof setTimeout>;
      const tick = () => {
        if (cancelled) return;
        if (i >= tokens.length) {
          if (trailing) push(trailing);
          finish(content);
          return;
        }
        const tok = tokens[i++];
        acc += tok;
        push(tok);
        cbs.current.onProgress?.(acc);
        timer = setTimeout(tick, speed * (0.6 + ((i * 7919) % 10) / 12.5));
      };
      timer = setTimeout(tick, speed);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    (async () => {
      let acc = "";
      try {
        for await (const chunk of content) {
          if (cancelled) return;
          acc += chunk;
          push(chunk);
          cbs.current.onProgress?.(acc);
        }
      } catch {
        /* stream errored — keep what arrived */
      }
      if (!cancelled) finish(acc);
    })();
    return () => {
      cancelled = true;
    };
  }, [content, speed, staticText]);

  const text = staticText ? (content as string) : state.text;
  const blocks = React.useMemo(() => parseMarkdown(text), [text]);
  const streaming = !staticText && !state.done;
  const ctx: FadeCtx | null = streaming && animate
    ? { fadeFrom: state.chunks[Math.max(0, state.chunks.length - FADE_CHUNKS)] ?? 0, chunks: state.chunks, reduce }
    : null;

  const caretEl =
    caret && streaming ? (
      <motion.span
        key="caret"
        aria-hidden
        className="ml-0.5 inline-block h-[1.05em] w-[7px] translate-y-[0.18em] rounded-[2px] bg-volt"
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: "linear" }}
      />
    ) : null;

  return (
    <div className={cn("text-[14.5px] leading-[23px] text-ink", className)} aria-busy={streaming}>
      {blocks.length ? renderBlocks(blocks, ctx, caretEl) : caretEl}
    </div>
  );
}
