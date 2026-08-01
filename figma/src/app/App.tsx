// DeedPro — canonical identity mark, lockup variants, and small-size demonstration

const BRAND = "#7C4DFF";
const BRAND_FOLD = "#5B35D5";
const INK = "#1F2B37";

/** The Stamped Page mark — a recorded instrument reduced to its essence */
function StampedPage({ size = 64 }: { size?: number }) {
  const ratio = 80 / 64;
  const h = size * ratio;

  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 64 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Page body — three rounded corners, top-right notched for fold */}
      <path
        d="M4 0H50L64 14V76C64 78.2 62.2 80 60 80H4C1.8 80 0 78.2 0 76V4C0 1.8 1.8 0 4 0Z"
        fill={BRAND}
      />

      {/* Fold triangle — the turned corner, brand-700 plane */}
      <path d="M50 0L64 14H50V0Z" fill={BRAND_FOLD} />

      {/* Header ruling line — wider, document-type declaration weight */}
      <rect x="10" y="22" width="34" height="3" rx="1.5" fill="white" fillOpacity="0.88" />

      {/* Body ruling lines — tighter, data entry fields */}
      <rect x="10" y="30" width="26" height="2.5" rx="1.25" fill="white" fillOpacity="0.58" />
      <rect x="10" y="37" width="31" height="2.5" rx="1.25" fill="white" fillOpacity="0.58" />

      {/* Recorder's seal — outer ring (county recorder embosser convention) */}
      <circle cx="32" cy="60" r="11.25" stroke="white" strokeWidth="1.6" />

      {/* Recorder's seal — inner ring (two-ring embosser, not a generic badge) */}
      <circle cx="32" cy="60" r="7" stroke="white" strokeWidth="1.6" />

      {/* Seal center mark — the hash stamp */}
      <circle cx="32" cy="60" r="1.75" fill="white" />
    </svg>
  );
}

/** Small-size variant (≤20px equivalent): two text lines + single heavier ring */
function StampedPageSmall({ size = 16 }: { size?: number }) {
  const ratio = 80 / 64;
  const h = size * ratio;

  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 64 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 0H50L64 14V76C64 78.2 62.2 80 60 80H4C1.8 80 0 78.2 0 76V4C0 1.8 1.8 0 4 0Z"
        fill={BRAND}
      />
      <path d="M50 0L64 14H50V0Z" fill={BRAND_FOLD} />

      {/* Two lines only — three collapse at favicon scale */}
      <rect x="10" y="22" width="34" height="4" rx="2" fill="white" fillOpacity="0.9" />
      <rect x="10" y="31" width="26" height="4" rx="2" fill="white" fillOpacity="0.62" />

      {/* Single heavier ring — two rings merge into noise at ≤20px */}
      <circle cx="32" cy="61" r="10" stroke="white" strokeWidth="3.5" />
    </svg>
  );
}

/** Horizontal lockup: mark + "DeedPro" two-tone wordmark */
function LogoLockup({
  markSize = 32,
  dark = false,
}: {
  markSize?: number;
  dark?: boolean;
}) {
  const fontSize = markSize * 0.95;
  const gap = markSize * 0.45;

  return (
    <div className="flex items-center" style={{ gap }}>
      <StampedPage size={markSize} />
      <span
        style={{
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          fontWeight: 800,
          fontSize,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        <span style={{ color: dark ? "#ffffff" : INK }}>Deed</span>
        <span style={{ color: BRAND }}>Pro</span>
      </span>
    </div>
  );
}

/** Label for the presentation grid */
function Label({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 400,
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: dark ? "rgba(255,255,255,0.38)" : "rgba(31,43,55,0.38)",
      }}
    >
      {children}
    </span>
  );
}

export default function App() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: "#F7F6FC", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* ── Main canvas ── */}
      <div className="flex flex-col items-center gap-20 py-20 px-10 w-full max-w-3xl">

        {/* ── Mark alone ── */}
        <div className="flex flex-col items-center gap-5">
          <StampedPage size={120} />
          <Label>LogoMark</Label>
        </div>

        {/* ── Standard lockup ── */}
        <div
          className="flex flex-col items-center gap-7 py-14 px-20 rounded-2xl w-full"
          style={{ backgroundColor: "#ffffff", border: "1px solid rgba(124,77,255,0.1)" }}
        >
          <LogoLockup markSize={44} />
          <Label>Standard Lockup — Light Surface</Label>
        </div>

        {/* ── Dark-surface lockup ── */}
        <div
          className="flex flex-col items-center gap-7 py-14 px-20 rounded-2xl w-full"
          style={{ backgroundColor: INK }}
        >
          <LogoLockup markSize={44} dark />
          <Label dark>LogoLockupDark — Dark Surface</Label>
        </div>

        {/* ── Scale demonstration ── */}
        <div className="flex flex-col items-center gap-6 w-full">
          <Label>Scale Floor — Pixel-Tuned Variants</Label>

          {/* Scale row */}
          <div
            className="flex items-end justify-center gap-10 py-10 px-14 rounded-2xl w-full"
            style={{ backgroundColor: "#ffffff", border: "1px solid rgba(124,77,255,0.1)" }}
          >
            {/* Full-detail sizes */}
            {[64, 40, 28].map((s) => (
              <div key={s} className="flex flex-col items-center gap-3">
                <StampedPage size={s} />
                <Label>{s}px</Label>
              </div>
            ))}

            {/* Divider */}
            <div style={{ width: 1, height: 56, backgroundColor: "rgba(124,77,255,0.12)" }} />

            {/* Small-variant sizes */}
            {[20, 16].map((s) => (
              <div key={s} className="flex flex-col items-center gap-3">
                <StampedPageSmall size={s} />
                <Label>{s}px ↓</Label>
              </div>
            ))}
          </div>
        </div>

        {/* ── Color tokens ── */}
        <div className="flex flex-col items-center gap-5 w-full">
          <Label>Brand Tokens</Label>
          <div className="flex gap-3 flex-wrap justify-center">
            {[
              { hex: "#EDE7FF", label: "brand-50" },
              { hex: "#D1C4FE", label: "brand-100" },
              { hex: "#A68EFC", label: "brand-300" },
              { hex: "#7C4DFF", label: "brand-500", primary: true },
              { hex: "#6a3de8", label: "brand-600" },
              { hex: "#5B35D5", label: "brand-700" },
              { hex: "#3D1E9E", label: "brand-900" },
            ].map(({ hex, label, primary }) => (
              <div key={hex} className="flex flex-col items-center gap-2">
                <div
                  style={{
                    width: primary ? 48 : 36,
                    height: primary ? 48 : 36,
                    borderRadius: 8,
                    backgroundColor: hex,
                    boxShadow: primary ? `0 0 0 2px white, 0 0 0 3.5px ${hex}` : undefined,
                  }}
                />
                <span style={{ fontSize: 10, color: "rgba(31,43,55,0.45)", fontFamily: "monospace" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
