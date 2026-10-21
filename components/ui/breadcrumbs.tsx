"use client";

import * as React from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { ChevronRight, Home, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover } from "@/components/ui/popover";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  /** Leading glyph, e.g. a workspace logo or folder icon. */
  icon?: React.ReactNode;
  /** Show only the icon; the label stays available to screen readers. */
  iconOnly?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export interface BreadcrumbLinkProps {
  href: string;
  className: string;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
  onPointerEnter?: () => void;
  onFocus?: () => void;
  children: React.ReactNode;
}

export interface BreadcrumbsProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Trail from the root to the current page. The last item is the current page. */
  items: BreadcrumbItem[];
  separator?: "chevron" | "slash" | "dot";
  /** "text" = quiet links; "button" = pill crumbs with a hover highlight that glides between them. */
  variant?: "text" | "button";
  /** Prepend a home crumb (icon only). Pass an href, or true for "/". */
  home?: boolean | string;
  /** Collapse middle crumbs into a "…" menu when there are more than this many. */
  maxItems?: number;
  /** Crumbs kept before / after the collapsed group. */
  itemsBeforeCollapse?: number;
  itemsAfterCollapse?: number;
  /** Max width of a single label before it truncates (px). */
  maxLabelWidth?: number;
  /** Swap the anchor for your router's link (e.g. next/link). */
  renderLink?: (props: BreadcrumbLinkProps) => React.ReactNode;
  /** Accessible name of the nav landmark. */
  label?: string;
}

type Entry = { kind: "item"; item: BreadcrumbItem; index: number } | { kind: "collapsed"; items: BreadcrumbItem[] };

function Separator({ type }: { type: NonNullable<BreadcrumbsProps["separator"]> }) {
  if (type === "chevron") return <ChevronRight aria-hidden className="size-3.5 shrink-0 text-ink-subtle" strokeWidth={2} />;
  if (type === "slash") return <span aria-hidden className="shrink-0 select-none px-0.5 text-ink-subtle/70">/</span>;
  return <span aria-hidden className="mx-1 size-1 shrink-0 rounded-full bg-ink-subtle/70" />;
}

const defaultLink = ({ children, ...rest }: BreadcrumbLinkProps) => <a {...rest}>{children}</a>;

