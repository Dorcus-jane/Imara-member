// Design tokens taken from the Figma file (colour, type and spacing styles).
// Change a value here and every screen updates.
export const colors = {
  canvas: '#F8F7F3',
  ink: '#18352B',
  primary: '#173F32',
  brass: '#C3AD77',
  onDark: '#FAFAF4',
  secondaryDark: '#CDD9D0',
  surface: '#FFFFFF',
  line: '#DFE3DA',
  soft: '#ECEFE8',
  muted: '#626F66',
  imageScrim: 'rgba(23,63,50,0.64)',
  backdrop: 'rgba(23,63,50,0.94)',
  pending: '#9A6A1C',
  danger: '#A8382C',
  success: '#2E6B4F',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { input: 8, card: 12, soft: 10, chip: 10, round: 22 };

export const fonts = {
  inter: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
  manropeMedium: 'Manrope_500Medium',
  manropeSemiBold: 'Manrope_600SemiBold',
  serif: 'InstrumentSerif_400Regular',
};

// Text styles named after the Figma text styles.
export const type = {
  brand: { fontFamily: fonts.serif, fontSize: 31, lineHeight: 38 },
  photoDisplay: { fontFamily: fonts.serif, fontSize: 42, lineHeight: 44, letterSpacing: -0.5 },
  display: { fontFamily: fonts.serif, fontSize: 38, lineHeight: 42, letterSpacing: -0.3 },
  title: { fontFamily: fonts.manropeSemiBold, fontSize: 23, lineHeight: 31 },
  balance: { fontFamily: fonts.manropeMedium, fontSize: 34, lineHeight: 43, letterSpacing: -0.5 },
  section: { fontFamily: fonts.interSemiBold, fontSize: 17, lineHeight: 24 },
  cardTitle: { fontFamily: fonts.interSemiBold, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fonts.interMedium, fontSize: 13, lineHeight: 19 },
  body: { fontFamily: fonts.inter, fontSize: 13, lineHeight: 19 },
  small: { fontFamily: fonts.inter, fontSize: 12, lineHeight: 17 },
  caption: { fontFamily: fonts.interMedium, fontSize: 11, lineHeight: 16 },
  button: { fontFamily: fonts.interMedium, fontSize: 14, lineHeight: 20 },
  nav: { fontFamily: fonts.interMedium, fontSize: 10, lineHeight: 14 },
  eyebrow: { fontFamily: fonts.interMedium, fontSize: 11, lineHeight: 16, letterSpacing: 1.2 },
} as const;
