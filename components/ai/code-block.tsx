"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronDown, FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui/copy-button";

export type TokenType = "keyword" | "string" | "comment" | "tag" | "number" | "plain";
export interface Token {
  type: TokenType;
  text: string;
}

const KEYWORDS = new Set(
  (
    "import export from default function return const let var if else for while do switch case break continue new class extends " +
    "async await try catch finally throw typeof instanceof in of as interface type enum implements public private protected readonly " +
    "static void null undefined true false this super yield delete keyof satisfies def lambda pass None True False elif with is not and or " +
    "fn pub use mut impl struct match self echo then fi done export npm npx pnpm"
  ).split(" "),
);

const HASH_COMMENTS = new Set(["bash", "sh", "shell", "zsh", "python", "py", "yaml", "yml", "toml", "ruby", "rb"]);
const JSX = new Set(["tsx", "jsx", "html", "xml", "svg", "vue", "svelte"]);

/** Splits code into lines of coloured tokens. Deliberately tiny: keywords, strings, comments, JSX tags and numbers. */
export function tokenize(code: string, language = "tsx"): Token[][] {
  const lang = language.toLowerCase();
  const parts = [
    String.raw`(\/\/[^\n]*|\/\*[\s\S]*?\*\/${HASH_COMMENTS.has(lang) ? String.raw`|#[^\n]*` : ""})`,
    String.raw`("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|` + "`(?:\\\\.|[^`\\\\])*`)",
    JSX.has(lang) ? String.raw`(<\/?[A-Za-z][\w.:-]*|\/>)` : "((?!))",
    String.raw`\b(\d+(?:\.\d+)?)\b`,
    String.raw`([A-Za-z_$][\w$]*)`,
  ];
  const re = new RegExp(parts.join("|"), "g");
  const flat: Token[] = [];
  let last = 0;
  for (const m of code.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) flat.push({ type: "plain", text: code.slice(last, i) });
    let type: TokenType = "plain";
    if (m[1]) type = "comment";
    else if (m[2]) type = "string";
    else if (m[3]) type = "tag";
    else if (m[4]) type = "number";
    else if (m[5] && KEYWORDS.has(m[5])) type = "keyword";
    flat.push({ type, text: m[0] });
    last = i + m[0].length;
  }
  if (last < code.length) flat.push({ type: "plain", text: code.slice(last) });

  const lines: Token[][] = [[]];
  for (const t of flat) {
    const pieces = t.text.split("\n");
    pieces.forEach((p, k) => {
      if (k > 0) lines.push([]);
      if (p) lines[lines.length - 1].push({ type: t.type, text: p });
    });
  }
  return lines;
}

const tokenClass: Record<TokenType, string> = {
  keyword: "text-ember-ink",
  string: "text-volt-ink",
  comment: "text-ink-subtle italic",
  tag: "text-info",
  number: "text-warning",
  plain: "",
};

export interface CodeBlockProps {
  code: string;
  /** Language label and highlighting rules (tsx, ts, js, json, bash, css, python…). */
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  /** 1-based line numbers to highlight. */
  highlightLines?: number[];
  /** Collapse code longer than this many lines behind a "Show all" toggle. 0 disables collapsing. */
  maxLines?: number;
  defaultExpanded?: boolean;
  /** Hide the copy button. */
  hideCopy?: boolean;
  className?: string;
}

const LINE = 21;
const PAD = 12;

/** AI-style code block: filename header, copy button, line numbers, a tiny highlighter and a spring collapse for long code. */
export function CodeBlock({
  code,
  language = "tsx",
  filename,
  showLineNumbers = true,
  highlightLines = [],
  maxLines = 14,
  defaultExpanded = false,
  hideCopy,
  className,
}: CodeBlockProps) {
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const lines = React.useMemo(() => tokenize(code.replace(/\n$/, ""), language), [code, language]);
  const marked = React.useMemo(() => new Set(highlightLines), [highlightLines]);
  const collapsible = maxLines > 0 && lines.length > maxLines;
  const open = !collapsible || expanded;
  const bodyId = React.useId();
  const gutter = String(lines.length).length;

  return (
    <figure className={cn("overflow-hidden rounded-md border border-border bg-surface-sunken text-ink", className)}>
      <figcaption className="flex h-10 items-center gap-2 border-b border-border bg-surface pl-3.5 pr-1">
        <FileCode2 aria-hidden className="size-4 shrink-0 text-ink-subtle" />
        <span className="truncate font-mono text-[12.5px] text-ink">{filename ?? language}</span>
        {filename && (
          <span className="rounded-full border border-border px-1.5 py-px font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-subtle">
            {language}
          </span>
        )}
        <span className="ml-auto" />
        {!hideCopy && <CopyButton value={code} label={`Copy ${filename ?? "code"}`} />}
      </figcaption>

      <div className="relative">
        <motion.div
          id={bodyId}
          initial={false}
          animate={{ height: open ? "auto" : maxLines * LINE + PAD * 2 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 32 }}
          className="overflow-hidden"
        >
          <pre className="overflow-x-auto py-3 font-mono text-[12.75px]" style={{ lineHeight: `${LINE}px` }} tabIndex={0} aria-label={filename ? `${filename} source` : "Code"}>
            <code className="grid min-w-max">
              {lines.map((toks, i) => {
                const n = i + 1;
                const hi = marked.has(n);
                return (
                  <span
                    key={i}
                    className={cn(
                      "flex border-l-2 pr-4",
                      hi ? "border-volt-ink bg-volt-soft" : "border-transparent",
                    )}
                  >
                    {showLineNumbers && (
                      <span
                        aria-hidden
                        className={cn("select-none pl-3 pr-4 text-right tabular-nums", hi ? "text-volt-ink" : "text-ink-subtle/70")}
                        style={{ minWidth: `${gutter + 3.5}ch` }}
                      >
                        {n}
                      </span>
                    )}
                    <span className={cn("whitespace-pre", !showLineNumbers && "pl-4")}>
                      {toks.length === 0 ? " " : toks.map((t, k) => (
                        <span key={k} className={tokenClass[t.type]}>
                          {t.text}
                        </span>
                      ))}
                    </span>
                  </span>
                );
              })}
            </code>
          </pre>
        </motion.div>

        {collapsible && (
          <div
            className={cn(
              "flex justify-center",
              open ? "border-t border-border py-1.5" : "absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-sunken via-surface-sunken/85 to-transparent pb-2.5 pt-12",
            )}
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-medium text-ink-muted outline-none transition-colors hover:border-border-strong hover:text-ink focus-visible:shadow-[var(--focus-ring)]"
            >
              {open ? "Collapse" : `Show all ${lines.length} lines`}
              <ChevronDown aria-hidden className={cn("size-3.5 transition-transform duration-300 ease-[var(--ease-spring)]", open && "rotate-180")} />
            </motion.button>
          </div>
        )}
      </div>
    </figure>
  );
}
