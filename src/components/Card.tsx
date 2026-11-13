import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius } from '../theme/theme';

type Props = { children: React.ReactNode; style?: StyleProp<ViewStyle> };

// White card with a thin line border.
export function Card({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// Soft grey-green box used for help and notes.
export function SoftBox({ children, style }: Props) {
  return <View style={[styles.soft, style]}>{children}</View>;
}

// Dark green feature card.
export function DarkCard({ children, style }: Props) {
  return <View style={[styles.dark, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
  },
  soft: {
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.soft,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 7,
  },
  dark: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: 24,
    gap: 9,
  },
});
