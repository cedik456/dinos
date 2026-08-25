---
name: dino-athletic-coaching-system
source: extracted-from-code
character: "Calm athletic utility with warm neutral surfaces, forest green actions, compact status language, and soft depth. Coach views are dense and review focused, while Athlete views make the next useful action immediately clear."
tokens: "Real values live in src/theme/tokens.ts and are mirrored for Tailwind in src/global.css. Read them there and never duplicate them here."
contrast: "Use the existing semantic token contract and keep normal text at WCAG AA contrast, controls at 3 to 1, and status meaning visible in text as well as color."
---

## Build mandate

You are building a clean, modern coaching product for a phone first experience. Every screen should feel complete and useful, with clear context, deliberate hierarchy, real Dino copy, and visible loading, empty, retry, validation, conflict, and unavailable states where the feature requires them.

## Character and direction

Dino feels strong, calm, and approachable. Warm off white backgrounds support white modular cards, forest green primary actions, soft green status surfaces, and restrained shadows. Rounded shapes feel friendly without becoming playful. The visual language stays athletic through compact information, decisive action labels, and clear progress rather than decoration.

Do not use literal dinosaurs, mascots, fossils, footprints, eggs, scales, emoji, or novelty prehistoric imagery. Use the Dino wordmark, initials, platform icons, useful status marks, and information hierarchy instead.

## Composition patterns

Use the existing centered phone content column and floating glass tab bar. Keep generous safe area spacing and enough bottom inset for navigation.

Start screens with clear context through the existing page header pattern. Group related information in modular cards with compact section headers. Keep date navigation close to workout status and actions. Use short summaries in lists, then reveal the full ordered exercise content on the detail screen.

Athlete surfaces should lead with today, eligibility, and the next action. Coach surfaces should prioritize compact assignment management and the oldest completed work that needs review. Forms should use grouped labelled sections, supporting guidance, persistent entered content, inline validation, and one clear save action.

## Component and usage rules

Use the accent color for primary actions, current selection, and useful emphasis. Do not use it as decoration across large areas.

Use semantic classes and semantic tokens. Do not place raw palette values in workout components. Existing screens may keep `StyleSheet`. New workout components should use the CSS enabled primitives in `src/components/ui/tw/` with Tailwind classes. A component should not mix Tailwind and `StyleSheet` for ordinary layout and appearance.

Cards use soft radii, a quiet border or restrained shadow, and purposeful internal spacing. Buttons and pressable rows provide at least a 48 dp target. Status always includes readable text, never color alone. Decorative icons stay hidden from assistive technology. Interactive icons have clear accessible labels.

Use the system font and the existing text hierarchy. Keep body copy concise and readable. Use uppercase captions sparingly for compact category labels, not paragraphs.

## Responsive and accessibility direction

Design from the narrow phone width first, while preserving the existing centered maximum content width for tablets and web. Ordered exercise rows may stack on narrow screens. Controls should remain reachable without horizontal scrolling.

Use real platform action and navigation primitives. Every field keeps a persistent label. Announce errors and status changes through the platform accessibility API. Preserve visible focus on web. Respect reduced motion and reduced transparency. Keep touch targets at least 48 dp and maintain enough bottom inset to clear the floating navigation.
