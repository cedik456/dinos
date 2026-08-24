import { FeaturePlaceholder } from "@/components/shell/feature-placeholder";

export default function AthleteProgressRoute() {
  return (
    <FeaturePlaceholder
      title="Progress"
      description="Workout consistency, volume, body weight, and recovery trends will appear here."
      icon={{ ios: "chart.bar.fill", android: "bar-chart", web: "bar-chart" }}
    />
  );
}
