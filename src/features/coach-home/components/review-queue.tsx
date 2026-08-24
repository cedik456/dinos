import { StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Text } from "@/components/ui/text";
import type { CoachReviewItem } from "@/data/mock/dashboards";
import { colors, radii, spacing } from "@/theme/tokens";

function AthleteReviewRow({ item }: { item: CoachReviewItem }) {
  return (
    <View
      accessibilityLabel={`${item.athleteName}, ${item.reason}`}
      style={styles.row}
    >
      <View style={styles.avatar}>
        <Text variant="caption" tone="accent">
          {item.initials}
        </Text>
      </View>
      <View style={styles.rowCopy}>
        <Text variant="bodyStrong">{item.athleteName}</Text>
        <Text variant="label" tone="muted">
          {item.reason}
        </Text>
        <View style={styles.rowMeta}>
          <Text variant="caption" tone="muted">
            {item.activity}
          </Text>
          <StatusBadge label={item.status} tone={item.tone} />
        </View>
      </View>
    </View>
  );
}

export function ReviewQueue({ items }: { items: CoachReviewItem[] }) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text variant="heading">Needs review</Text>
          <Text tone="muted">
            Recent athlete activity that needs your attention
          </Text>
        </View>
        <View style={styles.count}>
          <Text variant="label" tone="accent">
            {items.length}
          </Text>
        </View>
      </View>
      <View style={styles.list}>
        {items.map((item, index) => (
          <View key={item.id}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <AthleteReviewRow item={item} />
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  count: {
    minWidth: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    gap: spacing.md,
  },
  row: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  avatar: {
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  rowMeta: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  divider: {
    height: 1,
    marginBottom: spacing.md,
    backgroundColor: colors.border,
  },
});
