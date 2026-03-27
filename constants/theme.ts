// ─── AIADMK Field Operations — Design System ────────────────────────────────

export const Colors = {
  // ── AIADMK Core ──────────────────────────────────────────────────────────
  primary:      '#CC0000',      // AIADMK Deep Red
  primaryDark:  '#990000',      // Pressed / Dark variant
  primaryLight: '#FF3333',      // Highlight / Accent
  primaryMuted: '#CC000020',    // Translucent for backgrounds

  // ── Gold Accent (Party Symbol) ────────────────────────────────────────────
  gold:         '#D4A017',
  goldLight:    '#F0C040',
  goldMuted:    '#D4A01725',

  // ── Greens (Two Leaves Symbol) ────────────────────────────────────────────
  leafGreen:    '#2E7D32',
  leafLight:    '#4CAF50',

  // ── Dark Backgrounds ─────────────────────────────────────────────────────
  bgBase:       '#080808',      // Deepest background
  bgDark:       '#0E0E0E',      // Main screen background
  bgCard:       '#161616',      // Card background
  bgCardRaised: '#1E1E1E',      // Elevated card
  bgOverlay:    'rgba(0,0,0,0.6)',

  // ── Neutrals ─────────────────────────────────────────────────────────────
  black:        '#000000',
  charcoal:     '#141414',
  darkGray:     '#252525',
  midGray:      '#555555',
  lightGray:    '#AAAAAA',

  // ── Borders ───────────────────────────────────────────────────────────────
  border:       '#2A2A2A',
  borderLight:  '#3A3A3A',
  borderGold:   '#D4A01740',
  borderRed:    '#CC000040',

  // ── Status ────────────────────────────────────────────────────────────────
  success:      '#22C55E',
  successMuted: '#16382A',
  warning:      '#F59E0B',
  warningMuted: '#3A2800',
  error:        '#EF4444',
  errorMuted:   '#3A1515',
  info:         '#3B82F6',
  infoMuted:    '#1A2A3A',

  // ── Text ──────────────────────────────────────────────────────────────────
  textPrimary:   '#FFFFFF',
  textSecondary: '#CCCCCC',
  textMuted:     '#888888',
  textDim:       '#555555',
  textDark:      '#111111',
  textGold:      '#D4A017',

  // ── White shades ──────────────────────────────────────────────────────────
  white:         '#FFFFFF',
  white80:       'rgba(255,255,255,0.80)',
  white60:       'rgba(255,255,255,0.60)',
  white20:       'rgba(255,255,255,0.20)',
  white10:       'rgba(255,255,255,0.10)',
  white05:       'rgba(255,255,255,0.05)',
};

export const FontSizes = {
  xxs: 10,
  xs:  11,
  sm:  13,
  md:  15,
  lg:  17,
  xl:  20,
  xxl: 24,
  xxxl:30,
  huge:36,
};

export const Spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
  xxxl:64,
};

export const Radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   18,
  xl:   24,
  xxl:  32,
  full: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  header: {
    shadowColor: '#CC0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  button: {
    shadowColor: '#CC0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  gold: {
    shadowColor: '#D4A017',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
};

export const Animation = {
  fast:   150,
  normal: 250,
  slow:   400,
};