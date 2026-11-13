import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, type } from '../theme/theme';

export default function AuthFooter() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 22) }]}>
      <Text style={styles.text}>Your SACCO. Your future. Together.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 30,
    alignItems: 'center',
  },
  text: { ...type.caption, color: colors.muted },
});
