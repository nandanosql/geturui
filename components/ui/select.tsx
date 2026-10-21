"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, fieldWellClasses } from "@/components/ui/field";
import {
  Kbd,
  Listbox,
  ListboxPopover,
  OptionMedia,
  defaultFilter,
  filterEntries,
  flattenEntries,
  isPrintableKey,
  listboxIconSize,
  optionId,
  useIsMac,
  useListboxNavigation,
  useSafeId,
  type ListboxEntry,
  type ListboxIcon,
  type ListboxOption,
  type ListboxSize,
} from "@/components/ui/listbox";

export type { ListboxEntry as SelectEntry, ListboxOption as SelectOption, ListboxGroup as SelectGroup } from "@/components/ui/listbox";

export interface SelectProps {
  /** Options, groups (`{ heading, options }`) and separators (`{ separator: true }`). */
  options: ListboxEntry[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null, option: ListboxOption | null) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Well height 32 / 40 / 48. @default "md" */
  size?: ListboxSize;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  labelAside?: React.ReactNode;
  id?: string;
  /** @default "Select an option" */
  placeholder?: string;
  /** Icon shown in the trigger when the selected option has no media of its own. */
  iconLeading?: ListboxIcon;
  /** Adds a search box at the top of the panel. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Shown when the search matches nothing. */
  emptyText?: React.ReactNode;
  /** Letter that opens the select with ⌘ (Ctrl elsewhere); shown as a hint in the trigger. */
  shortcut?: string;
  /** Form field name; the value is posted through a hidden input. */
  name?: string;
  /** Show the option's description next to the selected label. @default true */
  showDescription?: boolean;
  /** Accessible name when there is no visible label. */
  "aria-label"?: string;
  className?: string;
  triggerClassName?: string;
}

