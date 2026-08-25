import { useLocalSearchParams } from "expo-router";

import { WorkoutDetailScreen } from "@/features/workouts/workout-detail-screen";

export default function AthleteWorkoutDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkoutDetailScreen id={id} role="Athlete" />;
}
