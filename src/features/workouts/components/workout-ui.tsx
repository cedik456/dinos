import { ActivityIndicator, type TextInputProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "@/components/ui/tw";
import type { WorkoutStatus } from "@/features/workouts/workout-api";
import { colors, layout, spacing } from "@/theme/tokens";
import { cn } from "@/utils/cn";

export function WorkoutScreen({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="w-full self-center gap-2xl px-xl"
        contentContainerStyle={{
          maxWidth: layout.contentMaxWidth,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + 112,
        }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function WorkoutHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <View className="gap-sm py-sm">
      <Text className="font-sans text-caption font-semibold uppercase tracking-widest text-accent-foreground">
        {eyebrow}
      </Text>
      <Text
        accessibilityRole="header"
        className="font-sans text-display font-bold text-foreground"
      >
        {title}
      </Text>
      <Text className="max-w-[560px] font-sans text-body text-muted">
        {description}
      </Text>
    </View>
  );
}

export function WorkoutCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={cn(
        "gap-lg rounded-card border border-border bg-surface p-lg",
        className,
      )}
    >
      {children}
    </View>
  );
}

export function WorkoutButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        "min-h-12 flex-row items-center justify-center rounded-pill px-xl active:opacity-80",
        variant === "primary" && "bg-accent",
        variant === "secondary" && "border border-border bg-surface",
        variant === "danger" && "bg-danger",
        variant === "ghost" && "bg-transparent",
        disabled && "opacity-45",
      )}
    >
      <Text
        className={cn(
          "font-sans text-label font-semibold",
          variant === "primary" || variant === "danger"
            ? "text-inverse"
            : "text-foreground",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function WorkoutStatusBadge({ status }: { status: WorkoutStatus }) {
  const label =
    status === "assigned"
      ? "Assigned"
      : status === "completed"
        ? "Awaiting review"
        : "Reviewed";
  return (
    <View
      className={cn(
        "min-h-7 flex-row items-center gap-sm self-start rounded-pill px-sm",
        status === "assigned" && "bg-surface-muted",
        status === "completed" && "bg-warning-soft",
        status === "reviewed" && "bg-success-soft",
      )}
      accessibilityLabel={`Workout status: ${label}`}
    >
      <View
        accessibilityElementsHidden
        className={cn(
          "size-1.5 rounded-pill",
          status === "assigned" && "bg-muted",
          status === "completed" && "bg-warning",
          status === "reviewed" && "bg-success",
        )}
      />
      <Text
        className={cn(
          "font-sans text-caption font-semibold",
          status === "assigned" && "text-muted",
          status === "completed" && "text-warning",
          status === "reviewed" && "text-success",
        )}
      >
        {label}
      </Text>
    </View>
  );
}

export function WorkoutField({
  label,
  error,
  multiline,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View className="gap-sm">
      <Text className="font-sans text-label font-semibold text-foreground">
        {label}
      </Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        aria-invalid={Boolean(error)}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        className={cn(
          "min-h-12 rounded-medium border bg-surface px-md py-sm font-sans text-body text-foreground",
          multiline && "min-h-24 align-top",
          error ? "border-danger" : "border-border",
        )}
      />
      {error ? (
        <Text
          accessibilityRole="alert"
          className="font-sans text-caption text-danger"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function WorkoutLoading({ label }: { label: string }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      className="min-h-80 items-center justify-center gap-md"
    >
      <ActivityIndicator color={colors.accent} />
      <Text className="font-sans text-body text-muted">{label}</Text>
    </View>
  );
}

export function WorkoutMessage({
  title,
  message,
  actionLabel,
  onAction,
  tone = "neutral",
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "neutral" | "error" | "stale";
}) {
  return (
    <WorkoutCard
      className={cn(
        tone === "error" && "border-danger",
        tone === "stale" && "border-warning",
      )}
    >
      <Text className="font-sans text-heading font-bold text-foreground">
        {title}
      </Text>
      <Text className="font-sans text-body text-muted">{message}</Text>
      {actionLabel && onAction ? (
        <WorkoutButton
          label={actionLabel}
          variant="secondary"
          onPress={onAction}
        />
      ) : null}
    </WorkoutCard>
  );
}

export function formatWorkoutDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}