/** Single-choice select on the field well: a gliding volt highlight, a check that draws itself and a value that cross-slides in the trigger. */
export function Select({
  options,
  value,
  defaultValue = null,
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  size = "md",
  label,
  hint,
  error,
  required,
  disabled,
  labelAside,
  id,
  placeholder = "Select an option",
  iconLeading: IconLeading,
  searchable,
  searchPlaceholder = "Search",
  emptyText = "No matches",
  shortcut,
  name,
  showDescription = true,
  "aria-label": ariaLabel,
  className,
  triggerClassName,
}: SelectProps) {
  const reduce = useReducedMotion();
  const isMac = useIsMac();
  const listId = useSafeId("lb");
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [ownValue, setOwnValue] = React.useState<string | null>(defaultValue);
  const current = value === undefined ? ownValue : value;
  const [ownOpen, setOwnOpen] = React.useState(defaultOpen);
  const isOpen = (open ?? ownOpen) && !disabled;
  const [query, setQuery] = React.useState("");

  const all = React.useMemo(() => flattenEntries(options), [options]);
  const selected = all.find((o) => o.value === current) ?? null;
  const visible = React.useMemo(() => (searchable && query.trim() ? filterEntries(options, (o) => defaultFilter(o, query)) : options), [options, searchable, query]);
  const visibleFlat = React.useMemo(() => flattenEntries(visible), [visible]);
  const nav = useListboxNavigation(visibleFlat, { autoActivateFirst: Boolean(query.trim()) });

  const setOpen = (next: boolean, restoreFocus = true) => {
    if (open === undefined) setOwnOpen(next);
    onOpenChange?.(next);
    if (!next) {
      setQuery("");
      if (restoreFocus) triggerRef.current?.focus();
    }
  };

  const openAt = (target: "selected" | "first" | "last") => {
    const enabled = all.filter((o) => !o.disabled);
    const pick =
      target === "first" ? enabled[0] : target === "last" ? enabled[enabled.length - 1] : (enabled.find((o) => o.value === current) ?? enabled[0]);
    nav.setActive(pick?.value ?? null);
    setOpen(true);
  };

  const choose = (option: ListboxOption) => {
    if (option.disabled) return;
    if (value === undefined) setOwnValue(option.value);
    onValueChange?.(option.value, option);
    setOpen(false);
  };

  const chooseActive = () => {
    const o = visibleFlat.find((x) => x.value === nav.active);
    if (o) choose(o);
  };

  // Keys shared by the trigger (select-only) and the search box.
  const onListKey = (e: React.KeyboardEvent, textInput: boolean) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        nav.step(1);
        return;
      case "ArrowUp":
        e.preventDefault();
        if (e.altKey) chooseActive();
        else nav.step(-1);
        return;
      case "PageDown":
        e.preventDefault();
        nav.step(10);
        return;
      case "PageUp":
        e.preventDefault();
        nav.step(-10);
        return;
      case "Home":
      case "End":
        if (textInput) return;
        e.preventDefault();
        nav.edge(e.key === "Home" ? "first" : "last");
        return;
      case "Enter":
        e.preventDefault();
        chooseActive();
        return;
      case " ":
        if (textInput) return;
        e.preventDefault();
        chooseActive();
        return;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        return;
      case "Tab":
        // APG select-only: Tab commits the highlighted option. From the search box, hand focus back to the trigger first.
        if (!textInput) chooseActive();
        else setOpen(false);
        return;
      default:
        if (!textInput && isPrintableKey(e)) nav.typeahead(e.key, e.timeStamp);
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openAt("selected");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        openAt(current ? "selected" : "last");
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        openAt(e.key === "Home" ? "first" : "last");
      } else if (isPrintableKey(e)) {
        if (searchable) {
          setQuery(e.key);
          setOpen(true);
        } else {
          setOpen(true);
          nav.typeahead(e.key, e.timeStamp);
        }
      }
      return;
    }
    if (!searchable) onListKey(e, false);
  };

  // Global ⌘/Ctrl + letter opens the select.
  const openRef = React.useRef(() => {});
  React.useEffect(() => {
    openRef.current = () => {
      triggerRef.current?.focus();
      openAt("selected");
    };
  });
  React.useEffect(() => {
    if (!shortcut || disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === shortcut.toLowerCase()) {
        e.preventDefault();
        openRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut, disabled]);

  const activeId = isOpen && nav.active ? optionId(listId, nav.active) : undefined;
  const LeadingIcon = selected && (selected.icon || selected.avatar || selected.dot) ? null : IconLeading;

  return (
    <Field label={label} hint={hint} error={error} required={required} labelAside={labelAside} id={id} disabled={disabled} className={className}>
      {({ id: controlId, labelId, describedBy, invalid }) => (
        <>
          <button
            ref={triggerRef}
            id={controlId}
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={isOpen ? listId : undefined}
            aria-activedescendant={!searchable ? activeId : undefined}
            aria-labelledby={label ? `${labelId} ${controlId}-value` : undefined}
            aria-label={label ? undefined : ariaLabel}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            aria-required={required || undefined}
            disabled={disabled}
            onClick={() => (isOpen ? setOpen(false) : openAt("selected"))}
            onKeyDown={onTriggerKeyDown}
            className={cn(
              fieldWellClasses({ size, invalid, disabled }),
              "cursor-pointer select-none text-left outline-none",
              isOpen && !invalid && "border-volt-ink shadow-[0_0_0_3px_var(--volt-soft)]",
              triggerClassName,
            )}
          >
            {LeadingIcon && (
              <span aria-hidden className="inline-flex shrink-0 text-ink-subtle">
                <LeadingIcon className={listboxIconSize[size]} />
              </span>
            )}
            <span id={`${controlId}-value`} className="relative flex min-w-0 flex-1 overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={selected?.value ?? "__placeholder"}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="flex min-w-0 flex-1 items-center gap-[inherit]"
                  style={{ gap: size === "lg" ? 10 : 8 }}
                >
                  {selected ? (
                    <>
                      <OptionMedia option={selected} size={size} />
                      <span className="truncate text-ink">{selected.label}</span>
                      {showDescription && typeof selected.description === "string" && (
                        <span className="hidden truncate text-ink-subtle sm:inline">{selected.description}</span>
                      )}
                    </>
                  ) : (
                    <span className="truncate">{placeholder}</span>
                  )}
                </motion.span>
              </AnimatePresence>
            </span>
            {shortcut && (
              <Kbd className="hidden sm:inline-flex">
                <span className="sr-only">Shortcut: </span>
                {isMac ? "⌘" : "Ctrl "}
                {shortcut.toUpperCase()}
              </Kbd>
            )}
            <motion.span
              aria-hidden
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 28 }}
              className="inline-flex shrink-0 text-ink-subtle"
            >
              <ChevronDown className={listboxIconSize[size]} />
            </motion.span>
          </button>
          {name && <input type="hidden" name={name} value={current ?? ""} />}
          <ListboxPopover open={isOpen} anchorRef={triggerRef} onDismiss={() => setOpen(false, false)}>
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
              selected={current ? [current] : []}
              active={nav.active}
              onActiveChange={nav.setActive}
              onPick={choose}
              size={size}
              query={searchable ? query : undefined}
              aria-labelledby={label ? labelId : undefined}
              aria-label={label ? undefined : (ariaLabel ?? "Options")}
              empty={
                <p role="status" className="px-3 py-6 text-center text-sm text-ink-subtle">
                  {emptyText}
                </p>
              }
            />
          </ListboxPopover>
        </>
      )}
    </Field>
  );
}
