import { Pressable, ScrollView, Text, View } from "@/components/ui/tw";

function FilterRow({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View className="gap-xs">
      <Text className="font-sans text-caption font-semibold text-muted">
        {label}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {["", ...values].map((value) => {
          const active = selected === value;
          return (
            <Pressable
              key={value || "all"}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(value)}
              className={
                active
                  ? "mr-sm min-h-12 justify-center rounded-pill bg-accent px-lg"
                  : "mr-sm min-h-12 justify-center rounded-pill border border-border bg-surface px-lg"
              }
            >
              <Text
                className={
                  active
                    ? "font-sans text-caption font-semibold text-surface"
                    : "font-sans text-caption font-semibold text-foreground"
                }
              >
                {value || "All"}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function ExerciseCatalogFilters({
  equipmentValues,
  muscleValues,
  equipment,
  primaryMuscle,
  onEquipment,
  onPrimaryMuscle,
}: {
  equipmentValues: string[];
  muscleValues: string[];
  equipment: string;
  primaryMuscle: string;
  onEquipment: (value: string) => void;
  onPrimaryMuscle: (value: string) => void;
}) {
  return (
    <View className="gap-md">
      <FilterRow
        label="Equipment"
        values={equipmentValues}
        selected={equipment}
        onSelect={onEquipment}
      />
      <FilterRow
        label="Primary muscle"
        values={muscleValues}
        selected={primaryMuscle}
        onSelect={onPrimaryMuscle}
      />
    </View>
  );
}
