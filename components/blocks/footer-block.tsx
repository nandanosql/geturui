"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Mail, Rss, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface FooterLink {
  label: string;
  href: string;
  /** Small label after the link, e.g. "New". */
  badge?: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterNewsletter {
  title: string;
  description?: string;
  placeholder?: string;
  /** Resolve to show the subscribed state; reject to show an error. */
  onSubscribe?: (email: string) => Promise<void> | void;
}

export interface FooterBlockProps {
  brand?: { name: string; description?: string; href?: string };
  /** Up to four columns read best on desktop. */
  columns?: FooterColumn[];
  /** Pass null to hide the newsletter form. */
  newsletter?: FooterNewsletter | null;
  /** Text on the base row, e.g. "© 2026 GetUrUI". */
  copyright?: string;
  legal?: FooterLink[];
  /** Status line with a pulsing dot. Pass null to hide. */
  status?: string | null;
  socials?: { label: string; href: string; icon: React.ReactNode }[];
  className?: string;
}

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Components", href: "#" },
      { label: "Blocks", href: "#", badge: "New" },
      { label: "Templates", href: "#" },
      { label: "Pricing", href: "#" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Documentation", href: "#" },
      { label: "CLI", href: "#" },
      { label: "MCP server", href: "#" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Motion guide", href: "#" },
      { label: "Design tokens", href: "#" },
      { label: "Showcase", href: "#" },
      { label: "Licence", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#", badge: "Hiring" },
      { label: "Contact", href: "#" },
    ],
  },
];

const DEFAULT_NEWSLETTER: FooterNewsletter = {
  title: "Get new components first",
  description: "One short email when something ships. No spam, unsubscribe any time.",
  placeholder: "you@company.com",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function Newsletter({ newsletter }: { newsletter: FooterNewsletter }) {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = React.useState<string | undefined>();
  const id = React.useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state !== "idle") return;
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    setError(undefined);
    setState("loading");
    try {
      if (newsletter.onSubscribe) await newsletter.onSubscribe(email.trim());
      else await new Promise((r) => setTimeout(r, 700));
      setState("done");
    } catch {
      setState("idle");
      setError("Something went wrong. Try again.");
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <h3 id={`${id}-title`} className="text-sm font-semibold text-ink">
          {newsletter.title}
        </h3>
        {newsletter.description && <p className="text-[13px] leading-5 text-ink-muted">{newsletter.description}</p>}
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        {state === "done" ? (
          <motion.p
            key="done"
            role="status"
            initial={{ opacity: 0, y: 6, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-volt-soft px-3 text-sm font-medium text-volt-ink"
          >
            <Check className="size-4" aria-hidden /> You are on the list
          </motion.p>
        ) : (
          <motion.form
            key="form"
            noValidate
            onSubmit={submit}
            aria-labelledby={`${id}-title`}
            exit={{ opacity: 0, y: -6, filter: "blur(8px)" }}
            transition={{ duration: 0.2 }}
          >
            <Input
              type="email"
              name="email"
              aria-label="Email address"
              placeholder={newsletter.placeholder ?? "you@company.com"}
              autoComplete="email"
              icon={<Mail className="size-4" aria-hidden />}
              value={email}
              error={error}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(undefined);
              }}
              className="pr-1"
              trailing={
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.92 }}
                  aria-label="Subscribe"
                  aria-busy={state === "loading" || undefined}
                  className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-volt text-on-volt outline-none transition-shadow hover:shadow-glow focus-visible:shadow-[var(--focus-ring)]"
                >
                  <motion.span animate={state === "loading" ? { x: [0, 4, 0] } : { x: 0 }} transition={{ duration: 0.6, repeat: state === "loading" ? Infinity : 0 }}>
                    <ArrowRight className="size-4" />
                  </motion.span>
                </motion.button>
              }
            />
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Site footer: brand blurb, four link columns, a newsletter field with an inline success state, and a base row with legal links and a live status dot. */
export function FooterBlock({
  brand = { name: "GetUrUI", description: "Animated React components and page blocks you copy into your app and make your own." },
  columns = DEFAULT_COLUMNS,
  newsletter = DEFAULT_NEWSLETTER,
  copyright = "© 2026 GetUrUI. All rights reserved.",
  legal = [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Cookies", href: "#" },
  ],
  status = "All systems normal",
  socials = [
    { label: "RSS feed", href: "#", icon: <Rss className="size-4" /> },
    { label: "Email us", href: "#", icon: <Mail className="size-4" /> },
    { label: "What's new", href: "#", icon: <Sparkles className="size-4" /> },
  ],
  className,
}: FooterBlockProps) {
  return (
    <footer className={cn("@container w-full border-t border-border bg-bg px-4 pt-14 sm:px-6 sm:pt-16", className)}>
      <div className="mx-auto grid max-w-6xl gap-12">
        <div className="grid gap-12 @4xl:grid-cols-[minmax(0,1.3fr)_minmax(0,2.7fr)] @4xl:gap-16">
          <div className="grid content-start gap-6">
            <a href={brand.href ?? "#"} className="inline-flex items-center gap-2.5 justify-self-start rounded-md outline-none focus-visible:shadow-[var(--focus-ring)]">
              <span aria-hidden className="grid size-8 place-items-center rounded-[10px] bg-volt font-display text-[15px] font-bold text-on-volt">
                {brand.name.charAt(0)}
              </span>
              <span className="font-display text-lg font-semibold tracking-[-0.3px] text-ink">{brand.name}</span>
            </a>
            {brand.description && <p className="max-w-xs text-sm leading-[22px] text-ink-muted">{brand.description}</p>}
            {newsletter && (
              <div className="max-w-sm">
                <Newsletter newsletter={newsletter} />
              </div>
            )}
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 @xl:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title} className="grid content-start gap-4">
                <h3 className="text-[13px] font-semibold text-ink">{col.title}</h3>
                <ul className="grid gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="group/link inline-flex items-center gap-2 rounded-xs text-sm text-ink-muted outline-none transition-colors hover:text-ink focus-visible:shadow-[var(--focus-ring)]"
                      >
                        <span className="transition-transform duration-300 ease-[var(--ease-spring)] group-hover/link:translate-x-0.5">{l.label}</span>
                        {l.badge && <Badge tone="new">{l.badge}</Badge>}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-border py-6 text-[13px] text-ink-subtle @xl:flex-row @xl:items-center @xl:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>{copyright}</span>
            {legal.map((l) => (
              <a key={l.label} href={l.href} className="rounded-xs outline-none transition-colors hover:text-ink focus-visible:shadow-[var(--focus-ring)]">
                {l.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {status && (
              <span className="inline-flex items-center gap-2 text-ink-muted">
                <span aria-hidden className="size-1.5 rounded-full bg-success text-success animate-pulse-dot" />
                {status}
              </span>
            )}
            {socials.length > 0 && (
              <div className="flex items-center gap-1">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="grid size-8 place-items-center rounded-full text-ink-subtle outline-none transition-colors hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)]"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
