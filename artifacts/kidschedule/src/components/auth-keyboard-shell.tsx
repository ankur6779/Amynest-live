import type { CSSProperties, ReactNode, RefObject } from "react";
import { isNativeAmyNestShell } from "@/lib/native-shell";

type AuthKeyboardShellProps = {
  children: ReactNode;
  kavRef?: RefObject<HTMLDivElement | null>;
  scrollRef?: RefObject<HTMLDivElement | null>;
  keyboardOpen?: boolean;
  style?: CSSProperties;
  className?: string;
  onBackgroundTap?: (event: React.MouseEvent | React.TouchEvent) => void;
};

/**
 * Capacitor iOS / Play Store auth layout — web equivalent of:
 * KeyboardAvoidingView → TouchableWithoutFeedback → ScrollView → content.
 */
export function AuthKeyboardShell({
  children,
  kavRef,
  scrollRef,
  keyboardOpen = false,
  style,
  className,
  onBackgroundTap,
}: AuthKeyboardShellProps) {
  const nativeShell = isNativeAmyNestShell();

  if (!nativeShell) {
    return <div className={className} style={style}>{children}</div>;
  }

  return (
    <div
      ref={kavRef}
      className={`amynest-auth-kav amynest-auth-shell${keyboardOpen ? " amynest-auth-shell--keyboard" : ""}${className ? ` ${className}` : ""}`}
      style={{
        ...style,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        minHeight: undefined,
        overflowY: undefined,
        overflowX: "hidden",
        WebkitOverflowScrolling: undefined,
      }}
    >
      <div className="amynest-auth-kav-backdrop" role="presentation">
        <div
          ref={scrollRef}
          className="amynest-auth-scroll"
          data-keyboard-should-persist-taps="handled"
          onMouseDown={onBackgroundTap}
          onTouchEnd={onBackgroundTap}
        >
          <div className="amynest-auth-scroll-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Native auth shell padding — safe areas top + bottom so footer links stay visible. */
export const NATIVE_AUTH_SHELL_PADDING =
  "max(10px, env(safe-area-inset-top)) 16px max(14px, env(safe-area-inset-bottom))";
