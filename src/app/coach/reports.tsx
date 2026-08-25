import { FeaturePlaceholder } from "@/components/shell/feature-placeholder";
import { AccountAccessCard } from "@/features/identity/account-access-card";

export default function CoachReportsRoute() {
  return (
    <FeaturePlaceholder
      title="Reports"
      description="Reliable weekly summaries will be implemented after workout and check-in data are real."
      icon={{
        ios: "doc.text.fill",
        android: "description",
        web: "description",
      }}
    >
      <AccountAccessCard />
    </FeaturePlaceholder>
  );
}
