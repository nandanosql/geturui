"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, Plus, Search, SearchX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, fieldWellClasses } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  Listbox,
  ListboxPopover,
  OptionMedia,
  defaultFilter,
  filterEntries,
  flattenEntries,
  fold,
  listboxIconSize,
  optionId,
  useListboxNavigation,
  useSafeId,
  type ListboxEntry,
  type ListboxIcon,
  type ListboxOption,
  type ListboxSize,
} from "@/components/ui/listbox";

export type { ListboxEntry as ComboboxEntry, ListboxOption as ComboboxOption } from "@/components/ui/listbox";

const CREATE = "\u0000create";

export interface ComboboxProps {
  /** Options, groups (`{ heading, options }`) and separators (`{ separator: true }`). */
  options: ListboxEntry[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null, option: ListboxOption | null) => void;
  /** Text in the input (controlled). */
  inputValue?: string;
  defaultInputValue?: string;
  /** Fires on every keystroke — fetch here for async results. */
  onInputChange?: (text: string) => void;
  /** Custom match test, or `false` when `options` are already filtered (async). */
  filter?: false | ((option: ListboxOption, query: string) => boolean);
  /** Shows a spinner in the well and a loading row while there are no results. */
  loading?: boolean;
  /** @default "Searching…" */
  loadingText?: string;
  /** Adds a "Create “text”" option when nothing matches exactly. */
  onCreate?: (text: string) => void;
  /** Label for the create option. @default (text) => `Create “${text}”` */
  createLabel?: (text: string) => string;
  /** Empty state title; the description below it says what to try. */
  emptyText?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  size?: ListboxSize;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  labelAside?: React.ReactNode;
  id?: string;
  /** @default "Search" */
  placeholder?: string;
  /** Leading icon in the well (replaced by the selected option's media). @default Search */
  iconLeading?: ListboxIcon;
  /** Open the list when the input gets focus. @default false */
  openOnFocus?: boolean;
  /** Form field name; the value is posted through a hidden input. */
  name?: string;
  "aria-label"?: string;
  className?: string;
}

