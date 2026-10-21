"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, fieldWellClasses } from "@/components/ui/field";
import { buttonClasses } from "@/components/ui/button";
import {
  Listbox,
  ListboxPopover,
  OptionMedia,
  defaultFilter,
  filterEntries,
  flattenEntries,
  isPrintableKey,
  listboxIconSize,
  mapEntries,
  optionId,
  useListboxNavigation,
  useSafeId,
  type ListboxEntry,
  type ListboxIcon,
  type ListboxOption,
  type ListboxSize,
} from "@/components/ui/listbox";

export type { ListboxEntry as TagSelectEntry, ListboxOption as TagSelectOption } from "@/components/ui/listbox";

export interface TagSelectProps {
  /** Options, groups (`{ heading, options }`) and separators (`{ separator: true }`). */
  options: ListboxEntry[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  size?: ListboxSize;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  labelAside?: React.ReactNode;
  id?: string;
  /** @default "Select options" */
  placeholder?: string;
  iconLeading?: ListboxIcon;
  /** Chips shown before collapsing the rest into "+N". @default 3 */
  maxVisible?: number;
  /** Most options that can be picked; the rest disable once reached. */
  max?: number;
  /** Search box at the top of the panel. @default true */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Footer with the selected count, Reset and Select all. @default true */
  footer?: boolean;
  emptyText?: React.ReactNode;
  /** Form field name; each value is posted through its own hidden input. */
  name?: string;
  "aria-label"?: string;
  className?: string;
}

const chipSize: Record<ListboxSize, string> = {
  sm: "h-5 text-[11px] gap-1",
  md: "h-6 text-xs gap-1.5",
  lg: "h-7 text-[13px] gap-1.5",
};

/** Multi-select whose picks become chips in the field: chips pop in with a spring, overflow folds into "+N", arrows walk the chips and Backspace removes them. */
export function TagSelect({
  options,
  value,
  defaultValue = [],
  onValueChange,
  size = "md",
  label,
  hint,
  error,
  required,
  disabled,
  labelAside,
  id,
  placeholder = "Select options",
  iconLeading: IconLeading,
  maxVisible = 3,
  max,
  searchable = true,
  searchPlaceholder = "Search",
  footer = true,
  emptyText = "No matches",
  name,
  "aria-label": ariaLabel,
  className,
}: TagSelectProps) {
  const reduce = useReducedMotion();
  const listId = useSafeId("ts");
  const wellRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const chipRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = React.useRef<string | null>(null);

  const [own, setOwn] = React.useState<string[]>(defaultValue);
  const values = value ?? own;
  const [isOpen, setIsOpen] = React.useState(false);
  const open = isOpen && !disabled;
  const [query, setQuery] = React.useState("");

  const all = React.useMemo(() => flattenEntries(options), [options]);
  const byValue = React.useMemo(() => new Map(all.map((o) => [o.value, o])), [all]);
  const picked = values.map((v) => byValue.get(v)).filter((o): o is ListboxOption => Boolean(o));
  const shown = picked.slice(0, maxVisible);
  const hidden = picked.slice(maxVisible);
  const full = max !== undefined && values.length >= max;

  const visible = React.useMemo(() => {
    const filtered = searchable && query.trim() ? filterEntries(options, (o) => defaultFilter(o, query)) : options;
    return full ? mapEntries(filtered, (o) => (values.includes(o.value) ? o : { ...o, disabled: true })) : filtered;
  }, [options, searchable, query, full, values]);
  const visibleFlat = React.useMemo(() => flattenEntries(visible), [visible]);
  const nav = useListboxNavigation(visibleFlat, { autoActivateFirst: Boolean(query.trim()) });

  // Move focus after the chip list re-renders (removal shifts chips around).
  React.useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    if (target === "") triggerRef.current?.focus();
    else chipRefs.current.get(target)?.focus();
  });

  const set = (next: string[]) => {
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };
  const toggle = (option: ListboxOption) => {
    if (option.disabled) return;
    set(values.includes(option.value) ? values.filter((v) => v !== option.value) : [...values, option.value]);
  };
  const selectableVisible = visibleFlat.filter((o) => !byValue.get(o.value)?.disabled);
  const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every((o) => values.includes(o.value));
  const selectAll = () => {
    const next = [...values];
    for (const o of selectableVisible) {
      if (max !== undefined && next.length >= max) break;
      if (!next.includes(o.value)) next.push(o.value);
    }
    set(next);
  };

  const setOpen = (next: boolean, restoreFocus = true) => {
    setIsOpen(next);
    if (!next) {
      setQuery("");
      if (restoreFocus) triggerRef.current?.focus();
    }
  };
  const openList = () => {
    const first = visibleFlat.find((o) => !o.disabled);
    nav.setActive(first?.value ?? null);
    setIsOpen(true);
  };

  const remove = (option: ListboxOption, index: number, direction: "prev" | "next") => {
    const next = values.filter((v) => v !== option.value);
    set(next);
    const nextShown = next.slice(0, maxVisible);
    const target = direction === "prev" && index > 0 ? nextShown[index - 1] : nextShown[Math.min(index, nextShown.length - 1)];
    pendingFocus.current = target ?? "";
  };

  const focusChip = (index: number) => {
    const o = shown[index];
    if (o) chipRefs.current.get(o.value)?.focus();
    else triggerRef.current?.focus();
  };

  const onChipKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, option: ListboxOption, index: number) => {
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        focusChip(Math.max(0, index - 1));
        return;
      case "ArrowRight":
        e.preventDefault();
        focusChip(index + 1);
        return;
      case "Home":
        e.preventDefault();
        focusChip(0);
        return;
      case "End":
        e.preventDefault();
        focusChip(shown.length - 1);
        return;
      case "Backspace":
        e.preventDefault();
        remove(option, index, "prev");
        return;
      case "Delete":
        e.preventDefault();
        remove(option, index, "next");
        return;
      case "Escape":
        e.preventDefault();
        triggerRef.current?.focus();
        return;
      case "ArrowDown":
        e.preventDefault();
        triggerRef.current?.focus();
        openList();
        return;
    }
  };

  // Listbox keys shared by the trigger (no search) and the search box.
  const onListKey = (e: React.KeyboardEvent, textInput: boolean) => {
    const toggleActive = () => {
      const o = visibleFlat.find((x) => x.value === nav.active);
      if (o) toggle(o);
    };
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        nav.step(1);
        return;
      case "ArrowUp":
        e.preventDefault();
        nav.step(-1);
        return;
      case "PageDown":
      case "PageUp":
        e.preventDefault();
        nav.step(e.key === "PageDown" ? 10 : -10);
        return;
      case "Home":
      case "End":
        if (textInput) return;
        e.preventDefault();
        nav.edge(e.key === "Home" ? "first" : "last");
        return;
      case "Enter":
        e.preventDefault();
        toggleActive();
        return;
      case " ":
        if (textInput) return;
        e.preventDefault();
        toggleActive();
        return;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        return;
      case "Tab":
        if (!textInput) setOpen(false, false);
        return;
      default:
        if (!textInput && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
          e.preventDefault();
          if (allVisibleSelected) set(values.filter((v) => !selectableVisible.some((o) => o.value === v)));
          else selectAll();
          return;
        }
        if (!textInput && isPrintableKey(e)) nav.typeahead(e.key, e.timeStamp);
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === "ArrowLeft" || e.key === "Backspace") && shown.length) {
      e.preventDefault();
      if (open) setOpen(false, false);
      focusChip(shown.length - 1);
      return;
    }
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      } else if (searchable && isPrintableKey(e)) {
        setQuery(e.key);
        setIsOpen(true);
      }
      return;
    }
    if (!searchable) onListKey(e, false);
  };

  // Pressing empty well space acts like pressing the trigger.
  const onBlankPress = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || disabled) return;
    e.preventDefault();
    triggerRef.current?.focus();
    if (open) setOpen(false);
    else openList();
  };

  const activeId = open && nav.active ? optionId(listId, nav.active) : undefined;
  const countLabel = `${values.length} selected`;

  return (
    <Field label={label} hint={hint} error={error} required={required} labelAside={labelAside} id={id} disabled={disabled} className={className}>
      {({ id: controlId, labelId, describedBy, invalid }) => (
        <>
          <div
            ref={wellRef}
            role="group"
            aria-labelledby={label ? labelId : undefined}
            aria-label={label ? undefined : ariaLabel}
            onPointerDown={onBlankPress}
            className={cn(
              fieldWellClasses({ size, invalid, disabled }),
              "h-auto cursor-pointer py-1",
              open && !invalid && "border-volt-ink shadow-[0_0_0_3px_var(--volt-soft)]",
            )}
          >
            {IconLeading && (
              <span aria-hidden className="inline-flex shrink-0 text-ink-subtle">
                <IconLeading className={listboxIconSize[size]} />
              </span>
            )}
            <div
              onPointerDown={onBlankPress}
              className="relative flex min-w-0 flex-1 flex-wrap items-center gap-1"
            >
              {picked.length > 0 && (
                <div role="list" aria-label="Selected" className="contents">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {shown.map((o, i) => (
                      <motion.span
                        key={o.value}
                        role="listitem"
                        layout={!reduce}
                        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(4px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(4px)" }}
                        transition={{ type: "spring", stiffness: 480, damping: 30 }}
                        className={cn(
                          "inline-flex max-w-[11rem] items-center rounded-full border border-border bg-surface pr-0.5 text-ink",
                          "has-[:focus-visible]:border-volt-ink has-[:focus-visible]:shadow-[0_0_0_2px_var(--volt-soft)]",
                          chipSize[size],
                          o.avatar || o.dot || o.icon ? "pl-0.5" : "pl-2",
                        )}
                      >
                        <OptionMedia option={o} size="sm" className={cn(!o.avatar && "ml-1")} />
                        <span className="truncate">{o.label}</span>
                        <button
                          ref={(node) => {
                            if (node) chipRefs.current.set(o.value, node);
                            else chipRefs.current.delete(o.value);
                          }}
                          type="button"
                          tabIndex={-1}
                          aria-label={`Remove ${o.label}`}
                          disabled={disabled}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => remove(o, i, "next")}
                          onKeyDown={(e) => onChipKeyDown(e, o, i)}
                          className="grid size-5 shrink-0 place-items-center rounded-full text-ink-subtle outline-none hover:bg-surface-hover hover:text-ink focus-visible:bg-surface-hover focus-visible:text-ink"
                        >
                          <X aria-hidden className="size-3" />
                        </button>
                      </motion.span>
                    ))}
                    {hidden.length > 0 && (
                      <motion.span
                        key="overflow"
                        role="listitem"
                        layout={!reduce}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ type: "spring", stiffness: 480, damping: 30 }}
                        title={hidden.map((o) => o.label).join(", ")}
                        className={cn("inline-flex items-center rounded-full bg-volt-soft px-2 font-medium tabular-nums text-volt-ink", chipSize[size])}
                      >
                        +{hidden.length}
                        <span className="sr-only"> more: {hidden.map((o) => o.label).join(", ")}</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <button
                ref={triggerRef}
                id={controlId}
                type="button"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-activedescendant={!searchable ? activeId : undefined}
                aria-labelledby={label ? `${labelId} ${controlId}-count` : undefined}
                aria-label={label ? undefined : ariaLabel}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                aria-required={required || undefined}
                disabled={disabled}
                onClick={() => (open ? setOpen(false) : openList())}
                onKeyDown={onTriggerKeyDown}
                className={cn("flex h-6 flex-1 cursor-pointer items-center justify-between gap-2 rounded-[6px] text-left outline-none focus-visible:shadow-[var(--focus-ring)]", picked.length ? "min-w-6" : "min-w-16")}
              >
                <span id={`${controlId}-count`} className={cn("truncate", picked.length && "sr-only")}>
                  {picked.length ? countLabel : placeholder}
                </span>
                <motion.span
                  aria-hidden
                  animate={{ rotate: open ? 180 : 0 }}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 28 }}
                  className="ml-auto inline-flex shrink-0 text-ink-subtle"
                >
                  <ChevronDown className={listboxIconSize[size]} />
                </motion.span>
              </button>
            </div>
          </div>
          {name && values.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
          <ListboxPopover open={open} anchorRef={wellRef} onDismiss={() => setOpen(false, false)}>
            {searchable && (
              <div className="flex shrink-0 items-center gap-2 border-b border-border px-3">
                <Search aria-hidden className="size-4 shrink-0 text-ink-subtle" />
                <input
                  autoFocus
                  role="combobox"
                  aria-expanded
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-activedescendant={activeId}
                  aria-label={typeof label === "string" ? `Search ${label.toLowerCase()}` : "Search options"}
                  value={query}
                  placeholder={searchPlaceholder}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    nav.setActive(null);
                  }}
                  onKeyDown={(e) => onListKey(e, true)}
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
                />
              </div>
            )}
            <Listbox
              id={listId}
              entries={visible}
              selected={values}
              active={nav.active}
              onActiveChange={nav.setActive}
              onPick={toggle}
              multiple
              indicator="checkbox"
              size={size}
              query={searchable ? query : undefined}
              aria-labelledby={label ? labelId : undefined}
              aria-label={label ? undefined : (ariaLabel ?? "Options")}
              empty={
                <div role="status" className="grid justify-items-center gap-2 px-3 py-6 text-center text-sm text-ink-subtle">
                  <span>
                    {emptyText}
                    {query.trim() && <> for “{query.trim()}”</>}
                  </span>
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="rounded-full text-xs font-medium text-volt-ink underline-offset-4 outline-none hover:underline focus-visible:shadow-[var(--focus-ring)]"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              }
            />
            {footer && (
              <div className="flex shrink-0 items-center gap-1.5 border-t border-border px-2 py-2">
                <span aria-live="polite" className="mr-auto flex items-center gap-1 pl-1.5 text-xs text-ink-subtle">
                  <span className="relative inline-flex overflow-hidden tabular-nums text-ink">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={values.length}
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                        transition={{ type: "spring", stiffness: 500, damping: 34 }}
                      >
                        {values.length}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  {max !== undefined ? `of ${max} selected` : "selected"}
                </span>
                <button
                  type="button"
                  disabled={values.length === 0}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => set([])}
                  className={buttonClasses({ variant: "ghost", size: "sm", className: "h-7 px-3 text-xs" })}
                >
                  Reset
                </button>
                <button
                  type="button"
                  disabled={allVisibleSelected || full || selectableVisible.length === 0}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={selectAll}
                  className={buttonClasses({ variant: "secondary", size: "sm", className: "h-7 px-3 text-xs" })}
                >
                  Select all
                </button>
              </div>
            )}
          </ListboxPopover>
        </>
      )}
    </Field>
  );
}
