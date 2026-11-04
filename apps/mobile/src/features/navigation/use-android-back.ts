import { useEffect } from "react";
import { BackHandler } from "react-native";
/** Subscreens register after their parent, so native back follows visible depth. */
export function useAndroidBack(enabled: boolean, onBack: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { onBack(); return true; });
    return () => subscription.remove();
  }, [enabled, onBack]);
}
