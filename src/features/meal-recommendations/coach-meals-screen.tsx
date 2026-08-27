import { useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal } from "react-native";

import { Pressable, ScrollView, Text, View } from "@/components/ui/tw";
import type { RosterAthlete } from "@/features/roster/roster-api";
import { useRosterAthletes } from "@/features/roster/roster-queries";
import {
  MEAL_KINDS,
  MEAL_UNITS,
  type CoachMealRecommendations,
  type MealKind,
  type MealRecommendationItemInput,
  type MealRecommendationMealInput,
  type MealUnit,
} from "@/features/meal-recommendations/meal-recommendations-api";
import {
  MealDaySelector,
  MealSelectedDayHeader,
  MealWeekNavigator,
} from "@/features/meal-recommendations/meal-recommendations-components";
import {
  useCoachMealRecommendations,
  useDeleteMealRecommendations,
  useSaveMealRecommendations,
} from "@/features/meal-recommendations/meal-recommendations-queries";
import {
  addDays,
  currentWeekStart,
  deviceTimeZone,
} from "@/features/weekly-progress/weekly-progress-date";
import { WorkoutApiError } from "@/features/workouts/workout-api";
import { useWorkoutActor } from "@/features/workouts/workout-auth";
import { useWorkoutOffline } from "@/features/workouts/workout-connectivity";
import {
  WorkoutButton,
  WorkoutCard,
  WorkoutField,
  WorkoutHeader,
  WorkoutLoading,
  WorkoutMessage,
  WorkoutScreen,
} from "@/features/workouts/components/workout-ui";
import { cn } from "@/utils/cn";

const KIND_LABELS: Record<MealKind, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
  custom: "Custom",
};

const KIND_ORDER: Record<Exclude<MealKind, "custom">, number> = {
  breakfast: 0,
  lunch: 1,
  snack: 2,
  dinner: 3,
};

type UnitTarget = { mealPosition: number; itemPosition: number } | null;

function serverMeals(
  data: CoachMealRecommendations | undefined,
): MealRecommendationMealInput[] {
  return (
    data?.days.flatMap((day) =>
      day.meals.map((meal) => ({
        dayOffset: meal.dayOffset,
        kind: meal.kind,
        customName: meal.customName,
        position: meal.position,
        items: meal.items.map((item) => ({
          name: item.name,
          amount: item.amount,
          unit: item.unit,
          position: item.position,
        })),
      })),
    ) ?? []
  );
}

function serialized(meals: MealRecommendationMealInput[]): string {
  return JSON.stringify(
    meals
      .map((meal) => ({
        ...meal,
        items: [...meal.items].sort((a, b) => a.position - b.position),
      }))
      .sort((a, b) => a.dayOffset - b.dayOffset || a.position - b.position),
  );
}

function reindexMeals(
  meals: MealRecommendationMealInput[],
): MealRecommendationMealInput[] {
  return meals.map((meal, position) => ({ ...meal, position }));
}

function reindexItems(
  items: MealRecommendationItemInput[],
): MealRecommendationItemInput[] {
  return items.map((item, position) => ({ ...item, position }));
}

function validateDraft(meals: MealRecommendationMealInput[]): string | null {
  if (meals.length === 0) return "Add at least one meal before saving.";
  const amountPattern = /^(?:0|[1-9]\d{0,6})(?:\.\d{1,3})?$/;
  for (const meal of meals) {
    if (meal.kind === "custom" && !meal.customName?.trim()) {
      return "Every custom meal needs a name.";
    }
    for (const item of meal.items) {
      if (!item.name.trim()) return "Every food item needs a name.";
      if (!amountPattern.test(item.amount) || Number(item.amount) <= 0) {
        return "Every food amount must be greater than zero with up to three decimal places.";
      }
    }
  }
  return null;
}

