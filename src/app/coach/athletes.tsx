import { FeaturePlaceholder } from "@/components/shell/feature-placeholder";

export default function CoachAthletesRoute() {
  return (
    <FeaturePlaceholder
      title="Athletes"
      description="The connected roster and individual athlete workspace arrive with the identity phase."
      icon={{ ios: "person.2.fill", android: "group", web: "group" }}
    />
  );
}
