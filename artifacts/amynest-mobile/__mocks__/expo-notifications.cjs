// CommonJS shim for expo-notifications. Loaded via the
// Module._resolveFilename hook in
// __tests__/_onboarding-require-shim.ts so the screen's runtime
// require("expo-notifications") resolves here instead of the real
// (TS-source-only) package, which Node cannot strip from node_modules.
//
// State lives on globalThis.__notifMockState so tests can drive the
// permission scenarios behaviourally (undetermined / granted / denied).
"use strict";

const g = globalThis;

if (!g.__notifMockState) {
  g.__notifMockState = {
    status: "undetermined",
    canAskAgain: true,
    requestResult: "granted",
    scheduledIds: [],
  };
}

const state = g.__notifMockState;

function settings(s) {
  return {
    status: s,
    granted: s === "granted",
    canAskAgain: state.canAskAgain,
    expires: "never",
  };
}

async function getPermissionsAsync() {
  return settings(state.status);
}

async function requestPermissionsAsync() {
  state.status = state.requestResult;
  return settings(state.status);
}

async function setNotificationChannelAsync() {
  return null;
}

async function scheduleNotificationAsync() {
  const id = "scheduled-" + (state.scheduledIds.length + 1);
  state.scheduledIds.push(id);
  return id;
}

async function cancelAllScheduledNotificationsAsync() {
  state.scheduledIds = [];
}

const AndroidImportance = { DEFAULT: 3, HIGH: 4, MAX: 5 };
const SchedulableTriggerInputTypes = {
  CALENDAR: "calendar",
  DAILY: "daily",
  WEEKLY: "weekly",
  TIME_INTERVAL: "timeInterval",
  DATE: "date",
};

module.exports = {
  __esModule: true,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  scheduleNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  AndroidImportance,
  SchedulableTriggerInputTypes,
  default: {
    getPermissionsAsync,
    requestPermissionsAsync,
    setNotificationChannelAsync,
    scheduleNotificationAsync,
    cancelAllScheduledNotificationsAsync,
    AndroidImportance,
    SchedulableTriggerInputTypes,
  },
};
