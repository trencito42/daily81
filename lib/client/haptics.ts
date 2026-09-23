/**
 * Mobile haptic feedback helper with feature detection.
 */

export function triggerHaptic(type: "tap" | "note" | "mistake" | "complete" = "tap", enabled: boolean = true) {
  if (!enabled || typeof window === "undefined" || !("vibrate" in navigator)) {
    return;
  }

  try {
    switch (type) {
      case "tap":
        navigator.vibrate(8);
        break;
      case "note":
        navigator.vibrate(5);
        break;
      case "mistake":
        navigator.vibrate([15, 40, 15]);
        break;
      case "complete":
        navigator.vibrate([25, 60, 35, 60, 50]);
        break;
    }
  } catch {
    // Unsupported or permission denied
  }
}
