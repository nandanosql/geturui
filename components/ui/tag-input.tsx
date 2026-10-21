"use client";

import * as React from "react";
import { AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Field, fieldWellClasses, type FieldSize } from "@/components/ui/field";
import { Tag, type TagProps } from "@/components/ui/tag-group";

const wellPad: Record<FieldSize, string> = { sm: "py-1 pl-1", md: "py-1.5 pl-1.5", lg: "py-2 pl-2" };
const inputText: Record<FieldSize, string> = { sm: "h-6 text-[13px]", md: "h-7 text-sm", lg: "h-8 text-[15px]" };
const SPLIT = /[,;\n\t]+/;

export interface TagInputProps {
  label?: React.ReactNode;
  /** Helper text under the field. Replaced by any error. */
  hint?: React.ReactNode;
  /** External error; takes priority over validation messages. */
  error?: React.ReactNode;
  required?: boolean;
  /** Well height and chip size: sm 32 / md 40 / lg 48. @default "md" */
  size?: FieldSize;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  /** Most chips allowed; shows a counter in the label row. */
  max?: number;
  /** Return a message to reject an entry. */
  validate?: (tag: string, current: string[]) => string | null | undefined | void;
  /** Allow the same entry twice. @default false */
  allowDuplicates?: boolean;
  /** Normalise an entry before validation. @default trims whitespace */
  transform?: (raw: string) => string;
  /** Turn leftover text into a chip when the field loses focus. @default true */
  addOnBlur?: boolean;
  /** Extra Tag props per chip: initials, dot, icon. */
  tagProps?: (tag: string) => Partial<Omit<TagProps, "children" | "onRemove" | "value">>;
  /** Submits the chips as one comma-joined value. */
  name?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

/** Text field that turns entries into chips on Enter, comma or paste; Backspace on an empty field removes the last one. */
export function TagInput({
  label,
  hint,
  error,
  required,
  size = "md",
  value,
  defaultValue = [],
  onValueChange,
  placeholder,
  max,
  validate,
  allowDuplicates = false,
  transform = (raw) => raw.trim(),
  addOnBlur = true,
  tagProps,
  name,
  id,
  disabled,
  className,
}: TagInputProps) {
  const [own, setOwn] = React.useState<string[]>(defaultValue);
  const tags = value ?? own;
  const [draft, setDraft] = React.useState("");
  const [issue, setIssue] = React.useState<string | null>(null);
  const [announce, setAnnounce] = React.useState("");
  const input = React.useRef<HTMLInputElement>(null);
  const full = max !== undefined && tags.length >= max;

  const commit = (next: string[]) => {
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };

  /** Adds entries; returns what was rejected so text can stay in the field. */
  const add = (raws: string[]) => {
    const next = [...tags];
    const rejected: string[] = [];
    let message: string | null = null;
    for (const raw of raws) {
      const tag = transform(raw);
      if (!tag) continue;
      if (max !== undefined && next.length >= max) {
        message = `You can add up to ${max}.`;
        rejected.push(raw);
        continue;
      }
      if (!allowDuplicates && next.some((t) => t.toLowerCase() === tag.toLowerCase())) {
        message = `${tag} is already added.`;
        rejected.push(raw);
        continue;
      }
      const verdict = validate?.(tag, next);
      if (verdict) {
        message = verdict;
        rejected.push(raw);
        continue;
      }
      next.push(tag);
    }
    const added = next.slice(tags.length);
    if (added.length) {
      commit(next);
      setAnnounce(added.length === 1 ? `Added ${added[0]}` : `Added ${added.length} items`);
    }
    setIssue(message);
    return rejected;
  };

  const removeAt = (index: number) => {
    const tag = tags[index];
    commit(tags.filter((_, i) => i !== index));
    setIssue(null);
    setAnnounce(`Removed ${tag}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && !e.nativeEvent.isComposing) {
      if (!draft.trim()) {
        if (e.key === ",") e.preventDefault();
        return;
      }
      e.preventDefault();
      const rejected = add([draft]);
      setDraft(rejected[0] ?? "");
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      e.preventDefault();
      removeAt(tags.length - 1);
    } else if (e.key === "Escape" && draft) {
      setDraft("");
      setIssue(null);
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!SPLIT.test(text)) return;
    e.preventDefault();
    const rejected = add((draft + text).split(SPLIT));
    setDraft(rejected.map((r) => r.trim()).join(", "));
  };

  const shown = error ?? issue ?? undefined;
  return (
    <Field
      label={label}
      hint={hint}
      error={shown}
      required={required}
      id={id}
      disabled={disabled}
      className={className}
      labelAside={
        max !== undefined ? (
          <span className={cn("font-mono tabular-nums transition-colors", full ? "text-warning" : "text-ink-subtle")}>
            {tags.length}/{max}
          </span>
        ) : undefined
      }
    >
      {({ id: fieldId, describedBy, invalid }) => (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) input.current?.focus();
          }}
          className={fieldWellClasses({
            size,
            invalid,
            disabled,
            className: cn("relative h-auto cursor-text flex-wrap gap-1.5", wellPad[size]),
          })}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {tags.map((tag, i) => (
              <Tag key={tag + (allowDuplicates ? `-${i}` : "")} size={size} disabled={disabled} onRemove={() => removeAt(i)} {...tagProps?.(tag)}>
                {tag}
              </Tag>
            ))}
          </AnimatePresence>
          <input
            ref={input}
            id={fieldId}
            value={draft}
            disabled={disabled}
            placeholder={full ? undefined : tags.length ? "" : placeholder}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            onChange={(e) => {
              setDraft(e.target.value);
              if (issue) setIssue(null);
            }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onBlur={() => {
              if (addOnBlur && draft.trim()) {
                const rejected = add([draft]);
                setDraft(rejected[0] ?? "");
              }
            }}
            className={cn("min-w-[8ch] flex-1 bg-transparent pr-2 text-ink outline-none placeholder:text-ink-subtle", inputText[size])}
          />
          {name && <input type="hidden" name={name} value={tags.join(",")} />}
          <span className="sr-only" aria-live="polite">
            {announce}
          </span>
        </div>
      )}
    </Field>
  );
}
