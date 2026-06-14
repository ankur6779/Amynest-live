import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronLeft,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useDeviceRegistration } from "@/contexts/device-registration-context";
import { useSubscription } from "@/hooks/use-subscription";
import {
  listUserDevices,
  removeUserDevice,
  replaceUserDevice,
  type UserDeviceRecord,
} from "@/lib/device-registration";
import { getOrCreateDeviceId, formatDeviceSubtitle } from "@/lib/device-id";

function platformIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes("ipad") || p.includes("tablet")) return Tablet;
  if (p === "web" || p.includes("desktop")) return Monitor;
  return Smartphone;
}

function formatLastActive(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "Recently";
  }
}

export default function ManageDevicesPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const { refresh, markReady, status: registrationStatus } = useDeviceRegistration();
  const { isPremium } = useSubscription();
  const currentDeviceId = getOrCreateDeviceId();

  const [devices, setDevices] = useState<UserDeviceRecord[]>([]);
  const [limit, setLimit] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listUserDevices(authFetch);
      setDevices(data.devices);
      setLimit(data.limit);
    } catch (err) {
      toast({
        title: t("pages.manage_devices.load_failed"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [authFetch, t, toast]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const handleRemove = async (deviceId: string) => {
    setBusyId(deviceId);
    try {
      await removeUserDevice(authFetch, deviceId);
      await loadDevices();
      toast({ title: t("pages.manage_devices.removed") });
    } catch (err) {
      toast({
        title: t("pages.manage_devices.remove_failed"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleReplace = async (deviceId: string) => {
    setBusyId(deviceId);
    try {
      const result = await replaceUserDevice(authFetch, deviceId);
      if (!result.ok) {
        toast({
          title: t("pages.manage_devices.replace_failed"),
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      markReady();
      await refresh();
      toast({ title: t("pages.manage_devices.replaced") });
      setLocation("/dashboard");
    } catch (err) {
      toast({
        title: t("pages.manage_devices.replace_failed"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const planLabel = isPremium
    ? t("pages.manage_devices.premium_limit", { count: limit })
    : t("pages.manage_devices.free_limit", { count: limit });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 pb-10">
      <Button
        variant="ghost"
        className="w-fit rounded-full"
        onClick={() => setLocation("/parent-profile")}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t("pages.manage_devices.back")}
      </Button>

      <div>
        <h1 className="font-quicksand text-2xl font-bold">{t("pages.manage_devices.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{planLabel}</p>
        {registrationStatus === "blocked" && (
          <p className="mt-2 text-sm text-primary">
            {t("pages.manage_devices.blocked_hint")}
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const Icon = platformIcon(device.platform);
            const isCurrent =
              device.deviceId === currentDeviceId ||
              device.isCurrentDevice === true ||
              device.isCurrent;
            const subtitle = formatDeviceSubtitle(
              device.browser ?? null,
              device.os ?? null,
              device.platform,
            );
            return (
              <Card key={device.deviceId} className="rounded-2xl border-none shadow-sm">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      <span className="truncate">{device.deviceName ?? subtitle}</span>
                      {isCurrent && (
                        <Badge variant="secondary">
                          ✓ {t("pages.manage_devices.current_badge")}
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("pages.manage_devices.last_active")}{" "}
                      {formatLastActive(device.lastSeenAt)}
                    </p>
                  </div>
                </CardHeader>
                {!isCurrent && (
                  <CardContent className="flex flex-wrap gap-2 pt-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      disabled={busyId === device.deviceId}
                      onClick={() => void handleRemove(device.deviceId)}
                    >
                      {busyId === device.deviceId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1 h-4 w-4" />
                      )}
                      {t("pages.manage_devices.remove")}
                    </Button>
                    {registrationStatus === "blocked" && (
                      <Button
                        size="sm"
                        className="rounded-xl"
                        disabled={busyId === device.deviceId}
                        onClick={() => void handleReplace(device.deviceId)}
                      >
                        {t("pages.manage_devices.use_this_device")}
                      </Button>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
          {devices.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("pages.manage_devices.empty")}</p>
          )}
        </div>
      )}
    </div>
  );
}
