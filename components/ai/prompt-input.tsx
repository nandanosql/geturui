"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Check, ChevronDown, FileCode2, FileText, ImageIcon, Paperclip, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PromptAttachment {
  id: string;
  name: string;
  /** Size in bytes, shown beside the name. */
  size?: number;
  kind?: "file" | "image" | "code";
}

export interface PromptModel {
  id: string;
  label: string;
  description?: string;
}

export interface PromptInputProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with the trimmed prompt and the current attachments. */
  onSubmit?: (value: string, attachments: PromptAttachment[]) => void;
  /** While true the send button morphs into a stop button. */
  streaming?: boolean;
  /** Called when the stop button is pressed. */
  onStop?: () => void;
  attachments?: PromptAttachment[];
  defaultAttachments?: PromptAttachment[];
  onAttachmentsChange?: (attachments: PromptAttachment[]) => void;
  models?: PromptModel[];
  model?: string;
  defaultModel?: string;
  onModelChange?: (id: string) => void;
  placeholder?: string;
  /** "mod-enter" submits on Cmd/Ctrl+Enter (Enter adds a line); "enter" submits on Enter (Shift+Enter adds a line). */
  submitOn?: "mod-enter" | "enter";
  /** Rows the textarea grows to before it scrolls. */
  maxRows?: number;
  /** Clear the text and attachments after submit. */
  clearOnSubmit?: boolean;
  disabled?: boolean;
  className?: string;
}

const spring = { type: "spring", stiffness: 420, damping: 30 } as const;

