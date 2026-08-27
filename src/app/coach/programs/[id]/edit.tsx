import { useLocalSearchParams } from "expo-router";

import { WorkoutEditorScreen } from "@/features/workouts/workout-editor-screen";

export default function EditWorkoutRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkoutEditorScreen assignmentId={id} />;
}
