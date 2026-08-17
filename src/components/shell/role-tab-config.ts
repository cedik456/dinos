import type { SymbolViewProps } from "expo-symbols";

export type AppRole = "athlete" | "coach";

export type TabDefinition = {
  route: string;
  label: string;
  icon: SymbolViewProps["name"];
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
        android: "calendar_month",
        web: "calendar_month",
      },
    },
    {
      route: "progress",
      label: "Progress",
      icon: { ios: "chart.bar.fill", android: "bar_chart", web: "bar_chart" },
    },
    {
      route: "profile",
      label: "Profile",
      icon: {
        ios: "person.crop.circle",
        android: "account_circle",
        web: "account_circle",
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
