import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { colors, radii, spacing } from "@/theme/tokens";

type PreviewCardProps = {
  description: string;
  icon: IconName;
  onPress: () => void;
  title: string;
};

function PreviewCard({ description, icon, onPress, title }: PreviewCardProps) {
  return (
    <Card style={styles.previewCard}>
      <View style={styles.previewIcon}>
        <Icon
          name={icon}
          size={26}
          weight="semibold"
          tintColor={colors.accent}
        />
      </View>
      <View style={styles.previewCopy}>
        <Text variant="heading">{title}</Text>
        <Text tone="muted">{description}</Text>
      </View>
      <Button
        label={`Open ${title.toLowerCase()}`}
        trailingArrow
        onPress={onPress}
      />
    </Card>
  );
}

export function PreviewLauncherScreen() {
  const router = useRouter();

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.hero}>
        <Text variant="caption" tone="accent" style={styles.brand}>
          DINO
        </Text>
        <Text accessibilityRole="header" variant="display">
          Coaching, clearly connected.
        </Text>
        <Text tone="muted" style={styles.intro}>
          Explore Dino with deterministic Coach and Athlete preview data. No
          account is needed and nothing is saved.
        </Text>
      </View>

      <View style={styles.previewNotice}>
        <View style={styles.noticeDot} />
        <Text variant="label" tone="accent">
          Development preview · No account or saved data
        </Text>
      </View>

      <View style={styles.cards}>
        <PreviewCard
          title="Athlete preview"
          description="See today's workout, daily targets, recovery facts, and weekly progress."
          icon={{
            ios: "figure.strengthtraining.traditional",
            android: "fitness-center",
            web: "fitness-center",
          }}
          onPress={() => router.push("/athlete")}
        />
        <PreviewCard
          title="Coach preview"
          description="Review roster activity, weekly adherence, and athletes needing attention."
          icon={{ ios: "person.2.fill", android: "group", web: "group" }}
          onPress={() => router.push("/coach")}
        />
      </View>

      <Text variant="caption" tone="muted" style={styles.footer}>
        These local previews are intentionally separate. Production builds still
        use the role assigned by Dino and never show a role selector.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "center",
    gap: spacing.xxl,
  },
  hero: {
    gap: spacing.md,
  },
  brand: {
    letterSpacing: 2.2,
  },
  intro: {
    maxWidth: 520,
  },
  previewNotice: {
    minHeight: 40,
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
  },
  noticeDot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  cards: {
    gap: spacing.md,
  },
  previewCard: {
    gap: spacing.lg,
  },
  previewIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCopy: {
    gap: spacing.xs,
  },
  footer: {
    maxWidth: 560,
    textAlign: "center",
    alignSelf: "center",
  },
});
