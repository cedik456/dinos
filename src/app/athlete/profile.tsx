import { FeaturePlaceholder } from "@/components/shell/feature-placeholder";

export default function AthleteProfileRoute() {
  return (
    <FeaturePlaceholder
      title="Profile"
      description="Personal preferences and profile editing will arrive in a later approved gate."
      icon={{
        ios: "person.crop.circle",
        android: "account-circle",
        web: "account-circle",
      }}
    />
  );
}
