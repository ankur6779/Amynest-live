export function LessonsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: "grid", gap: 12 }} data-testid="lessons-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 108,
            borderRadius: 16,
            background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
            backgroundSize: "200% 100%",
            animation: "audioSkeletonShimmer 1.2s ease-in-out infinite",
          }}
        />
      ))}
      <style>{`
        @keyframes audioSkeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
