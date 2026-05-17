/**
 * Shown while Firebase Auth resolves the initial session — prevents a blank
 * screen after the HTML splash is dismissed.
 */
export function AuthBootShell() {
  return (
    <>
      <style>{`
        @keyframes authBootSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        role="status"
        aria-label="Loading AmyNest"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: "linear-gradient(175deg, #0a061a 0%, #120a2e 55%, #050010 100%)",
          color: "rgba(200,180,255,0.85)",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "3px solid rgba(168,85,247,0.2)",
            borderTopColor: "hsl(330, 80%, 60%)",
            animation: "authBootSpin 0.8s linear infinite",
          }}
        />
        <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Loading AmyNest…</p>
      </div>
    </>
  );
}
