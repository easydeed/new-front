/**
 * BRAND2 — the DeedPro mark: the "Stamped Page", refined.
 *
 * Design source of record: the Figma export at figma/ (reference-only —
 * app code never imports from it; this file re-implements the geometry).
 * A recorded instrument reduced to its essence: a rounded page with a
 * folded corner, a header ruling line over two lighter data lines, and a
 * two-ring recorder's seal with a center hash-stamp dot — the embosser
 * convention, not a generic badge. The seal is the story: measured,
 * recorder-formatted, hash-stamped paper (docs/BRAND.md).
 *
 * This component is the single source of the mark's geometry and the ONE
 * place brand hex values may appear outside the Tailwind token scale —
 * SVG fills can't read Tailwind classes. Everywhere else: brand.* tokens.
 *
 * HARD CONSTRAINT (G2 no-chrome): the mark appears on app and marketing
 * surfaces ONLY. Recorded instrument pages carry no branding of any kind
 * (Gov C §27361.7) — the backend leak pins enforce this; never import
 * this component anywhere in the preview-to-PDF path.
 */
import type { CSSProperties } from 'react';
import localFont from 'next/font/local';

/** Wordmark face — Plus Jakarta Sans 800, SELF-HOSTED (no third-party
 * font requests; latin subset committed beside this file). App/marketing
 * surfaces only: the font loads where this module is imported, and this
 * module never reaches the PDF path. */
const jakarta = localFont({
  src: './fonts/PlusJakartaSans-ExtraBold-latin.woff2',
  weight: '800',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

/** Brand purple 500 — matches tailwind.config.js brand.500. */
const BRAND = '#7C4DFF';
/** Fold plane — the mark's brand-700-adjacent. */
const FOLD = '#5B35D5';
/** Ink — the wordmark's "Deed" (and the ink-variant mark). */
const INK = '#1F2B37';

type MarkVariant = 'brand' | 'ink' | 'white';

interface LogoMarkProps {
  /** Rendered height in px; width scales at the mark's 64:80 ratio. */
  size?: number;
  variant?: MarkVariant;
  className?: string;
}

/**
 * The mark. At small sizes (≤20px) the geometry simplifies for optics
 * (per the Figma scale-floor sheet): two text lines and a single heavier
 * seal ring — two rings merge into noise at favicon scale.
 */
export function LogoMark({ size = 32, variant = 'brand', className }: LogoMarkProps) {
  const small = size <= 20;
  const width = (size * 64) / 80;
  const doc = variant === 'white' ? '#FFFFFF' : variant === 'ink' ? INK : BRAND;
  const fold = variant === 'white' ? '#FFFFFF' : variant === 'ink' ? '#000000' : FOLD;
  const detail = variant === 'white' ? INK : '#FFFFFF';
  const foldOpacity = variant === 'white' ? 0.35 : 1;

  return (
    <svg
      viewBox="0 0 64 80"
      width={width}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Page body — three rounded corners, top-right notched for fold */}
      <path
        d="M4 0H50L64 14V76C64 78.2 62.2 80 60 80H4C1.8 80 0 78.2 0 76V4C0 1.8 1.8 0 4 0Z"
        fill={doc}
      />
      {/* Fold triangle — the turned corner */}
      <path d="M50 0L64 14H50V0Z" fill={fold} opacity={foldOpacity} />

      {small ? (
        <>
          {/* Two lines only — three collapse at favicon scale */}
          <rect x="10" y="22" width="34" height="4" rx="2" fill={detail} fillOpacity="0.9" />
          <rect x="10" y="31" width="26" height="4" rx="2" fill={detail} fillOpacity="0.62" />
          {/* Single heavier ring — the bullseye reads at 16px */}
          <circle cx="32" cy="61" r="10" stroke={detail} strokeWidth="3.5" />
        </>
      ) : (
        <>
          {/* Header ruling line — document-type declaration weight */}
          <rect x="10" y="22" width="34" height="3" rx="1.5" fill={detail} fillOpacity="0.88" />
          {/* Body ruling lines — lighter, data-entry fields */}
          <rect x="10" y="30" width="26" height="2.5" rx="1.25" fill={detail} fillOpacity="0.58" />
          <rect x="10" y="37" width="31" height="2.5" rx="1.25" fill={detail} fillOpacity="0.58" />
          {/* Recorder's seal — two-ring embosser + center hash stamp */}
          <circle cx="32" cy="60" r="11.25" stroke={detail} strokeWidth="1.6" />
          <circle cx="32" cy="60" r="7" stroke={detail} strokeWidth="1.6" />
          <circle cx="32" cy="60" r="1.75" fill={detail} />
        </>
      )}
    </svg>
  );
}

interface LockupProps {
  /** Mark height in px; the wordmark scales with it. */
  size?: number;
  className?: string;
}

const lockupStyle = (size: number): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  // Figma spec: gap = 0.45 × mark WIDTH (markSize in the reference is width).
  gap: Math.max(6, Math.round(((size * 64) / 80) * 0.45)),
});

const wordmarkStyle = (size: number): CSSProperties => ({
  fontWeight: 800,
  letterSpacing: '-0.025em',
  // Figma spec: fontSize = 0.95 × mark width.
  fontSize: Math.round(((size * 64) / 80) * 0.95),
  lineHeight: 1,
  userSelect: 'none',
});

/** Mark + wordmark: ink "Deed", brand "Pro". Light surfaces. */
export function LogoLockup({ size = 32, className }: LockupProps) {
  return (
    <span style={lockupStyle(size)} className={className}>
      <LogoMark size={size} />
      <span className={jakarta.className} style={wordmarkStyle(size)}>
        <span style={{ color: INK }}>Deed</span>
        <span style={{ color: BRAND }}>Pro</span>
      </span>
    </span>
  );
}

/**
 * Dark-surface lockup, per the refined design: the mark stays FULL
 * COLOR (the purple page reads on ink/dark grounds) and the wordmark
 * flips "Deed" to white while "Pro" keeps brand purple.
 */
export function LogoLockupDark({ size = 32, className }: LockupProps) {
  return (
    <span style={lockupStyle(size)} className={className}>
      <LogoMark size={size} />
      <span className={jakarta.className} style={wordmarkStyle(size)}>
        <span style={{ color: '#FFFFFF' }}>Deed</span>
        <span style={{ color: BRAND }}>Pro</span>
      </span>
    </span>
  );
}
