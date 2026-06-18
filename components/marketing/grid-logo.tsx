export function GridLogo({ size = 32 }: { size?: number }) {
  const pad = Math.round(size * 0.16);
  const gap = Math.max(2, Math.round(size * 0.09));
  return (
    <div
      className="grid-logo-mark"
      style={{
        width: size,
        height: size,
        border: "2px solid #00e5ff",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap,
        padding: pad,
        borderRadius: 6,
      }}
      aria-hidden
    >
      <div style={{ background: "#00e5ff", borderRadius: 1, opacity: 1 }} />
      <div style={{ background: "#00e5ff", borderRadius: 1, opacity: 0.5 }} />
      <div style={{ background: "#00e5ff", borderRadius: 1, opacity: 1 }} />
      <div style={{ background: "#00e5ff", borderRadius: 1, opacity: 0.5 }} />
    </div>
  );
}
