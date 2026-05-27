import {
  useLayoutEffect,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
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

  useLayoutEffect(() => {
    if (!nativeShell) return;
    const kav = kavRef?.current;
    const scroll = scrollRef?.current;
    if (!kav || !scroll) return;

    const clearPinnedHeight = () => {
      scroll.style.removeProperty("height");
      scroll.style.removeProperty("maxHeight");
    };

    if (!keyboardOpen) {
      clearPinnedHeight();
      return;
    }

    const syncScrollHeight = () => {
      const height = kav.clientHeight;
      if (height <= 0) return;
      scroll.style.height = `${height}px`;
      scroll.style.maxHeight = `${height}px`;
    };

    syncScrollHeight();
    const observer = new ResizeObserver(syncScrollHeight);
    observer.observe(kav);
    return () => {
      observer.disconnect();
      clearPinnedHeight();
    };
  }, [kavRef, keyboardOpen, nativeShell, scrollRef]);

  if (!nativeShell) {
    return <div style={style}>{children}</div>;
  }

  return (
    <div
      ref={kavRef}
      className={`amynest-auth-kav amynest-auth-shell${keyboardOpen ? " amynest-auth-shell--keyboard" : ""}`}
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
