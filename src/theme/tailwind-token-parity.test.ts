import { readFileSync } from "node:fs";
import { join } from "node:path";

import { colors, radii, spacing } from "@/theme/tokens";

function cssVariables(): Record<string, string> {
  const css = readFileSync(join(process.cwd(), "src/global.css"), "utf8");
  return Object.fromEntries(
    [...css.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((match) => [
      match[1],
      match[2].trim().toUpperCase(),
    ]),
  );
}

describe("Tailwind semantic token mirror", () => {
  it("matches the existing Dino colors, spacing, and radii", () => {
    const variables = cssVariables();
    expect(variables).toMatchObject({
      "color-background": colors.background,
      "color-surface": colors.surface,
      "color-surface-muted": colors.surfaceMuted,
      "color-foreground": colors.text,
      "color-muted": colors.textMuted,
      "color-border": colors.border,
      "color-accent": colors.accent,
      "color-accent-pressed": colors.accentPressed,
      "color-accent-soft": colors.accentSoft,
      "color-accent-foreground": colors.accentText,
      "color-success": colors.success,
      "color-success-soft": colors.successSoft,
      "color-warning": colors.warning,
      "color-warning-soft": colors.warningSoft,
      "color-danger": colors.danger,
      "color-danger-soft": colors.dangerSoft,
      "spacing-xs": `${spacing.xs}PX`,
      "spacing-sm": `${spacing.sm}PX`,
      "spacing-md": `${spacing.md}PX`,
      "spacing-lg": `${spacing.lg}PX`,
      "spacing-xl": `${spacing.xl}PX`,
      "spacing-2xl": `${spacing.xxl}PX`,
      "spacing-3xl": `${spacing.xxxl}PX`,
      "radius-small": `${radii.sm}PX`,
      "radius-medium": `${radii.md}PX`,
      "radius-card": `${radii.lg}PX`,
      "radius-panel": `${radii.xl}PX`,
      "radius-pill": `${radii.pill}PX`,
    });
  });
});
