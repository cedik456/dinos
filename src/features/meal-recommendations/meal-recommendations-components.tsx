import { Pressable, ScrollView, Text, View } from "@/components/ui/tw";
import type { MealRecommendationDay } from "@/features/meal-recommendations/meal-recommendations-api";
import {
  formatDay,
  formatShortDate,
} from "@/features/weekly-progress/weekly-progress-date";
import { WorkoutCard } from "@/features/workouts/components/workout-ui";
import { cn } from "@/utils/cn";

export function MealWeekNavigator({
  startDate,
  endDate,
  offset,
  onChange,
  minimumOffset,
  maximumOffset,
}: {
  startDate: string;
  endDate: string;
  offset: number;
  onChange: (offset: number) => void;
  minimumOffset?: number;
  maximumOffset?: number;
}) {
  const previousDisabled =
    minimumOffset !== undefined && offset <= minimumOffset;
  const nextDisabled = maximumOffset !== undefined && offset >= maximumOffset;
  return (
    <View className="flex-row items-center justify-between gap-md">
      <Pressable
        accessibilityLabel="Previous week"
        accessibilityRole="button"
        accessibilityState={{ disabled: previousDisabled }}
        disabled={previousDisabled}
        onPress={() => onChange(offset - 1)}
        className={cn(
          "min-h-12 min-w-12 items-center justify-center rounded-pill border border-border bg-surface active:opacity-80",
          previousDisabled && "opacity-40",
        )}
      >
        <Text className="font-sans text-heading font-bold text-foreground">
          ‹
        </Text>
      </Pressable>
      <View className="flex-1 items-center gap-xs">
        <Text className="font-sans text-label font-semibold text-foreground">
          {offset === 0
            ? "This week"
            : offset < 0
              ? "Previous week"
              : "Future week"}
        </Text>
        <Text className="text-center font-sans text-caption text-muted">
          {formatShortDate(startDate)} to {formatShortDate(endDate)}
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Next week"
        accessibilityRole="button"
        accessibilityState={{ disabled: nextDisabled }}
        disabled={nextDisabled}
        onPress={() => onChange(offset + 1)}
        className={cn(
          "min-h-12 min-w-12 items-center justify-center rounded-pill border border-border bg-surface active:opacity-80",
          nextDisabled && "opacity-40",
        )}
      >
        <Text className="font-sans text-heading font-bold text-foreground">
          ›
        </Text>
      </Pressable>
    </View>
  );
}

export function MealDaySelector({
  weekStart,
  selectedDay,
  onSelect,
}: {
  weekStart: string;
  selectedDay: number;
  onSelect: (dayOffset: number) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-sm"
      accessibilityRole="tablist"
    >
      {Array.from({ length: 7 }, (_, dayOffset) => {
        const date = addDay(weekStart, dayOffset);
        const selected = selectedDay === dayOffset;
        return (
          <Pressable
            key={date}
            accessibilityLabel={`${formatDay(date)}, ${formatShortDate(date)}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(dayOffset)}
            className={cn(
              "min-h-14 min-w-12 items-center justify-center gap-xs rounded-medium border px-sm active:opacity-80",
              selected
                ? "border-accent bg-accent-soft"
                : "border-border bg-surface",
            )}
          >
            <Text
              className={cn(
                "font-sans text-caption font-semibold",
                selected ? "text-accent-foreground" : "text-muted",
              )}
            >
              {formatDay(date).slice(0, 1)}
            </Text>
            <Text
              className={cn(
                "font-sans text-label font-semibold",
                selected ? "text-foreground" : "text-muted",
              )}
            >
              {Number(date.slice(-2))}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function MealSelectedDayHeader({
  date,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
}: {
  date: string;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled: boolean;
  nextDisabled: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between gap-md">
      <Pressable
        accessibilityLabel="Previous day"
        accessibilityRole="button"
        accessibilityState={{ disabled: previousDisabled }}
        disabled={previousDisabled}
        onPress={onPrevious}
        className={cn(
          "min-h-12 min-w-12 items-center justify-center rounded-pill active:opacity-80",
          previousDisabled && "opacity-35",
        )}
      >
        <Text className="font-sans text-heading font-bold text-foreground">
          ‹
        </Text>
      </Pressable>
      <Text className="flex-1 text-center font-sans text-label font-semibold text-foreground">
        {formatLongDate(date)}
      </Text>
      <Pressable
        accessibilityLabel="Next day"
        accessibilityRole="button"
        accessibilityState={{ disabled: nextDisabled }}
        disabled={nextDisabled}
        onPress={onNext}
        className={cn(
          "min-h-12 min-w-12 items-center justify-center rounded-pill active:opacity-80",
          nextDisabled && "opacity-35",
        )}
      >
        <Text className="font-sans text-heading font-bold text-foreground">
          ›
        </Text>
      </Pressable>
    </View>
  );
}

export function MealDailyReadView({ day }: { day: MealRecommendationDay }) {
  return (
    <WorkoutCard className="gap-0 px-lg py-md">
      {day.coachDisplayName ? (
        <Text className="pb-md font-sans text-caption text-muted">
          Recommended by {day.coachDisplayName}
        </Text>
      ) : null}
      {day.meals.length === 0 ? (
        <View className="min-h-36 items-center justify-center gap-sm py-xl">
          <Text className="text-center font-sans text-heading font-bold text-foreground">
            No meals recommended
          </Text>
          <Text className="max-w-[420px] text-center font-sans text-body text-muted">
            Your Coach left this day open. There is nothing to complete or log.
          </Text>
        </View>
      ) : (
        day.meals.map((meal, mealIndex) => (
          <View
            key={meal.id}
            className={cn(
              "gap-md py-lg",
              mealIndex > 0 && "border-t border-border",
            )}
          >
            <Text className="font-sans text-caption font-semibold uppercase tracking-widest text-accent-foreground">
              {meal.displayName}
            </Text>
            {meal.items.length === 0 ? (
              <Text className="font-sans text-body text-muted">
                No food items listed.
              </Text>
            ) : (
              meal.items.map((item) => (
                <View
                  key={item.id}
                  className="min-h-10 flex-row items-baseline justify-between gap-lg"
                >
                  <Text className="flex-1 font-sans text-body text-foreground">
                    {item.name}
                  </Text>
                  <Text className="font-sans text-label font-semibold text-foreground">
                    {item.amount} {item.unit}
                  </Text>
                </View>
              ))
            )}
          </View>
        ))
      )}
    </WorkoutCard>
  );
}

function addDay(value: string, amount: number): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount))
    .toISOString()
    .slice(0, 10);
}

function formatLongDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}