function formatBytes(n?: number) {
  if (n === undefined) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function kindOf(name: string): PromptAttachment["kind"] {
  if (/\.(png|jpe?g|gif|webp|svg|avif)$/i.test(name)) return "image";
  if (/\.(tsx?|jsx?|css|json|md|py|go|rs|sh|html)$/i.test(name)) return "code";
  return "file";
}

function AttachmentIcon({ kind }: { kind?: PromptAttachment["kind"] }) {
  if (kind === "image") return <ImageIcon aria-hidden className="size-3.5" />;
  if (kind === "code") return <FileCode2 aria-hidden className="size-3.5" />;
  return <FileText aria-hidden className="size-3.5" />;
}

function ModelMenu({
  models,
  value,
  onChange,
  disabled,
}: {
  models: PromptModel[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();
  const current = models.find((m) => m.id === value) ?? models[0];

  React.useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!listRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function openMenu() {
    setActive(Math.max(0, models.findIndex((m) => m.id === value)));
    setOpen(true);
  }

  function close(restore = true) {
    setOpen(false);
    if (restore) triggerRef.current?.focus();
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + models.length) % models.length);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : models.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(models[active].id);
      close();
    } else if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      close(e.key === "Escape");
    }
  }

  if (!current) return null;
  return (
    <div className="relative">
      <motion.button
        ref={triggerRef}
        type="button"
        whileTap={{ scale: 0.96 }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`Model: ${current.label}`}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openMenu();
          }
        }}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[12.5px] font-medium text-ink-muted outline-none transition-colors hover:border-border-strong hover:text-ink focus-visible:shadow-[var(--focus-ring)] disabled:opacity-45"
      >
        <span aria-hidden className="size-1.5 rounded-full bg-volt" />
        {current.label}
        <ChevronDown aria-hidden className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label="Choose a model"
            aria-activedescendant={`${listId}-${active}`}
            onKeyDown={onListKey}
            initial={{ opacity: 0, y: 6, scale: 0.96, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 4, scale: 0.97, filter: "blur(4px)", transition: { duration: 0.12 } }}
            transition={spring}
            className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-64 origin-bottom-left rounded-md border border-border bg-surface-raised p-1 shadow-lg outline-none"
          >
            {models.map((m, i) => {
              const selected = m.id === value;
              return (
                <div
                  key={m.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={selected}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => {
                    onChange(m.id);
                    close();
                  }}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-sm px-2.5 py-2 text-left",
                    i === active ? "bg-surface-hover" : "",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-ink">{m.label}</span>
                    {m.description && <span className="block text-xs text-ink-subtle">{m.description}</span>}
                  </span>
                  {selected && <Check aria-hidden className="mt-0.5 size-4 text-volt-ink" />}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Chat composer: auto-growing textarea, animated attachment chips, model pill and a send button that morphs into stop while streaming. */
export function PromptInput({
  value,
  defaultValue = "",
  onValueChange,
  onSubmit,
  streaming = false,
  onStop,
  attachments,
  defaultAttachments = [],
  onAttachmentsChange,
  models,
  model,
  defaultModel,
  onModelChange,
  placeholder = "Ask anything…",
  submitOn = "mod-enter",
  maxRows = 8,
  clearOnSubmit = true,
  disabled,
  className,
}: PromptInputProps) {
  const reduce = useReducedMotion();
  const [innerValue, setInnerValue] = React.useState(defaultValue);
  const [innerFiles, setInnerFiles] = React.useState<PromptAttachment[]>(defaultAttachments);
  const [innerModel, setInnerModel] = React.useState(defaultModel ?? models?.[0]?.id ?? "");
  const text = value ?? innerValue;
  const files = attachments ?? innerFiles;
  const modelId = model ?? innerModel;
  const areaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const hintId = React.useId();

  const setText = (v: string) => {
    if (value === undefined) setInnerValue(v);
    onValueChange?.(v);
  };
  const setFiles = (next: PromptAttachment[]) => {
    if (attachments === undefined) setInnerFiles(next);
    onAttachmentsChange?.(next);
  };

  React.useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const line = parseFloat(getComputedStyle(el).lineHeight) || 22;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, line * maxRows)}px`;
    el.style.overflowY = el.scrollHeight > line * maxRows ? "auto" : "hidden";
  }, [text, maxRows]);

  const canSend = !disabled && (text.trim().length > 0 || files.length > 0);

  function submit() {
    if (streaming || !canSend) return;
    onSubmit?.(text.trim(), files);
    if (clearOnSubmit) {
      setText("");
      setFiles([]);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    const mod = e.metaKey || e.ctrlKey;
    if (submitOn === "mod-enter" ? mod : !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    if (!list.length) return;
    setFiles([
      ...files,
      ...list.map((f, i) => ({ id: `${f.name}-${f.size}-${f.lastModified}-${i}`, name: f.name, size: f.size, kind: kindOf(f.name) })),
    ]);
    e.target.value = "";
  }

  return (
    <div
      className={cn(
        "relative w-full rounded-lg border border-border bg-surface-raised p-2 shadow-sm transition-[border-color,box-shadow] duration-200",
        "focus-within:border-border-strong focus-within:shadow-md",
        disabled && "opacity-60",
        className,
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) areaRef.current?.focus();
      }}
    >
      <AnimatePresence initial={false}>
        {files.length > 0 && (
          <motion.ul
            aria-label="Attachments"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
            className="flex flex-wrap gap-1.5 overflow-hidden px-1"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {files.map((f) => (
                <motion.li
                  key={f.id}
                  layout={!reduce}
                  initial={{ opacity: 0, scale: 0.8, filter: "blur(6px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.8, filter: "blur(6px)" }}
                  transition={spring}
                  className="mt-1 inline-flex h-8 max-w-[220px] items-center gap-1.5 rounded-full border border-border bg-surface pl-2.5 pr-1 text-xs text-ink"
                >
                  <span className="text-ink-muted">
                    <AttachmentIcon kind={f.kind} />
                  </span>
                  <span className="truncate font-medium">{f.name}</span>
                  {f.size !== undefined && <span className="shrink-0 font-mono text-[11px] text-ink-subtle">{formatBytes(f.size)}</span>}
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => setFiles(files.filter((x) => x.id !== f.id))}
                    className="grid size-6 shrink-0 place-items-center rounded-full text-ink-subtle outline-none transition-colors hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </AnimatePresence>

      <textarea
        ref={areaRef}
        rows={1}
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        aria-label="Prompt"
        aria-describedby={hintId}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        className="block w-full resize-none bg-transparent px-2.5 pb-1 pt-2 text-[15px] leading-[22px] text-ink outline-none placeholder:text-ink-subtle"
      />

      <div className="flex items-center gap-1.5 pt-1">
        <input ref={fileRef} type="file" multiple hidden onChange={onPick} tabIndex={-1} aria-hidden />
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          disabled={disabled}
          aria-label="Attach files"
          onClick={() => fileRef.current?.click()}
          className="grid size-8 place-items-center rounded-full text-ink-muted outline-none transition-colors hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)] disabled:opacity-45"
        >
          <Paperclip aria-hidden className="size-4" />
        </motion.button>
        {models && models.length > 0 && (
          <ModelMenu
            models={models}
            value={modelId}
            disabled={disabled}
            onChange={(id) => {
              if (model === undefined) setInnerModel(id);
              onModelChange?.(id);
            }}
          />
        )}
        <span id={hintId} className="ml-auto hidden pr-1 text-[11.5px] text-ink-subtle sm:inline">
          {submitOn === "mod-enter" ? (
            <>
              <kbd className="font-mono">⌘</kbd>
              <kbd className="font-mono">↵</kbd> to send
            </>
          ) : (
            <>
              <kbd className="font-mono">↵</kbd> to send, <kbd className="font-mono">⇧↵</kbd> for a new line
            </>
          )}
        </span>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={streaming ? onStop : submit}
          disabled={streaming ? !onStop : !canSend}
          aria-label={streaming ? "Stop generating" : "Send prompt"}
          animate={{ borderRadius: streaming ? 12 : 999 }}
          transition={spring}
          className={cn(
            "relative ml-auto grid size-9 shrink-0 place-items-center overflow-hidden outline-none transition-[background-color,color,opacity] duration-200 focus-visible:shadow-[var(--focus-ring)] sm:ml-0",
            streaming ? "bg-ink text-bg" : "bg-volt text-on-volt disabled:bg-surface disabled:text-ink-subtle",
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={streaming ? "stop" : "send"}
              initial={{ opacity: 0, scale: 0.4, rotate: reduce ? 0 : -90, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.4, rotate: reduce ? 0 : 90, filter: "blur(4px)" }}
              transition={spring}
              className="col-start-1 row-start-1"
            >
              {streaming ? <Square aria-hidden className="size-3.5 fill-current" /> : <ArrowUp aria-hidden className="size-[18px]" strokeWidth={2.25} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
