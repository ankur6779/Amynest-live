import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageCircle, Send } from "lucide-react";
import { lessonChatResponse, parseLessonChatIntent } from "@workspace/teacher-os";
import { useTeacherOs } from "./context/teacher-os-context";
import { WS_GLASS_CARD, WS_MUTED_TEXT, WS_CONTAINER } from "@/features/worksheet-studio/worksheet-studio-theme";

type Props = {
  onCreateLesson?: () => void;
};

export function TeacherOsLessonChat({ onCreateLesson }: Props) {
  const { setActiveModule } = useTeacherOs();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "amy"; text: string }>>([
    { role: "amy", text: "Hi! I'm Amy. Try: \"Create tomorrow's lesson on Sea Animals for UKG.\"" },
  ]);

  const send = () => {
    if (!input.trim()) return;
    const intent = parseLessonChatIntent(input);
    const reply = lessonChatResponse(intent);
    setMessages((m) => [...m, { role: "user", text: input }, { role: "amy", text: reply }]);
    setInput("");
    if (intent.action === "create_lesson") {
      onCreateLesson?.();
      setActiveModule("dashboard");
    }
    if (intent.action === "generate_worksheet") setActiveModule("studio");
  };

  return (
    <div className={cn(WS_CONTAINER, "flex min-h-[60dvh] flex-col gap-3 pb-4")}>
      <header className={cn(WS_GLASS_CARD, "flex items-center gap-3 p-4")}>
        <MessageCircle className="h-8 w-8 text-[#1e3a5f]" />
        <h2 className="text-lg font-bold text-[#1e3a5f]">Amy Lesson Chat</h2>
      </header>
      <div className={cn(WS_GLASS_CARD, "flex-1 space-y-3 overflow-y-auto p-4")}>
        {messages.map((m, i) => (
          <div key={i} className={cn("max-w-[90%] rounded-2xl px-3 py-2 text-sm", m.role === "amy" ? "bg-[#1e3a5f]/10 text-[#1e3a5f]" : "ml-auto bg-[#1e3a5f] text-white")}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-xl border px-3 py-3 text-sm"
          placeholder="Ask Amy…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button size="icon" className="h-12 w-12 shrink-0" onClick={send} aria-label="Send">
          <Send className="h-5 w-5" />
        </Button>
      </div>
      <p className={cn("text-center text-xs", WS_MUTED_TEXT)}>Natural language lesson planning</p>
    </div>
  );
}
