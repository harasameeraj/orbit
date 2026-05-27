// Theme constants mapped from web app's CSS custom properties (index.css)
// Keeps mobile styling perfectly in sync with the existing web design system.

export const Colors = {
  brand: '#1a3a6b',
  brandMid: '#2d5aa0',
  brandLight: '#e8eef6',
  surface: '#ffffff',
  surface2: '#f5f7fa',
  bg: '#f0f2f5',
  border: '#e2e5ea',
  text: '#1a1a2e',
  textPrimary: '#1a1a2e',
  textSecondary: '#4a4a6a',
  textMuted: '#8a8aa0',
  accentGreen: '#22c55e',
  accentGreenLight: '#dcfce7',
  accentRed: '#ef4444',
  accentRedLight: '#fee2e2',
  accentAmber: '#f59e0b',
  accentAmberLight: '#fef3c7',
  white: '#ffffff',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Typography = {
  fontFamily: 'System',
  sizes: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32,
    '6xl': 48,
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
};

export const Radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 16,
  '3xl': 20,
  full: 999,
};
