/**
 * haptics.js
 *
 * Centralized haptic feedback utility.
 * Provides semantic methods so UI code reads naturally:
 *   haptic.light()    — tab switches, toggles, minor selections
 *   haptic.medium()   — button presses, card taps
 *   haptic.success()  — successful actions (upload, submit, login)
 *   haptic.warning()  — destructive confirmations, alerts
 *   haptic.error()    — failed actions
 *   haptic.selection() — picker / scroll snap
 *
 * On Android these map to vibration patterns; on iOS to the Taptic Engine.
 * Gracefully no-ops if the native module is unavailable (e.g. emulators).
 */

import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const options = {
  enableVibrateFallback: true,  // Use Vibration API as fallback on older Android
  ignoreAndroidSystemSettings: false,
};

const haptic = {
  /** Subtle tap — tab switches, toggles, minor selections */
  light: () => {
    try { ReactNativeHapticFeedback.trigger("impactLight", options); } catch (_) {}
  },

  /** Standard press — buttons, card taps, navigation actions */
  medium: () => {
    try { ReactNativeHapticFeedback.trigger("impactMedium", options); } catch (_) {}
  },

  /** Heavy thud — significant actions like starting/stopping sessions */
  heavy: () => {
    try { ReactNativeHapticFeedback.trigger("impactHeavy", options); } catch (_) {}
  },

  /** Success — login, upload complete, attendance submitted */
  success: () => {
    try { ReactNativeHapticFeedback.trigger("notificationSuccess", options); } catch (_) {}
  },

  /** Warning — destructive dialogs, session expiry, at-risk alerts */
  warning: () => {
    try { ReactNativeHapticFeedback.trigger("notificationWarning", options); } catch (_) {}
  },

  /** Error — failed API calls, validation errors */
  error: () => {
    try { ReactNativeHapticFeedback.trigger("notificationError", options); } catch (_) {}
  },

  /** Selection tick — picker changes, tab switches, scroll snapping */
  selection: () => {
    try { ReactNativeHapticFeedback.trigger("selection", { enableVibrateFallback: true, ignoreAndroidSystemSettings: true }); } catch (_) {}
  },
};

export default haptic;
