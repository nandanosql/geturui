# GetUrUI: free animated React components

Animated React components, blocks, charts and AI-chat UI built with **Tailwind CSS v4** and **Motion**. Install any piece with one shadcn CLI command and own the source. Every item supports light and dark themes, keyboard use and reduced motion.

**Live previews, docs and copy-paste code: [geturui.com](https://geturui.com)**

This repo is the free, MIT-licensed part of GetUrUI: 77 items and their variants.

## Install

1. Add the theme tokens once:

   ```bash
   npx shadcn@latest add https://geturui.com/r/theme.json
   ```

   Then add `@import "./geturui.css";` after `@import "tailwindcss";` in your `globals.css`.

2. Add any component:

   ```bash
   npx shadcn@latest add https://geturui.com/r/tabs.json
   ```

The CLI writes the source into `components/ui/`, `components/blocks/` and the other folders below. It's plain code you can edit.

You can also copy files straight from this repo. Each one needs `motion`, `lucide-react`, `clsx` and `tailwind-merge`, plus `lib/utils.ts` and `app/geturui.css`.

## Use with AI coding agents

GetUrUI has an MCP server and an [llms.txt](https://geturui.com/llms.txt), so Cursor, Claude Code and other agents can search the catalog and install components for you. See [For coding agents](https://geturui.com/docs/agents).

## What's inside

### Components (47)

| Component | Install |
| --- | --- |
| [Alert](https://geturui.com/docs/alert) | `npx shadcn@latest add https://geturui.com/r/alert.json` |
| [Animated Badge](https://geturui.com/docs/badge) | `npx shadcn@latest add https://geturui.com/r/badge.json` |
| [Animated Context Menu](https://geturui.com/docs/context-menu) | `npx shadcn@latest add https://geturui.com/r/context-menu.json` |
| [Avatar](https://geturui.com/docs/avatar) | `npx shadcn@latest add https://geturui.com/r/avatar.json` |
| [Bottom Sheet](https://geturui.com/docs/bottom-sheet) | `npx shadcn@latest add https://geturui.com/r/bottom-sheet.json` |
| [Bouncy Accordion](https://geturui.com/docs/accordion) | `npx shadcn@latest add https://geturui.com/r/accordion.json` |
| [Breadcrumbs](https://geturui.com/docs/breadcrumbs) | `npx shadcn@latest add https://geturui.com/r/breadcrumbs.json` |
| [Button](https://geturui.com/docs/button) | `npx shadcn@latest add https://geturui.com/r/button.json` |
| [Calendar](https://geturui.com/docs/calendar) | `npx shadcn@latest add https://geturui.com/r/calendar.json` |
| [Card Input](https://geturui.com/docs/card-input) | `npx shadcn@latest add https://geturui.com/r/card-input.json` |
| [Checkbox](https://geturui.com/docs/checkbox) | `npx shadcn@latest add https://geturui.com/r/checkbox.json` |
| [Combobox](https://geturui.com/docs/combobox) | `npx shadcn@latest add https://geturui.com/r/combobox.json` |
| [Command Palette](https://geturui.com/docs/command-palette) | `npx shadcn@latest add https://geturui.com/r/command-palette.json` |
| [Copy Button](https://geturui.com/docs/copy-button) | `npx shadcn@latest add https://geturui.com/r/copy-button.json` |
| [Date picker](https://geturui.com/docs/date-picker) | `npx shadcn@latest add https://geturui.com/r/date-picker.json` |
| [Dialog](https://geturui.com/docs/dialog) | `npx shadcn@latest add https://geturui.com/r/dialog.json` |
| [Dock](https://geturui.com/docs/dock) | `npx shadcn@latest add https://geturui.com/r/dock.json` |
| [Drawer](https://geturui.com/docs/drawer) | `npx shadcn@latest add https://geturui.com/r/drawer.json` |
| [Dropdown Menu](https://geturui.com/docs/dropdown) | `npx shadcn@latest add https://geturui.com/r/dropdown.json` |
| [Field](https://geturui.com/docs/field) | `npx shadcn@latest add https://geturui.com/r/field.json` |
| [File Tree](https://geturui.com/docs/file-tree) | `npx shadcn@latest add https://geturui.com/r/file-tree.json` |
| [Input](https://geturui.com/docs/input) | `npx shadcn@latest add https://geturui.com/r/input.json` |
| [Marquee](https://geturui.com/docs/marquee) | `npx shadcn@latest add https://geturui.com/r/marquee.json` |
| [Morph Label](https://geturui.com/docs/morph-label) | `npx shadcn@latest add https://geturui.com/r/morph-label.json` |
| [Number Input](https://geturui.com/docs/number-input) | `npx shadcn@latest add https://geturui.com/r/number-input.json` |
| [OTP Input](https://geturui.com/docs/otp-input) | `npx shadcn@latest add https://geturui.com/r/otp-input.json` |
| [Odometer Number](https://geturui.com/docs/number-ticker) | `npx shadcn@latest add https://geturui.com/r/number-ticker.json` |
| [Origin Modal](https://geturui.com/docs/morphing-modal) | `npx shadcn@latest add https://geturui.com/r/morphing-modal.json` |
| [Pagination](https://geturui.com/docs/pagination) | `npx shadcn@latest add https://geturui.com/r/pagination.json` |
| [Password Input](https://geturui.com/docs/password-input) | `npx shadcn@latest add https://geturui.com/r/password-input.json` |
| [Popover](https://geturui.com/docs/popover) | `npx shadcn@latest add https://geturui.com/r/popover.json` |
| [Radio group](https://geturui.com/docs/radio-group) | `npx shadcn@latest add https://geturui.com/r/radio-group.json` |
| [Range Slider](https://geturui.com/docs/range-slider) | `npx shadcn@latest add https://geturui.com/r/range-slider.json` |
| [Select](https://geturui.com/docs/select) | `npx shadcn@latest add https://geturui.com/r/select.json` |
| [Spinner](https://geturui.com/docs/spinner) | `npx shadcn@latest add https://geturui.com/r/spinner.json` |
| [Stepper](https://geturui.com/docs/stepper) | `npx shadcn@latest add https://geturui.com/r/stepper.json` |
| [Switch](https://geturui.com/docs/switch) | `npx shadcn@latest add https://geturui.com/r/switch.json` |
| [Tabs](https://geturui.com/docs/tabs) | `npx shadcn@latest add https://geturui.com/r/tabs.json` |
| [Tag group](https://geturui.com/docs/tag-group) | `npx shadcn@latest add https://geturui.com/r/tag-group.json` |
| [Tag input](https://geturui.com/docs/tag-input) | `npx shadcn@latest add https://geturui.com/r/tag-input.json` |
| [Tag select](https://geturui.com/docs/tag-select) | `npx shadcn@latest add https://geturui.com/r/tag-select.json` |
| [Text Animation](https://geturui.com/docs/text-animation) | `npx shadcn@latest add https://geturui.com/r/text-animation.json` |
| [Textarea](https://geturui.com/docs/textarea) | `npx shadcn@latest add https://geturui.com/r/textarea.json` |
| [Theme Toggle](https://geturui.com/docs/theme-toggle) | `npx shadcn@latest add https://geturui.com/r/theme-toggle.json` |
| [Tilt Card](https://geturui.com/docs/tilt-card) | `npx shadcn@latest add https://geturui.com/r/tilt-card.json` |
| [Toasts](https://geturui.com/docs/toast) | `npx shadcn@latest add https://geturui.com/r/toast.json` |
| [Tooltip](https://geturui.com/docs/tooltip) | `npx shadcn@latest add https://geturui.com/r/tooltip.json` |

### Blocks (10)

| Component | Install |
| --- | --- |
| [CTA Banner](https://geturui.com/docs/cta-banner) | `npx shadcn@latest add https://geturui.com/r/cta-banner.json` |
| [FAQ](https://geturui.com/docs/faq-section) | `npx shadcn@latest add https://geturui.com/r/faq-section.json` |
| [Feature Grid](https://geturui.com/docs/feature-grid) | `npx shadcn@latest add https://geturui.com/r/feature-grid.json` |
| [Footer](https://geturui.com/docs/footer-block) | `npx shadcn@latest add https://geturui.com/r/footer-block.json` |
| [Hero](https://geturui.com/docs/hero-section) | `npx shadcn@latest add https://geturui.com/r/hero-section.json` |
| [Logo Cloud](https://geturui.com/docs/logo-cloud) | `npx shadcn@latest add https://geturui.com/r/logo-cloud.json` |
| [Pricing](https://geturui.com/docs/pricing-section) | `npx shadcn@latest add https://geturui.com/r/pricing-section.json` |
| [Sign Up Form](https://geturui.com/docs/sign-up-form) | `npx shadcn@latest add https://geturui.com/r/sign-up-form.json` |
| [Stats](https://geturui.com/docs/stats-section) | `npx shadcn@latest add https://geturui.com/r/stats-section.json` |
| [Testimonials](https://geturui.com/docs/testimonials-wall) | `npx shadcn@latest add https://geturui.com/r/testimonials-wall.json` |

### AI interfaces (5)

| Component | Install |
| --- | --- |
| [Citations](https://geturui.com/docs/citations) | `npx shadcn@latest add https://geturui.com/r/citations.json` |
| [Code Block](https://geturui.com/docs/code-block) | `npx shadcn@latest add https://geturui.com/r/code-block.json` |
| [Message Bubble](https://geturui.com/docs/message-bubble) | `npx shadcn@latest add https://geturui.com/r/message-bubble.json` |
| [Prompt Input](https://geturui.com/docs/prompt-input) | `npx shadcn@latest add https://geturui.com/r/prompt-input.json` |
| [Token Stream](https://geturui.com/docs/streaming-response) | `npx shadcn@latest add https://geturui.com/r/streaming-response.json` |

### Charts (4)

| Component | Install |
| --- | --- |
| [Donut Chart](https://geturui.com/docs/donut-chart) | `npx shadcn@latest add https://geturui.com/r/donut-chart.json` |
| [Funnel Chart](https://geturui.com/docs/funnel-chart) | `npx shadcn@latest add https://geturui.com/r/funnel-chart.json` |
| [Share of Total Chart](https://geturui.com/docs/composition-chart) | `npx shadcn@latest add https://geturui.com/r/composition-chart.json` |
| [Sparkline Stats](https://geturui.com/docs/sparkline-stats) | `npx shadcn@latest add https://geturui.com/r/sparkline-stats.json` |

### Examples (11)

| Component | Install |
| --- | --- |
| [Blog cards](https://geturui.com/docs/blog-cards) | `npx shadcn@latest add https://geturui.com/r/blog-cards.json` |
| [Chat bubbles](https://geturui.com/docs/chat-bubbles) | `npx shadcn@latest add https://geturui.com/r/chat-bubbles.json` |
| [Integration cards](https://geturui.com/docs/integration-cards) | `npx shadcn@latest add https://geturui.com/r/integration-cards.json` |
| [Line charts](https://geturui.com/docs/line-charts) | `npx shadcn@latest add https://geturui.com/r/line-charts.json` |
| [Review cards](https://geturui.com/docs/review-cards) | `npx shadcn@latest add https://geturui.com/r/review-cards.json` |
| [Social posts](https://geturui.com/docs/social-posts) | `npx shadcn@latest add https://geturui.com/r/social-posts.json` |
| [Stat cards](https://geturui.com/docs/stat-cards) | `npx shadcn@latest add https://geturui.com/r/stat-cards.json` |
| [Switch cards](https://geturui.com/docs/switch-cards) | `npx shadcn@latest add https://geturui.com/r/switch-cards.json` |
| [Theme switchers](https://geturui.com/docs/theme-switchers) | `npx shadcn@latest add https://geturui.com/r/theme-switchers.json` |
| [User menus](https://geturui.com/docs/user-menus) | `npx shadcn@latest add https://geturui.com/r/user-menus.json` |
| [Welcome cards](https://geturui.com/docs/welcome-cards) | `npx shadcn@latest add https://geturui.com/r/welcome-cards.json` |

## Want more?

[GetUrUI Pro](https://geturui.com/pricing) adds 226 more designs, 31 full templates (SaaS, dashboards, commerce, docs, wellness) and Background Studio, for a one-time $149.

## License

MIT. See [LICENSE](LICENSE). Built by a solo maker, [@nandanpri](https://x.com/nandanpri) on X.