/** Type-to-filter combobox: matches light up in volt, a create row offers the typed text, and async results load behind a spinner. */
export function Combobox({
  options,
  value,
  defaultValue = null,
  onValueChange,
  inputValue,
  defaultInputValue,
  onInputChange,
  filter,
  loading,
  loadingText = "Searching…",
  onCreate,
  createLabel = (t) => `Create “${t}”`,
  emptyText = "No matches",
  emptyDescription = "Try a shorter or different word.",
  size = "md",
  label,
  hint,
  error,
  required,
  disabled,
  labelAside,
  id,
  placeholder = "Search",
  iconLeading: IconLeading = Search,
  openOnFocus = false,
  name,
  "aria-label": ariaLabel,
  className,
}: ComboboxProps) {
  const reduce = useReducedMotion();
  const listId = useSafeId("cb");
  const wellRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const all = React.useMemo(() => flattenEntries(options), [options]);

  const [ownValue, setOwnValue] = React.useState<string | null>(defaultValue);
  const current = value === undefined ? ownValue : value;
  const selected = all.find((o) => o.value === current) ?? null;

  // True once the person types; until then the input mirrors the selected label and the list shows everything.
  const [editing, setEditing] = React.useState(false);
  const [ownText, setOwnText] = React.useState(defaultInputValue ?? selected?.label ?? "");
  const text = inputValue ?? (editing ? ownText : (selected?.label ?? ownText));
  const [isOpen, setIsOpen] = React.useState(false);
  const open = isOpen && !disabled;

  const query = editing ? text.trim() : "";
  const visible = React.useMemo(() => {
    let list = query && filter !== false ? filterEntries(options, (o) => (filter ? filter(o, query) : defaultFilter(o, query))) : options;
    const exact = flattenEntries(list).some((o) => fold(o.label) === fold(query));
    if (onCreate && query && !exact && !loading) {
      const createRow: ListboxOption = { value: CREATE, label: createLabel(query), icon: Plus };
      list = flattenEntries(list).length ? [...list, { separator: true }, createRow] : [createRow];
    }
    return list;
  }, [options, query, filter, onCreate, createLabel, loading]);
  const visibleFlat = React.useMemo(() => flattenEntries(visible), [visible]);
  const nav = useListboxNavigation(visibleFlat, { autoActivateFirst: Boolean(query) });

  const setText = (t: string) => {
    if (inputValue === undefined) setOwnText(t);
    onInputChange?.(t);
  };

  const openList = (target: "selected" | "first" | "last") => {
    const enabled = visibleFlat.filter((o) => !o.disabled);
    const pick = target === "first" ? enabled[0] : target === "last" ? enabled[enabled.length - 1] : (enabled.find((o) => o.value === current) ?? enabled[0]);
    nav.setActive(pick?.value ?? null);
    setIsOpen(true);
  };

  const commit = (next: string | null, option: ListboxOption | null) => {
    if (value === undefined) setOwnValue(next);
    onValueChange?.(next, option);
  };

  const choose = (option: ListboxOption) => {
    if (option.disabled) return;
    if (option.value === CREATE) {
      onCreate?.(query);
      setText(query);
    } else {
      commit(option.value, option);
      setText(option.label);
    }
    setEditing(false);
    setIsOpen(false);
  };

  // Leaving the field: an emptied input clears the value, anything else snaps back to the selected label.
  const settle = () => {
    if (!editing) return;
    if (!text.trim()) {
      if (current !== null) commit(null, null);
    } else if (selected) {
      setText(selected.label);
    }
    setEditing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openList(e.altKey ? "selected" : current ? "selected" : "first");
        else nav.step(1);
        return;
      case "ArrowUp":
        e.preventDefault();
        if (!open) openList("last");
        else nav.step(-1);
        return;
      case "PageDown":
      case "PageUp":
        if (!open) return;
        e.preventDefault();
        nav.step(e.key === "PageDown" ? 10 : -10);
        return;
      case "Enter": {
        if (!open) return;
        const o = visibleFlat.find((x) => x.value === nav.active);
        if (o) {
          e.preventDefault();
          choose(o);
        }
        return;
      }
      case "Escape":
        if (open) {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(false);
        } else if (text) {
          e.preventDefault();
          setText("");
          setEditing(false);
          commit(null, null);
        }
        return;
      case "Tab":
        setIsOpen(false);
        return;
    }
  };

  const activeId = open && nav.active ? optionId(listId, nav.active) : undefined;
  const Leading = selected && !editing && (selected.icon || selected.avatar || selected.dot) ? null : IconLeading;

  const empty = loading ? (
    <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-ink-subtle">
      <Spinner size="sm" label={null} />
      <span role="status">{loadingText}</span>
    </div>
  ) : (
    <div role="status" className="grid justify-items-center gap-1 px-4 py-6 text-center">
      <motion.span
        aria-hidden
        initial={reduce ? false : { rotate: -12, scale: 0.8 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 14 }}
        className="mb-1 grid size-9 place-items-center rounded-full bg-surface-sunken text-ink-subtle"
      >
        <SearchX className="size-4" />
      </motion.span>
      <span className="text-sm font-medium text-ink">
        {emptyText}
        {query && <> for “{query}”</>}
      </span>
      {emptyDescription && <span className="text-xs text-ink-subtle">{emptyDescription}</span>}
    </div>
  );

  return (
    <Field label={label} hint={hint} error={error} required={required} labelAside={labelAside} id={id} disabled={disabled} className={className}>
      {({ id: controlId, labelId, describedBy, invalid }) => (
        <>
          <div
            ref={wellRef}
            onPointerDown={(e) => {
              if (e.target !== inputRef.current) {
                e.preventDefault();
                inputRef.current?.focus();
              }
            }}
            className={cn(
              fieldWellClasses({ size, invalid, disabled }),
              "cursor-text",
              open && !invalid && "border-volt-ink shadow-[0_0_0_3px_var(--volt-soft)]",
            )}
          >
            {selected && !editing && !Leading ? (
              <OptionMedia option={selected} size={size} />
            ) : (
              Leading && (
                <span aria-hidden className="inline-flex shrink-0 text-ink-subtle">
                  <Leading className={listboxIconSize[size]} />
                </span>
              )
            )}
            <input
              ref={inputRef}
              id={controlId}
              type="text"
              role="combobox"
              autoComplete="off"
              spellCheck={false}
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
              aria-activedescendant={activeId}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              aria-required={required || undefined}
              aria-label={label ? undefined : ariaLabel}
              aria-busy={loading || undefined}
              disabled={disabled}
              placeholder={placeholder}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setEditing(true);
                nav.setActive(null);
                setIsOpen(true);
              }}
              onFocus={() => {
                if (openOnFocus) openList("selected");
              }}
              onPointerDown={() => {
                if (!open) openList("selected");
              }}
              onBlur={(e) => {
                const next = e.relatedTarget as Node | null;
                if (!next || !wellRef.current?.contains(next)) settle();
              }}
              onKeyDown={onKeyDown}
              className="min-w-0 flex-1 bg-transparent py-1 text-ink outline-none placeholder:text-ink-subtle"
            />
            <AnimatePresence initial={false}>
              {loading && (
                <motion.span key="spin" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} className="inline-flex">
                  <Spinner size="sm" label={null} />
                </motion.span>
              )}
              {!loading && text && !disabled && (
                <motion.button
                  key="clear"
                  type="button"
                  tabIndex={-1}
                  aria-label="Clear"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setText("");
                    setEditing(true);
                    commit(null, null);
                    nav.setActive(null);
                    inputRef.current?.focus();
                  }}
                  className="grid size-5 shrink-0 place-items-center rounded-full text-ink-subtle hover:bg-surface-hover hover:text-ink"
                >
                  <X aria-hidden className="size-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
            <button
              type="button"
              tabIndex={-1}
              aria-label={open ? "Hide options" : "Show options"}
              disabled={disabled}
              onClick={() => (open ? setIsOpen(false) : openList("selected"))}
              className="-mr-1 grid size-6 shrink-0 place-items-center rounded-full text-ink-subtle hover:text-ink"
            >
              <motion.span
                aria-hidden
                animate={{ rotate: open ? 180 : 0 }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 28 }}
                className="inline-flex"
              >
                <ChevronDown className={listboxIconSize[size]} />
              </motion.span>
            </button>
          </div>
          {name && <input type="hidden" name={name} value={current ?? ""} />}
          <ListboxPopover open={open} anchorRef={wellRef} onDismiss={() => setIsOpen(false)}>
            <Listbox
              id={listId}
              entries={visible}
              selected={current ? [current] : []}
              active={nav.active}
              onActiveChange={nav.setActive}
              onPick={choose}
              size={size}
              query={query}
              busy={loading}
              aria-labelledby={label ? labelId : undefined}
              aria-label={label ? undefined : (ariaLabel ?? "Suggestions")}
              empty={empty}
            />
          </ListboxPopover>
        </>
      )}
    </Field>
  );
}
