import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useReducedTransparency() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then(setEnabled)
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setEnabled,
    );
    return () => subscription.remove();
  }, []);

  return enabled;
}
