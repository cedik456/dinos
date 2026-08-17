import { FeaturePlaceholder } from "@/components/shell/feature-placeholder";

export default function AthletePlanRoute() {
  return (
    <FeaturePlaceholder
      title="Plan"
      description="Assigned workouts and nutrition targets will live here once their workflows are approved."
      icon={{
        ios: "calendar",
        android: "calendar_month",
        web: "calendar_month",
      }}
    />
  );
}
