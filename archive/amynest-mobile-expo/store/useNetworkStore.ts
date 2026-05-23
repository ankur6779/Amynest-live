import { create } from "zustand";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

type NetworkState = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  initialized: boolean;
};

type NetworkActions = {
  setFromNetInfo: (s: NetInfoState) => void;
  init: () => () => void;
};

export const useNetworkStore = create<NetworkState & NetworkActions>((set, get) => ({
  isConnected: true,
  isInternetReachable: null,
  type: "unknown",
  initialized: false,

  setFromNetInfo: (s) => {
    set({
      isConnected: !!s.isConnected,
      isInternetReachable: s.isInternetReachable,
      type: s.type,
    });
  },

  init: () => {
    if (get().initialized) return () => undefined;
    set({ initialized: true });

    void NetInfo.fetch().then((s) => get().setFromNetInfo(s));

    const unsub = NetInfo.addEventListener((s) => {
      get().setFromNetInfo(s);
    });
    return unsub;
  },
}));

export const selectIsOnline = (s: NetworkState): boolean =>
  s.isConnected && s.isInternetReachable !== false;
