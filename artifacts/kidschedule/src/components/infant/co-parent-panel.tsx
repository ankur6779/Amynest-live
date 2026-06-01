import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, Copy, Check } from "lucide-react";
import { acceptCoParentInvite, createCoParentInvite } from "@/lib/infant-care-api";
import {
  trackCoParentInviteStarted,
  trackCoParentInviteSent,
  trackCoParentInviteAccepted,
} from "@/lib/infant-hub-analytics";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type CoParentPanelProps = {
  childId: number;
  ageMonths: number;
  isOwner?: boolean;
};

export function CoParentPanel({ childId, ageMonths, isOwner = true }: CoParentPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [acceptCode, setAcceptCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleInvite() {
    trackCoParentInviteStarted(childId, ageMonths);
    setBusy(true);
    try {
      const res = await createCoParentInvite(childId);
      setInviteCode(res.inviteCode);
      trackCoParentInviteSent(childId, ageMonths);
    } catch {
      toast({ description: t("components.coparent.invite_error", "Could not create invite"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept() {
    setBusy(true);
    try {
      await acceptCoParentInvite(acceptCode);
      trackCoParentInviteAccepted(childId, ageMonths);
      toast({ description: t("components.coparent.accepted", "Linked! You can now see shared logs.") });
      setAcceptCode("");
    } catch {
      toast({ description: t("components.coparent.accept_error", "Invalid or expired code"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="coparent-panel">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold">{t("components.coparent.title", "Co-parent sync")}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t(
          "components.coparent.lead",
          "Sleep, feeds, milestones, and Cry Insight sync across linked parents.",
        )}
      </p>

      {isOwner && (
        <div className="space-y-2">
          <Button type="button" disabled={busy} onClick={handleInvite} variant="outline" className="w-full rounded-xl">
            {t("components.coparent.create_invite", "Invite co-parent")}
          </Button>
          {inviteCode && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
              <code className="text-sm font-bold flex-1">{inviteCode}</code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(inviteCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="text-primary"
                aria-label="Copy code"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <input
          type="text"
          value={acceptCode}
          onChange={(e) => setAcceptCode(e.target.value)}
          placeholder={t("components.coparent.code_placeholder", "Enter invite code")}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
        />
        <Button type="button" disabled={busy || !acceptCode.trim()} onClick={handleAccept} className="w-full rounded-xl">
          {t("components.coparent.accept", "Accept invite")}
        </Button>
      </div>
    </div>
  );
}
