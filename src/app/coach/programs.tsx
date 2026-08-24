import { FeaturePlaceholder } from "@/components/shell/feature-placeholder";

export default function CoachProgramsRoute() {
  return (
    <FeaturePlaceholder
      title="Programs"
      description="Workout programming begins with the approved end-to-end workout phase."
      icon={{
        ios: "list.bullet.clipboard.fill",
        android: "assignment",
        web: "assignment",
      }}
    />
  );
}
