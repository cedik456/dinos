import { useLocalSearchParams } from "expo-router";

import { TemplateAssignmentScreen } from "@/features/workouts/template-assignment-screen";

export default function AssignTemplateRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TemplateAssignmentScreen templateId={id ?? ""} />;
}
