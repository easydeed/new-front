/**
 * BRAND1 — the DeedPro mark: the "Stamped Page".
 *
 * A recorded instrument, reduced to its essence: a document with a folded
 * corner, three lines of text, and a two-ring recorder's seal in the
 * lower half. The seal is the story — DeedPro's output is measured,
 * recorder-formatted, hash-stamped paper (see docs/BRAND.md).
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

/** Brand purple 500 — matches tailwind.config.js brand.500. */
const BRAND = '#7C4DFF';
/** Fold shadow — matches brand.700-adjacent (#5B35D5, the mark's own). */
const FOLD = '#5B35D5';
/** Ink — the wordmark's "Deed" (and the ink-variant mark). */
const INK = '#1F2B37';

type MarkVariant = 'brand' | 'ink' | 'white';

interface LogoMarkProps {
  /** Rendered height in px; width scales at the mark's 84:104 ratio. */
  size?: number;
  variant?: MarkVariant;
  className?: string;
}

/**
 * The mark. At small sizes (≤20px) the geometry simplifies for optics:
 * two text lines instead of three and a single thicker seal ring —
 * a normal small-size variant, same concept.
 */
export function LogoMark({ size = 32, variant = 'brand', className }: LogoMarkProps) {
  const small = size <= 20;
  const doc = variant === 'white' ? '#FFFFFF' : variant === 'ink' ? INK : BRAND;
  const fold = variant === 'white' ? '#FFFFFF' : variant === 'ink' ? '#000000' : FOLD;
  const detail = variant === 'white' ? INK : '#FFFFFF';
  const foldOpacity = variant === 'white' ? 0.35 : 1;

  return (
    <svg
      viewBox="0 0 84 104"
      width={(size * 84) / 104}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* The page, folded corner top-right */}
      <path d="M10 4 h44 l18 18 v74 a4 4 0 0 1 -4 4 h-54 a4 4 0 0 1 -4 -4 v-88 a4 4 0 0 1 4 -4 z" fill={doc} />
      <path d="M54 4 v14 a4 4 0 0 0 4 4 h14 z" fill={fold} opacity={foldOpacity} />

      {/* The instrument's text lines */}
      <rect x="20" y="34" width="42" height="4.5" rx="2.25" fill={detail} opacity="0.95" />
      <rect x="20" y="44" width="42" height="4.5" rx="2.25" fill={detail} opacity="0.95" />
      {!small && <rect x="20" y="54" width="26" height="4.5" rx="2.25" fill={detail} opacity="0.95" />}

      {/* The recorder's seal — two rings, lower half */}
      {small ? (
        <circle cx="47" cy="76" r="12" fill="none" stroke={detail} strokeWidth="6" />
      ) : (
        <>
          <circle cx="47" cy="76" r="13.5" fill="none" stroke={detail} strokeWidth="3.5" />
          <circle cx="47" cy="76" r="6.5" fill="none" stroke={detail} strokeWidth="2" />
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
  gap: Math.max(6, Math.round(size * 0.28)),
});

const wordmarkStyle = (size: number): CSSProperties => ({
  fontWeight: 700,
  letterSpacing: '-0.02em',
  fontSize: Math.round(size * 0.72),
  lineHeight: 1,
});

/** Mark + wordmark: ink "Deed", brand "Pro". Light surfaces. */
export function LogoLockup({ size = 32, className }: LockupProps) {
  return (
    <span style={lockupStyle(size)} className={className}>
      <LogoMark size={size} />
      <span style={wordmarkStyle(size)}>
        <span style={{ color: INK }}>Deed</span>
        <span style={{ color: BRAND }}>Pro</span>
      </span>
    </span>
  );
}

/** One-color white lockup for dark surfaces (mark's details read in ink). */
export function LogoLockupDark({ size = 32, className }: LockupProps) {
  return (
    <span style={lockupStyle(size)} className={className}>
      <LogoMark size={size} variant="white" />
      <span style={{ ...wordmarkStyle(size), color: '#FFFFFF' }}>DeedPro</span>
    </span>
  );
}
