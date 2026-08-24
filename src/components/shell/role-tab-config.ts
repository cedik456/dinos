import type { IconName } from "@/components/ui/icon";

export type AppRole = "athlete" | "coach";

export type TabDefinition = {
  route: string;
  label: string;
  icon: IconName;
};

export const roleTabs: Record<AppRole, readonly TabDefinition[]> = {
  athlete: [
    {
      route: "index",
      label: "Home",
      icon: { ios: "house.fill", android: "home", web: "home" },
    },
    {
      route: "plan",
      label: "Plan",
      icon: {
        ios: "calendar",
        android: "calendar-month",
        web: "calendar-month",
      },
    },
    {
      route: "progress",
      label: "Progress",
      icon: { ios: "chart.bar.fill", android: "bar-chart", web: "bar-chart" },
    },
    {
      route: "profile",
      label: "Profile",
      icon: {
        ios: "person.crop.circle",
        android: "account-circle",
        web: "account-circle",
      },
    },
  ],
  coach: [
    {
      route: "index",
      label: "Home",
      icon: { ios: "house.fill", android: "home", web: "home" },
    },
    {
      route: "athletes",
      label: "Athletes",
      icon: { ios: "person.2.fill", android: "group", web: "group" },
    },
    {
      route: "programs",
      label: "Programs",
      icon: {
        ios: "list.bullet.clipboard.fill",
        android: "assignment",
        web: "assignment",
      },
    },
    {
      route: "reports",
      label: "Reports",
      icon: {
        ios: "doc.text.fill",
        android: "description",
        web: "description",
      },
    },
  ],
};
