import { useNetInfo } from "@react-native-community/netinfo";
import type { NetInfoState } from "@react-native-community/netinfo";

export function isWorkoutOffline(
  state: Pick<NetInfoState, "isConnected" | "isInternetReachable">,
) {
  return state.isConnected === false || state.isInternetReachable === false;
}

export function useWorkoutOffline() {
  return isWorkoutOffline(useNetInfo());
}
