import { useState } from 'react';

/**
 * Team logo. Drop your logo at web/public/logo.png (or change LOGO_SRC) and it is used site-wide.
 * Until then, a generic placeholder shield is shown.
 */
const LOGO_SRC = '/logo.png';

export function Crest({ size = 40 }: { size?: number }) {
  const [missing, setMissing] = useState(false);
  if (!missing) return <img className="crest-img" src={LOGO_SRC} height={size} style={{ width: "auto" }} alt="Knights logo" onError={() => setMissing(true)} />;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M32 3 7 12v20c0 14 11 24 25 29 14-5 25-15 25-29V12z" fill="#0a3d27" stroke="#fff" strokeWidth="4" />
      <path d="M22 18v28M22 32l16-14M26 29l13 17" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
