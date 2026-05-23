import { vi } from "vitest";

export const readAsStringAsync = vi.fn().mockResolvedValue("");
export const writeAsStringAsync = vi.fn().mockResolvedValue(undefined);
export const deleteAsync = vi.fn().mockResolvedValue(undefined);
export const getInfoAsync = vi.fn().mockResolvedValue({ exists: false, isDirectory: false, uri: "" });
export const makeDirectoryAsync = vi.fn().mockResolvedValue(undefined);
export const copyAsync = vi.fn().mockResolvedValue(undefined);
export const moveAsync = vi.fn().mockResolvedValue(undefined);
export const downloadAsync = vi.fn().mockResolvedValue({ uri: "", status: 200, headers: {}, md5: "" });

export const documentDirectory = "file:///mock/documents/";
export const cacheDirectory = "file:///mock/cache/";
export const bundleDirectory = "file:///mock/bundle/";

export const EncodingType = {
  UTF8: "utf8",
  Base64: "base64",
} as const;