export function CoachMealsScreen() {
  const navigation = useNavigation();
  const { actor, ready } = useWorkoutActor("Coach");
  const offline = useWorkoutOffline();
  const timeZone = useMemo(deviceTimeZone, []);
  const currentStart = useMemo(() => currentWeekStart(timeZone), [timeZone]);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = addDays(currentStart, weekOffset * 7);
  const weekEnd = addDays(weekStart, 6);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(
    null,
  );
  const [draftMeals, setDraftMeals] = useState<MealRecommendationMealInput[]>(
    [],
  );
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{
    tone: "error" | "stale" | "neutral";
    title: string;
    body: string;
  } | null>(null);
  const [customMealName, setCustomMealName] = useState("");
  const [unitTarget, setUnitTarget] = useState<UnitTarget>(null);
  const roster = useRosterAthletes(actor, ready);
  const athletes = useMemo(
    () => roster.data?.pages.flatMap((page) => page.items) ?? [],
    [roster.data],
  );
  const query = useCoachMealRecommendations(actor, ready, selectedAthleteId, {
    weekStart,
    timeZone,
  });
  const save = useSaveMealRecommendations(actor!, selectedAthleteId ?? "");
  const remove = useDeleteMealRecommendations(actor!, selectedAthleteId ?? "");
  const unavailable = offline || query.isError;

  useEffect(() => {
    if (query.data && !dirty) setDraftMeals(serverMeals(query.data));
  }, [dirty, query.data]);

  const dayMeals = useMemo(
    () =>
      draftMeals
        .filter((meal) => meal.dayOffset === selectedDay)
        .sort((a, b) => a.position - b.position),
    [draftMeals, selectedDay],
  );

  const replaceDay = useCallback(
    (nextDayMeals: MealRecommendationMealInput[]) => {
      setDraftMeals((current) => [
        ...current.filter((meal) => meal.dayOffset !== selectedDay),
        ...reindexMeals(nextDayMeals).map((meal) => ({
          ...meal,
          dayOffset: selectedDay,
        })),
      ]);
      setDirty(true);
      setMessage(null);
    },
    [selectedDay],
  );

  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (!actor || !selectedAthleteId || !query.data) return false;
    const validation = validateDraft(draftMeals);
    if (validation) {
      setMessage({ tone: "error", title: "Check this week", body: validation });
      return false;
    }
    if (offline) {
      setMessage({
        tone: "stale",
        title: "Save unavailable offline",
        body: "Your edits remain here. Reconnect before saving.",
      });
      return false;
    }
    try {
      const saved = await save.mutateAsync({
        weekStart,
        timeZone,
        expectedVersion: query.data.version,
        meals: draftMeals,
      });
      setDraftMeals(serverMeals(saved));
      setDirty(false);
      setMessage({
        tone: "neutral",
        title: "Week saved",
        body: "The Athlete can see these recommendations now.",
      });
      return true;
    } catch (error) {
      if (error instanceof WorkoutApiError && error.status === 0) {
        const refreshed = await query.refetch();
        if (
          refreshed.data &&
          serialized(serverMeals(refreshed.data)) === serialized(draftMeals)
        ) {
          setDraftMeals(serverMeals(refreshed.data));
          setDirty(false);
          setMessage({
            tone: "neutral",
            title: "Save confirmed",
            body: "The response was interrupted, but Dino confirmed the week was saved.",
          });
          return true;
        }
        setMessage({
          tone: "stale",
          title: "Save result is uncertain",
          body: "Dino reloaded the server version. Your draft is still here for review.",
        });
        return false;
      }
      setMessage({
        tone: "error",
        title:
          error instanceof WorkoutApiError && error.status === 409
            ? "This week changed"
            : "Week not saved",
        body:
          error instanceof Error
            ? error.message
            : "Dino could not save this meal recommendation week.",
      });
      return false;
    }
  }, [
    actor,
    draftMeals,
    offline,
    query,
    save,
    selectedAthleteId,
    timeZone,
    weekStart,
  ]);

  const confirmChange = useCallback(
    (action: () => void) => {
      if (!dirty) {
        action();
        return;
      }
      Alert.alert(
        "Unsaved meal recommendations",
        "Save this week before leaving, or discard the changes.",
        [
          { text: "Keep editing", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: action },
          {
            text: "Save",
            onPress: () => {
              void saveDraft().then((saved) => {
                if (saved) action();
              });
            },
          },
        ],
      );
    },
    [dirty, saveDraft],
  );

  useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      if (!dirty) return;
      event.preventDefault();
      confirmChange(() => navigation.dispatch(event.data.action));
    });
  }, [confirmChange, dirty, navigation]);

  if (!actor || !ready) {
    return (
      <WorkoutScreen>
        <WorkoutLoading label="Preparing meal recommendations" />
      </WorkoutScreen>
    );
  }

  const chooseAthlete = (athlete: RosterAthlete) => {
    confirmChange(() => {
      setSelectedAthleteId(athlete.athleteAccountId);
      setDraftMeals([]);
      setDirty(false);
      setMessage(null);
      setSelectedDay(0);
    });
  };

  const chooseWeek = (nextOffset: number) => {
    confirmChange(() => {
      setWeekOffset(nextOffset);
      setSelectedDay(0);
      setDraftMeals([]);
      setDirty(false);
      setMessage(null);
    });
  };

  const addMeal = (kind: MealKind, customName: string | null = null) => {
    if (dayMeals.length >= 8) {
      setMessage({
        tone: "error",
        title: "Meal limit reached",
        body: "A day can contain up to eight meals.",
      });
      return;
    }
    const next = [...dayMeals];
    const meal: MealRecommendationMealInput = {
      dayOffset: selectedDay,
      kind,
      customName,
      position: next.length,
      items: [],
    };
    if (kind === "custom") {
      next.push(meal);
    } else {
      const rank = KIND_ORDER[kind];
      const insertAt = next.findIndex(
        (value) => value.kind !== "custom" && KIND_ORDER[value.kind] > rank,
      );
      next.splice(insertAt < 0 ? next.length : insertAt, 0, meal);
    }
    replaceDay(next);
    setCustomMealName("");
  };

  const updateMeal = (
    mealPosition: number,
    update: (meal: MealRecommendationMealInput) => MealRecommendationMealInput,
  ) =>
    replaceDay(
      dayMeals.map((meal) =>
        meal.position === mealPosition ? update(meal) : meal,
      ),
    );

  const updateItem = (
    mealPosition: number,
    itemPosition: number,
    update: (item: MealRecommendationItemInput) => MealRecommendationItemInput,
  ) =>
    updateMeal(mealPosition, (meal) => ({
      ...meal,
      items: meal.items.map((item) =>
        item.position === itemPosition ? update(item) : item,
      ),
    }));

  const selectedAthlete = athletes.find(
    (athlete) => athlete.athleteAccountId === selectedAthleteId,
  );

  return (
    <WorkoutScreen>
      <WorkoutHeader
        eyebrow="Meal recommendations"
        title="Plan one useful week"
        description="Give an Athlete clear daily guidance without turning meals into required tasks."
      />

      <WorkoutCard className="gap-md bg-accent-soft">
        <View className="gap-xs">
          <Text className="font-sans text-heading font-bold text-foreground">
            Athlete
          </Text>
          <Text className="font-sans text-body text-muted">
            Choose the active Athlete who will receive this week.
          </Text>
        </View>
        {actor.previewRole ? (
          <Text className="font-sans text-body text-muted">
            Meal recommendations use the live roster. Sign in with a Coach
            account to create them.
          </Text>
        ) : null}
        {!actor.previewRole && roster.isPending && athletes.length === 0 ? (
          <WorkoutLoading label="Loading active Athletes" />
        ) : null}
        {!actor.previewRole && roster.isError && athletes.length === 0 ? (
          <WorkoutMessage
            tone="error"
            title="Athletes unavailable"
            message="Dino could not load your active roster."
            actionLabel="Try again"
            onAction={() => void roster.refetch()}
          />
        ) : null}
        {athletes.length === 0 &&
        !actor.previewRole &&
        !roster.isPending &&
        !roster.isError ? (
          <Text className="font-sans text-body text-muted">
            No active Athletes yet. Accept an invitation before creating meal
            recommendations.
          </Text>
        ) : null}
        {athletes.length > 0 ? (
          <View className="flex-row flex-wrap gap-sm">
            {athletes.map((athlete) => {
              const selected = athlete.athleteAccountId === selectedAthleteId;
              return (
                <Pressable
                  key={athlete.athleteAccountId}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => chooseAthlete(athlete)}
                  className={cn(
                    "min-h-12 justify-center rounded-pill border px-lg active:opacity-80",
                    selected
                      ? "border-accent bg-accent"
                      : "border-border bg-surface",
                  )}
                >
                  <Text
                    className={cn(
                      "font-sans text-label font-semibold",
                      selected ? "text-inverse" : "text-foreground",
                    )}
                  >
                    {athlete.displayName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {roster.hasNextPage ? (
          <WorkoutButton
            label={roster.isFetchingNextPage ? "Loading" : "Load more Athletes"}
            variant="secondary"
            disabled={roster.isFetchingNextPage}
            onPress={() => void roster.fetchNextPage()}
          />
        ) : null}
      </WorkoutCard>

      {selectedAthleteId ? (
        <>
          <View className="gap-lg">
            <MealWeekNavigator
              startDate={weekStart}
              endDate={weekEnd}
              offset={weekOffset}
              onChange={chooseWeek}
            />
            <MealDaySelector
              weekStart={weekStart}
              selectedDay={selectedDay}
              onSelect={setSelectedDay}
            />
            <MealSelectedDayHeader
              date={addDays(weekStart, selectedDay)}
              previousDisabled={selectedDay === 0}
              nextDisabled={selectedDay === 6}
              onPrevious={() =>
                setSelectedDay((value) => Math.max(0, value - 1))
              }
              onNext={() => setSelectedDay((value) => Math.min(6, value + 1))}
            />
          </View>

          {query.isPending && !query.data && !unavailable ? (
            <WorkoutLoading
              label={`Loading ${selectedAthlete?.displayName ?? "Athlete"} meal recommendations`}
            />
          ) : null}
          {unavailable && !query.data ? (
            <WorkoutMessage
              tone="error"
              title="Meal recommendations unavailable"
              message="Dino could not load this week. Editing stays closed until the server responds."
              actionLabel="Try again"
              onAction={() => void query.refetch()}
            />
          ) : null}
          {unavailable && query.data ? (
            <WorkoutMessage
              tone="stale"
              title="Showing the last saved week"
              message="This plan may be out of date. Editing and deletion stay closed while offline."
              actionLabel="Retry"
              onAction={() => void query.refetch()}
            />
          ) : null}
          {message ? (
            <WorkoutMessage
              tone={message.tone}
              title={message.title}
              message={message.body}
              actionLabel={
                message.title === "This week changed"
                  ? "Reload server week"
                  : undefined
              }
              onAction={
                message.title === "This week changed"
                  ? () =>
                      Alert.alert(
                        "Discard this draft?",
                        "Reloading replaces the edits on this screen.",
                        [
                          { text: "Keep editing", style: "cancel" },
                          {
                            text: "Reload",
                            style: "destructive",
                            onPress: () => {
                              setDirty(false);
                              setDraftMeals(serverMeals(query.data));
                              setMessage(null);
                              void query.refetch();
                            },
                          },
                        ],
                      )
                  : undefined
              }
            />
          ) : null}

          {query.data ? (
            <WorkoutCard className="gap-xl">
              {!query.data.editable ? (
                <View className="rounded-medium bg-surface-muted p-md">
                  <Text className="font-sans text-body text-muted">
                    Past weeks are view only.
                  </Text>
                </View>
              ) : null}
              {dayMeals.length === 0 ? (
                <View className="min-h-28 items-center justify-center gap-sm">
                  <Text className="text-center font-sans text-heading font-bold text-foreground">
                    This day is open
                  </Text>
                  <Text className="text-center font-sans text-body text-muted">
                    Add only the meals you want to recommend.
                  </Text>
                </View>
              ) : null}

              {dayMeals.map((meal, mealIndex) => (
                <View
                  key={`${meal.kind}-${meal.position}`}
                  className={cn(
                    "gap-lg py-sm",
                    mealIndex > 0 && "border-t border-border pt-xl",
                  )}
                >
                  <View className="flex-row items-center justify-between gap-md">
                    <Text className="flex-1 font-sans text-caption font-semibold uppercase tracking-widest text-accent-foreground">
                      {meal.kind === "custom"
                        ? meal.customName
                        : KIND_LABELS[meal.kind]}
                    </Text>
                    {query.data.editable ? (
                      <Pressable
                        accessibilityLabel={`Remove ${meal.customName ?? KIND_LABELS[meal.kind]}`}
                        accessibilityRole="button"
                        onPress={() =>
                          replaceDay(
                            dayMeals.filter(
                              (value) => value.position !== meal.position,
                            ),
                          )
                        }
                        className="min-h-12 justify-center rounded-pill px-md active:opacity-80"
                      >
                        <Text className="font-sans text-label font-semibold text-danger">
                          Remove meal
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {meal.items.map((item) => (
                    <View
                      key={item.position}
                      className="gap-md rounded-medium bg-surface-muted p-md"
                    >
                      <WorkoutField
                        label="Food"
                        value={item.name}
                        editable={query.data.editable && !offline}
                        onChangeText={(name) =>
                          updateItem(meal.position, item.position, (value) => ({
                            ...value,
                            name,
                          }))
                        }
                        placeholder="Cooked rice"
                      />
                      <View className="flex-row items-end gap-md">
                        <View className="flex-1">
                          <WorkoutField
                            label="Amount"
                            value={item.amount}
                            editable={query.data.editable && !offline}
                            keyboardType="decimal-pad"
                            onChangeText={(amount) =>
                              updateItem(
                                meal.position,
                                item.position,
                                (value) => ({ ...value, amount }),
                              )
                            }
                            placeholder="150"
                          />
                        </View>
                        <View className="min-w-24 gap-sm">
                          <Text className="font-sans text-label font-semibold text-foreground">
                            Unit
                          </Text>
                          <Pressable
                            accessibilityLabel={`Unit ${item.unit}. Select unit`}
                            accessibilityRole="button"
                            disabled={!query.data.editable || offline}
                            onPress={() =>
                              setUnitTarget({
                                mealPosition: meal.position,
                                itemPosition: item.position,
                              })
                            }
                            className="min-h-12 items-center justify-center rounded-medium border border-border bg-surface px-md active:opacity-80"
                          >
                            <Text className="font-sans text-label font-semibold text-foreground">
                              {item.unit} ▾
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                      {query.data.editable ? (
                        <View className="flex-row flex-wrap gap-sm">
                          <SmallAction
                            label="Move up"
                            disabled={item.position === 0}
                            onPress={() =>
                              updateMeal(meal.position, (value) => {
                                const items = [...value.items];
                                const index = item.position;
                                [items[index - 1], items[index]] = [
                                  items[index],
                                  items[index - 1],
                                ];
                                return { ...value, items: reindexItems(items) };
                              })
                            }
                          />
                          <SmallAction
                            label="Move down"
                            disabled={item.position === meal.items.length - 1}
                            onPress={() =>
                              updateMeal(meal.position, (value) => {
                                const items = [...value.items];
                                const index = item.position;
                                [items[index], items[index + 1]] = [
                                  items[index + 1],
                                  items[index],
                                ];
                                return { ...value, items: reindexItems(items) };
                              })
                            }
                          />
                          <SmallAction
                            label="Remove food"
                            danger
                            onPress={() =>
                              updateMeal(meal.position, (value) => ({
                                ...value,
                                items: reindexItems(
                                  value.items.filter(
                                    (food) => food.position !== item.position,
                                  ),
                                ),
                              }))
                            }
                          />
                        </View>
                      ) : null}
                    </View>
                  ))}

                  {query.data.editable ? (
                    <WorkoutButton
                      label="Add food"
                      variant="secondary"
                      disabled={offline || meal.items.length >= 20}
                      onPress={() =>
                        updateMeal(meal.position, (value) => ({
                          ...value,
                          items: [
                            ...value.items,
                            {
                              name: "",
                              amount: "",
                              unit: "g",
                              position: value.items.length,
                            },
                          ],
                        }))
                      }
                    />
                  ) : null}
                </View>
              ))}

              {query.data.editable ? (
                <View className="gap-md border-t border-border pt-xl">
                  <Text className="font-sans text-heading font-bold text-foreground">
                    Add meal
                  </Text>
                  <View className="flex-row flex-wrap gap-sm">
                    {MEAL_KINDS.filter((kind) => kind !== "custom").map(
                      (kind) => {
                        const exists = dayMeals.some(
                          (meal) => meal.kind === kind,
                        );
                        return (
                          <SmallAction
                            key={kind}
                            label={KIND_LABELS[kind]}
                            disabled={exists || offline}
                            onPress={() => addMeal(kind)}
                          />
                        );
                      },
                    )}
                  </View>
                  <WorkoutField
                    label="Custom meal name"
                    value={customMealName}
                    editable={!offline}
                    onChangeText={setCustomMealName}
                    placeholder="Pre workout snack"
                    maxLength={60}
                  />
                  <WorkoutButton
                    label="Add custom meal"
                    variant="secondary"
                    disabled={!customMealName.trim() || offline}
                    onPress={() => addMeal("custom", customMealName.trim())}
                  />
                </View>
              ) : null}
            </WorkoutCard>
          ) : null}

          {query.data?.editable ? (
            <View className="gap-md">
              <WorkoutButton
                label={save.isPending ? "Saving week" : "Save week"}
                disabled={
                  !dirty || save.isPending || remove.isPending || offline
                }
                onPress={() => void saveDraft()}
              />
              {query.data.version !== null ? (
                <WorkoutButton
                  label={remove.isPending ? "Deleting week" : "Delete week"}
                  variant="danger"
                  disabled={save.isPending || remove.isPending || offline}
                  onPress={() =>
                    Alert.alert(
                      "Delete this meal recommendation week?",
                      "This permanently removes every meal and food item in the selected week.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete week",
                          style: "destructive",
                          onPress: () => {
                            void remove
                              .mutateAsync({
                                weekStart,
                                timeZone,
                                expectedVersion: query.data.version!,
                              })
                              .then(() => {
                                setDraftMeals([]);
                                setDirty(false);
                                setMessage({
                                  tone: "neutral",
                                  title: "Week deleted",
                                  body: "The meal recommendations were permanently removed.",
                                });
                              })
                              .catch((error: unknown) => {
                                setMessage({
                                  tone: "error",
                                  title: "Week not deleted",
                                  body:
                                    error instanceof Error
                                      ? error.message
                                      : "Dino could not delete this week.",
                                });
                              });
                          },
                        },
                      ],
                    )
                  }
                />
              ) : null}
              {dirty ? (
                <Text
                  accessibilityRole="alert"
                  className="text-center font-sans text-caption text-warning"
                >
                  Unsaved changes stay on this screen until you save or discard
                  them.
                </Text>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}

      <UnitPicker
        visible={unitTarget !== null}
        onClose={() => setUnitTarget(null)}
        onSelect={(unit) => {
          if (unitTarget) {
            updateItem(
              unitTarget.mealPosition,
              unitTarget.itemPosition,
              (item) => ({ ...item, unit }),
            );
          }
          setUnitTarget(null);
        }}
      />
    </WorkoutScreen>
  );
}

function SmallAction({
  label,
  onPress,
  disabled = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        "min-h-12 justify-center rounded-pill border border-border bg-surface px-md active:opacity-80",
        disabled && "opacity-40",
      )}
    >
      <Text
        className={cn(
          "font-sans text-label font-semibold text-foreground",
          danger && "text-danger",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function UnitPicker({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (unit: MealUnit) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-overlay px-xl pb-2xl">
        <View
          accessibilityRole="none"
          className="gap-lg rounded-card border border-border bg-surface p-xl"
        >
          <View className="flex-row items-center justify-between gap-md">
            <Text
              accessibilityRole="header"
              className="font-sans text-heading font-bold text-foreground"
            >
              Select unit
            </Text>
            <SmallAction label="Close" onPress={onClose} />
          </View>
          <ScrollView
            contentContainerClassName="flex-row flex-wrap gap-sm"
            keyboardShouldPersistTaps="handled"
          >
            {MEAL_UNITS.map((unit) => (
              <SmallAction
                key={unit}
                label={unit}
                onPress={() => onSelect(unit)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
