import { Image, StyleSheet } from "react-native";

import { spacing } from "@/theme/tokens";

type DinoLogoProps = {
  size?: "compact" | "welcome";
};

const logoSize = {
  compact: spacing.xxxl,
  welcome: spacing.xxxl * 2,
} as const;

export function DinoLogo({ size = "compact" }: DinoLogoProps) {
  const dimension = logoSize[size];

  return (
    <Image
      accessible={false}
      source={require("../../../assets/branding/dino-mark.png")}
      resizeMode="contain"
      style={[styles.logo, { width: dimension, height: dimension }]}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    flexShrink: 0,
  },
});
