export function Wash({ color }: { color: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        background: `radial-gradient(80% 48% at 8% -10%, color-mix(in srgb, ${color} 38%, transparent), transparent 68%), radial-gradient(60% 42% at 100% 100%, color-mix(in srgb, ${color} 20%, transparent), transparent 72%), var(--paper)`,
      }}
    />
  );
}
