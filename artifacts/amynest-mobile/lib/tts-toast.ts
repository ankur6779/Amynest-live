import { Alert, Platform, ToastAndroid } from "react-native";

/** Brief user-visible TTS failure / retry notice (no silent failures). */
export function flashTtsToast(message: string): void {
  const msg = message.trim();
  if (!msg) return;
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
    return;
  }
  Alert.alert("Amy voice", msg);
}
