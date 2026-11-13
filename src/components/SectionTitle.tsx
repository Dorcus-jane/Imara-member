import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../theme/theme';

// Manrope heading used inside screens ("What's behind your score?", "Repayment history").
export default function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.text}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: { fontFamily: fonts.manropeSemiBold, fontSize: 19, lineHeight: 26, color: colors.ink },
});
