export function Wash({ color }: { color: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ background: `color-mix(in srgb, ${color} 6%, var(--paper))` }}
    />
  );
}
