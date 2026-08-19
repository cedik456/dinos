import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ComponentProps } from "react";
import { Platform } from "react-native";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

export type IconName = {
  ios: SymbolViewProps["name"];
  android: MaterialIconName;
  web: MaterialIconName;
};

type IconProps = Omit<SymbolViewProps, "fallback" | "name"> & {
  name: IconName;
};

export function Icon({ name, size = 24, tintColor, ...props }: IconProps) {
  const fallbackName = Platform.OS === "web" ? name.web : name.android;

  return (
    <SymbolView
      {...props}
      name={name.ios}
      size={size}
      tintColor={tintColor}
      fallback={
        <MaterialIcons name={fallbackName} size={size} color={tintColor} />
      }
    />
  );
}
