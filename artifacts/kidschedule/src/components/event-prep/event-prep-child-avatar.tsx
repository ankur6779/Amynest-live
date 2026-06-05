import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { EVENT_PREP_ACCENT, eventPrepChildEmoji } from "@/lib/event-prep-zone-theme";

interface Props {
  name: string;
  age: number;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  sm: "h-10 w-10 text-lg",
  md: "h-12 w-12 text-xl",
  lg: "h-16 w-16 text-3xl",
} as const;

export function EventPrepChildAvatar({ name, age, photoUrl, size = "md", className }: Props) {
  const initials = name.trim().slice(0, 1).toUpperCase() || "?";
  const emoji = eventPrepChildEmoji(age);

  if (photoUrl) {
    return (
      <Avatar className={cn(SIZE[size], "shrink-0 ring-2 ring-amber-400/35 shadow-[0_0_12px_rgba(255,184,0,0.25)]", className)}>
        <AvatarImage src={photoUrl} alt={name} className="object-cover" />
        <AvatarFallback className={cn("font-quicksand font-bold", EVENT_PREP_ACCENT.emojiShell)}>
          {initials}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl",
        SIZE[size],
        EVENT_PREP_ACCENT.emojiShell,
        className,
      )}
      aria-hidden
    >
      {emoji}
    </div>
  );
}
