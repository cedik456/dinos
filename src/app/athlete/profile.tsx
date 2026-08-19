import { FeaturePlaceholder } from "@/components/shell/feature-placeholder";

export default function AthleteProfileRoute() {
  return (
    <FeaturePlaceholder
      title="Profile"
      description="Athlete details and app preferences will be added when account work begins."
      icon={{
        ios: "person.crop.circle",
        android: "account-circle",
        web: "account-circle",
      }}
    />
  );
}