/** Location trail in a nav landmark with chevron, slash or dot separators, a collapsible middle and a gliding hover pill. */
export function Breadcrumbs({
  items: rawItems,
  separator = "chevron",
  variant = "text",
  home,
  maxItems = 5,
  itemsBeforeCollapse = 1,
  itemsAfterCollapse = 2,
  maxLabelWidth = 180,
  renderLink = defaultLink,
  label = "Breadcrumb",
  className,
  ...props
}: BreadcrumbsProps) {
  const reduce = useReducedMotion();
  const groupId = React.useId();
  const [hover, setHover] = React.useState<number | null>(null);

  const items = React.useMemo<BreadcrumbItem[]>(() => {
    if (!home) return rawItems;
    return [{ label: "Home", href: typeof home === "string" ? home : "/", icon: <Home className="size-4" strokeWidth={1.9} />, iconOnly: true }, ...rawItems];
  }, [home, rawItems]);

  const entries = React.useMemo<Entry[]>(() => {
    const all: Entry[] = items.map((item, index) => ({ kind: "item", item, index }));
    if (items.length <= maxItems || itemsBeforeCollapse + itemsAfterCollapse >= items.length) return all;
    return [
      ...all.slice(0, itemsBeforeCollapse),
      { kind: "collapsed", items: items.slice(itemsBeforeCollapse, items.length - itemsAfterCollapse) },
      ...all.slice(items.length - itemsAfterCollapse),
    ];
  }, [items, maxItems, itemsBeforeCollapse, itemsAfterCollapse]);

  const last = items.length - 1;
  const isButton = variant === "button";

  const crumbBase = cn(
    "relative inline-flex min-w-0 items-center gap-1.5 rounded-full text-sm font-medium outline-none transition-colors duration-150 focus-visible:shadow-[var(--focus-ring)]",
    isButton ? "h-8 px-2.5" : "h-7 px-1",
  );

  const highlight = (i: number) =>
    isButton && hover === i ? (
      <motion.span
        layoutId="crumb-hover"
        aria-hidden
        className="absolute inset-0 rounded-full bg-surface-hover"
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 36 }}
      />
    ) : null;

  const content = (item: BreadcrumbItem) => (
    <>
      {item.icon && <span className="relative inline-flex shrink-0 items-center [&_svg]:size-4">{item.icon}</span>}
      <span className={cn(item.iconOnly ? "sr-only" : "relative truncate")} style={item.iconOnly ? undefined : { maxWidth: maxLabelWidth }}>
        {item.label}
      </span>
    </>
  );

  return (
    <nav aria-label={label} className={cn("min-w-0", className)} {...props}>
      <LayoutGroup id={groupId}>
        <ol className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1" onPointerLeave={() => setHover(null)}>
          {entries.map((entry, pos) => {
            const sep = pos > 0 ? <Separator type={separator} /> : null;

            if (entry.kind === "collapsed") {
              const hiddenCount = entry.items.length;
              return (
                <li key="collapsed" className="flex items-center gap-1">
                  {sep}
                  <Popover
                    align="start"
                    label="Hidden pages"
                    className="min-w-[200px] p-1.5"
                    trigger={
                      <button
                        type="button"
                        aria-label={`Show ${hiddenCount} hidden ${hiddenCount === 1 ? "page" : "pages"}`}
                        onPointerEnter={() => setHover(-1)}
                        onFocus={() => setHover(-1)}
                        className={cn(crumbBase, "text-ink-muted hover:text-ink", !isButton && "hover:bg-surface-hover", isButton ? "w-8 justify-center px-0" : "w-7 justify-center")}
                      >
                        {highlight(-1)}
                        <MoreHorizontal aria-hidden className="relative size-4" />
                      </button>
                    }
                  >
                    {({ close }) => (
                      <ul
                        className="grid gap-0.5"
                        onKeyDown={(e) => {
                          if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                          e.preventDefault();
                          const links = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("a,button"));
                          const at = links.indexOf(document.activeElement as HTMLElement);
                          const next = e.key === "ArrowDown" ? (at + 1) % links.length : (at - 1 + links.length) % links.length;
                          links[next]?.focus();
                        }}
                      >
                        {entry.items.map((item) => (
                          <li key={item.label}>
                            {renderLink({
                              href: item.href ?? "#",
                              className:
                                "flex h-9 items-center gap-2 rounded-sm px-2.5 text-sm text-ink-muted outline-none transition-colors hover:bg-surface-hover hover:text-ink focus-visible:bg-surface-hover focus-visible:text-ink",
                              title: item.label.length > 28 ? item.label : undefined,
                              onClick: (e) => {
                                item.onClick?.(e);
                                close();
                              },
                              children: (
                                <>
                                  {item.icon && <span className="inline-flex shrink-0 [&_svg]:size-4">{item.icon}</span>}
                                  <span className="truncate">{item.label}</span>
                                </>
                              ),
                            })}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Popover>
                </li>
              );
            }

            const { item, index } = entry;
            const current = index === last;
            const title = !item.iconOnly && item.label.length > 24 ? item.label : undefined;

            return (
              <li key={`${index}-${item.label}`} className="flex min-w-0 items-center gap-1">
                {sep}
                {current || !item.href ? (
                  <span
                    aria-current={current ? "page" : undefined}
                    title={title}
                    className={cn(
                      crumbBase,
                      current ? "font-semibold text-ink" : "text-ink-muted",
                      current && isButton && "bg-surface-raised shadow-[inset_0_0_0_1px_var(--color-border)]",
                    )}
                  >
                    {content(item)}
                  </span>
                ) : (
                  renderLink({
                    href: item.href,
                    title,
                    onClick: item.onClick,
                    onPointerEnter: () => setHover(index),
                    onFocus: () => setHover(index),
                    className: cn(crumbBase, "text-ink-muted hover:text-ink", !isButton && "hover:underline hover:underline-offset-4 decoration-border-strong"),
                    children: (
                      <>
                        {highlight(index)}
                        {content(item)}
                      </>
                    ),
                  })
                )}
              </li>
            );
          })}
        </ol>
      </LayoutGroup>
    </nav>
  );
}
