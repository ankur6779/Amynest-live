import type { CSSProperties, ReactNode, RefObject } from "react";
import { isNativeAmyNestShell } from "@/lib/native-shell";

type AuthKeyboardShellProps = {
  children: ReactNode;
  kavRef?: RefObject<HTMLDivElement>;
  scrollRef?: RefObject<HTMLDivElement>;
  keyboardOpen?: boolean;
  style?: CSSProperties;
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
  onBackgroundTap,
}: AuthKeyboardShellProps) {
  const nativeShell = isNativeAmyNestShell();

  if (!nativeShell) {
    return <div style={style}>{children}</div>;
  }

  return (
    <div
      ref={kavRef}
      className={`amynest-auth-kav amynest-auth-shell${keyboardOpen ? " amynest-auth-shell--keyboard" : ""}`}
      style={{
        ...style,
        display: "flex",
        flexDirection: "column",
        minHeight: undefined,
        overflowY: undefined,
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
