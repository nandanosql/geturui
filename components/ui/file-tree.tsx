"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Braces,
  ChevronRight,
  File,
  FileArchive,
  FileCode,
  FileImage,
  FileKey,
  FileLock,
  FileText,
  FileType,
  Folder,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TreeNode {
  id: string;
  name: string;
  /** Present (even empty) for folders. */
  children?: TreeNode[];
}

export interface FileTreeProps {
  data: TreeNode[];
  selectedId?: string;
  defaultSelectedId?: string;
  onSelect?: (node: TreeNode) => void;
  expandedIds?: string[];
  defaultExpandedIds?: string[];
  onExpandedChange?: (ids: string[]) => void;
  /** Row height in px. */
  rowHeight?: number;
  /** Indent per level in px. */
  indent?: number;
  className?: string;
  "aria-label"?: string;
}

type Row = { node: TreeNode; depth: number; ancestors: string[]; posinset: number; setsize: number; parentId: string | null };

const icons: [RegExp, LucideIcon, string][] = [
  [/\.(tsx?|jsx?|mjs|cjs)$/i, FileCode, "text-info"],
  [/\.json$/i, Braces, "text-warning"],
  [/\.(mdx?|txt)$/i, FileText, "text-ink-muted"],
  [/\.(css|scss)$/i, FileType, "text-volt-ink"],
  [/\.(png|jpe?g|gif|svg|webp|avif|ico)$/i, FileImage, "text-success"],
  [/\.(zip|tgz|gz)$/i, FileArchive, "text-ember-ink"],
  [/(\.lock|lock\.json|lock\.yaml)$/i, FileLock, "text-ink-subtle"],
  [/^\.env/i, FileKey, "text-warning"],
];

/** Picks a lucide glyph and tint from the file name. */
export function fileIcon(name: string): { Icon: LucideIcon; tint: string } {
  for (const [re, Icon, tint] of icons) if (re.test(name)) return { Icon, tint };
  return { Icon: File, tint: "text-ink-subtle" };
}

function flatten(nodes: TreeNode[], expanded: Set<string>, depth = 0, ancestors: string[] = [], out: Row[] = []) {
  nodes.forEach((node, i) => {
    out.push({ node, depth, ancestors, posinset: i + 1, setsize: nodes.length, parentId: ancestors[ancestors.length - 1] ?? null });
    if (node.children && expanded.has(node.id)) flatten(node.children, expanded, depth + 1, [...ancestors, node.id], out);
  });
  return out;
}

const rowSpring = { type: "spring", stiffness: 380, damping: 34 } as const;

/**
 * Collapsible file tree: folders spring open, chevrons rotate, indent guides light up for the active folder and a
 * selection pill glides between rows. Full keyboard support (arrows, Home/End, Enter, type-ahead).
 */
