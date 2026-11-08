export function Crest({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M32 3 7 12v20c0 14 11 24 25 29 14-5 25-15 25-29V12z" fill="#0b1f3a" stroke="#c8102e" strokeWidth="4" />
      <path d="M22 18v28M22 32l16-14M26 29l13 17" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
