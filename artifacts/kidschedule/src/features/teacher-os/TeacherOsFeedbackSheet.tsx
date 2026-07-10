import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { trackProductEvent, type FeedbackKind } from "@workspace/teacher-os";
import { WS_SHEET, WS_MUTED_TEXT, WS_PRIMARY_BTN } from "@/features/worksheet-studio/worksheet-studio-theme";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worksheetMeta?: { title: string; topic: string; id: string };
};

const KINDS: { id: FeedbackKind; label: string; category: string }[] = [
  { id: "feedback", label: "Send Feedback", category: "teacher_os_feedback" },
  { id: "issue", label: "Report Issue", category: "bug_report" },
  { id: "suggestion", label: "Suggest Improvement", category: "feature_request" },
];

export function TeacherOsFeedbackSheet({ open, onOpenChange, worksheetMeta }: Props) {
  const authFetch = useAuthFetch();
  const [kind, setKind] = useState<FeedbackKind>("feedback");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (message.trim().length < 10) {
      toast.error("Please write at least 10 characters");
      return;
    }
    setSubmitting(true);
    const cat = KINDS.find((k) => k.id === kind)?.category ?? "teacher_os_feedback";
    let body = message.trim();
    if (worksheetMeta) {
      body += `\n\n[Worksheet: ${worksheetMeta.title} | ${worksheetMeta.topic} | ${worksheetMeta.id}]`;
    }
    try {
      const res = await authFetch("/api/user-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: [cat, "teacher_os"],
          message: body,
          screenshotUrl: screenshot,
          platform: "web",
        }),
      });
      if (res.ok) {
        trackProductEvent("feedback_submit", { kind });
        toast.success("Thank you — your feedback helps us improve.");
        setMessage("");
        setScreenshot(undefined);
        onOpenChange(false);
      } else {
        toast.error("Could not send feedback");
      }
    } catch {
      toast.error("Network error — try again later");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={cn(WS_SHEET, "rounded-t-3xl")}>
        <SheetHeader>
          <SheetTitle className="text-left text-[#1e3a5f]">Teacher OS Feedback</SheetTitle>
        </SheetHeader>
        <div className="mt-3 flex gap-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium",
                kind === k.id ? "bg-[#1e3a5f] text-white" : "bg-[#1e3a5f]/10 text-[#1e3a5f]",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
        <textarea
          className="mt-3 min-h-[100px] w-full rounded-xl border px-3 py-2 text-sm"
          placeholder="Tell us what worked or what was confusing…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => setScreenshot(reader.result as string);
          reader.readAsDataURL(f);
        }} />
        <div className="mt-2 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            Attach screenshot
          </Button>
          {screenshot && <span className={cn("self-center text-xs text-green-700", WS_MUTED_TEXT)}>Screenshot attached</span>}
        </div>
        <p className={cn("mt-2 text-xs", WS_MUTED_TEXT)}>Voice notes — coming soon</p>
        <Button className={cn(WS_PRIMARY_BTN, "mt-4 w-full")} disabled={submitting} onClick={() => void submit()}>
          {submitting ? "Sending…" : "Submit"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