export function FileTree({
  data,
  selectedId,
  defaultSelectedId,
  onSelect,
  expandedIds,
  defaultExpandedIds = [],
  onExpandedChange,
  rowHeight = 30,
  indent = 16,
  className,
  ...rest
}: FileTreeProps) {
  const reduce = useReducedMotion();
  const uid = React.useId();
  const [innerExpanded, setInnerExpanded] = React.useState<string[]>(defaultExpandedIds);
  const expandedList = expandedIds ?? innerExpanded;
  const expanded = React.useMemo(() => new Set(expandedList), [expandedList]);
  const [innerSelected, setInnerSelected] = React.useState(defaultSelectedId);
  const selected = selectedId ?? innerSelected;
  const rows = React.useMemo(() => flatten(data, expanded), [data, expanded]);
  const [focusedId, setFocusedId] = React.useState<string | undefined>(undefined);
  const focused = rows.some((r) => r.node.id === focusedId) ? focusedId : (rows.find((r) => r.node.id === selected)?.node.id ?? rows[0]?.node.id);
  const refs = React.useRef(new Map<string, HTMLDivElement>());
  const typeahead = React.useRef({ text: "", t: 0 });

  const selectedRow = rows.find((r) => r.node.id === selected);
  const activeFolder = selectedRow ? (selectedRow.node.children ? selectedRow.node.id : selectedRow.parentId) : null;

  function setExpanded(next: string[]) {
    if (expandedIds === undefined) setInnerExpanded(next);
    onExpandedChange?.(next);
  }
  function toggle(id: string, open?: boolean) {
    const isOpen = expanded.has(id);
    const want = open ?? !isOpen;
    if (want === isOpen) return;
    setExpanded(want ? [...expandedList, id] : expandedList.filter((x) => x !== id));
  }
  function select(node: TreeNode) {
    if (selectedId === undefined) setInnerSelected(node.id);
    onSelect?.(node);
  }
  function focusRow(id: string | undefined) {
    if (!id) return;
    setFocusedId(id);
    refs.current.get(id)?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const i = rows.findIndex((r) => r.node.id === focused);
    const row = rows[i];
    if (!row) return;
    const isFolder = !!row.node.children;
    switch (e.key) {
      case "ArrowDown":
        focusRow(rows[Math.min(rows.length - 1, i + 1)]?.node.id);
        break;
      case "ArrowUp":
        focusRow(rows[Math.max(0, i - 1)]?.node.id);
        break;
      case "Home":
        focusRow(rows[0]?.node.id);
        break;
      case "End":
        focusRow(rows[rows.length - 1]?.node.id);
        break;
      case "ArrowRight":
        if (isFolder && !expanded.has(row.node.id)) toggle(row.node.id, true);
        else if (isFolder && row.node.children?.length) focusRow(row.node.children[0].id);
        break;
      case "ArrowLeft":
        if (isFolder && expanded.has(row.node.id)) toggle(row.node.id, false);
        else if (row.parentId) focusRow(row.parentId);
        break;
      case "Enter":
      case " ":
        select(row.node);
        if (isFolder) toggle(row.node.id);
        break;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const now = e.timeStamp;
          const ta = typeahead.current;
          ta.text = now - ta.t > 600 ? e.key.toLowerCase() : ta.text + e.key.toLowerCase();
          ta.t = now;
          const ordered = [...rows.slice(i + 1), ...rows.slice(0, i + 1)];
          const hit = ordered.find((r) => r.node.name.toLowerCase().startsWith(ta.text));
          if (hit) focusRow(hit.node.id);
          break;
        }
        return;
    }
    e.preventDefault();
  }

  return (
    <div role="tree" aria-label={rest["aria-label"]} onKeyDown={onKeyDown} className={cn("relative select-none text-[13px]", className)}>
      <AnimatePresence initial={false}>
        {rows.map((row) => {
          const { node, depth } = row;
          const isFolder = !!node.children;
          const isOpen = isFolder && expanded.has(node.id);
          const isSelected = node.id === selected;
          const { Icon, tint } = isFolder ? { Icon: isOpen ? FolderOpen : Folder, tint: isOpen ? "text-volt-ink" : "text-ink-muted" } : fileIcon(node.name);
          return (
            <motion.div
              key={node.id}
              // Clip only while the row grows or shrinks, so the selection pill can glide across rows.
              initial={{ height: 0, opacity: 0, overflow: "hidden" }}
              animate={{ height: rowHeight, opacity: 1, transitionEnd: { overflow: "visible" } }}
              exit={{ height: 0, opacity: 0, overflow: "hidden" }}
              transition={reduce ? { duration: 0 } : { height: rowSpring, opacity: { duration: 0.16 } }}
              className="relative"
            >
              <div
                ref={(el) => {
                  if (el) refs.current.set(node.id, el);
                  else refs.current.delete(node.id);
                }}
                role="treeitem"
                aria-level={depth + 1}
                aria-posinset={row.posinset}
                aria-setsize={row.setsize}
                aria-expanded={isFolder ? isOpen : undefined}
                aria-selected={isSelected}
                tabIndex={node.id === focused ? 0 : -1}
                onFocus={() => setFocusedId(node.id)}
                onClick={() => {
                  setFocusedId(node.id);
                  select(node);
                  if (isFolder) toggle(node.id);
                }}
                style={{ height: rowHeight, paddingLeft: 8 + depth * indent }}
                className={cn(
                  "group/row relative flex cursor-pointer items-center gap-1.5 rounded-sm pr-2 outline-none",
                  "focus-visible:shadow-[inset_0_0_0_2px_var(--color-volt-ink)]",
                  isSelected ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {!isSelected && <span aria-hidden className="absolute inset-0 rounded-sm transition-colors group-hover/row:bg-surface-hover" />}
                {/* Indent guides */}
                {row.ancestors.map((a, level) => (
                  <span
                    key={a}
                    aria-hidden
                    style={{ left: 8 + level * indent + 7 }}
                    className={cn("absolute inset-y-0 w-px transition-colors duration-200", a === activeFolder ? "bg-border-strong" : "bg-border")}
                  />
                ))}
                {isSelected && (
                  <motion.span
                    layoutId={`${uid}-selected`}
                    aria-hidden
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 36 }}
                    className="absolute inset-0 rounded-sm bg-volt-soft"
                  />
                )}
                <span aria-hidden className="relative grid size-4 shrink-0 place-items-center">
                  {isFolder && (
                    <motion.span
                      initial={false}
                      animate={{ rotate: isOpen ? 90 : 0 }}
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 30 }}
                      className="grid place-items-center text-ink-subtle group-hover/row:text-ink"
                    >
                      <ChevronRight className="size-3.5" strokeWidth={2.25} />
                    </motion.span>
                  )}
                </span>
                <Icon aria-hidden className={cn("relative size-4 shrink-0", tint)} />
                <span className={cn("relative truncate", isSelected && "font-medium")}>{node.name}</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
