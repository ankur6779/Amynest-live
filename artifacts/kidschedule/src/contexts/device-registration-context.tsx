import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  registerCurrentDevice,
  type UserDeviceRecord,
} from "@/lib/device-registration";

export type DeviceRegistrationStatus = "idle" | "loading" | "ready" | "blocked";

type DeviceRegistrationContextValue = {
  status: DeviceRegistrationStatus;
  message: string | null;
  devices: UserDeviceRecord[];
  limit: number;
  refresh: () => Promise<void>;
  markReady: () => void;
};

const DeviceRegistrationContext = createContext<DeviceRegistrationContextValue>({
  status: "idle",
  message: null,
  devices: [],
  limit: 1,
  refresh: async () => {},
  markReady: () => {},
});

export function useDeviceRegistration() {
  return useContext(DeviceRegistrationContext);
}

export function DeviceRegistrationProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const authFetch = useAuthFetch();
  const authFetchRef = useRef(authFetch);
  authFetchRef.current = authFetch;

  const [status, setStatus] = useState<DeviceRegistrationStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [devices, setDevices] = useState<UserDeviceRecord[]>([]);
  const [limit, setLimit] = useState(1);
  const lastUserRef = useRef<string | null>(null);

  const runRegistration = useCallback(async () => {
    setStatus("loading");
    setMessage(null);
    try {
      const result = await registerCurrentDevice(authFetchRef.current);
      if (!result.ok) {
        setStatus("blocked");
        setMessage(result.message);
        setDevices(result.devices);
        setLimit(result.limit);
        return;
      }
      setStatus("ready");
      setDevices([result.device]);
      setLimit(result.limit);
    } catch {
      // Non-fatal during rollout — allow app use; backend may soft-enforce.
      setStatus("ready");
    }
  }, []);

  const refresh = useCallback(async () => {
    await runRegistration();
  }, [runRegistration]);

  const markReady = useCallback(() => {
    setStatus("ready");
    setMessage(null);
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      setStatus("idle");
      setMessage(null);
      setDevices([]);
      lastUserRef.current = null;
      return;
    }
    void runRegistration();
  }, [isSignedIn, runRegistration]);

  const value = useMemo(
    () => ({ status, message, devices, limit, refresh, markReady }),
    [status, message, devices, limit, refresh, markReady],
  );

  return (
    <DeviceRegistrationContext.Provider value={value}>
      {children}
    </DeviceRegistrationContext.Provider>
  );
}
