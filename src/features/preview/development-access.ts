export type AppAccessMode = "preview" | "clerk";

type ResolveAppAccessModeOptions = {
  configuredMode?: string;
  isDevelopment: boolean;
};

export function resolveAppAccessMode({
  configuredMode,
  isDevelopment,
}: ResolveAppAccessModeOptions): AppAccessMode {
  if (!isDevelopment) return "clerk";

  return configuredMode === "clerk" ? "clerk" : "preview";
}

export const appAccessMode = resolveAppAccessMode({
  configuredMode: process.env.EXPO_PUBLIC_DINO_ACCESS_MODE,
  isDevelopment: __DEV__,
});
