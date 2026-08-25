import { FeaturePlaceholder } from "@/components/shell/feature-placeholder";
import { AccountAccessCard } from "@/features/identity/account-access-card";

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
    >
      <AccountAccessCard />
    </FeaturePlaceholder>
  );
}
