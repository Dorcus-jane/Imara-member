import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../theme/theme';

export default function Logo() {
  return (
    <View style={styles.row}>
      <View style={styles.mark}>
        <View style={[styles.bar, { height: 12 }]} />
        <View style={[styles.bar, { height: 21 }]} />
        <View style={[styles.bar, { height: 17 }]} />
      </View>
      <Text style={styles.word}>Imara</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bar: { width: 4, borderRadius: 2, backgroundColor: colors.brass },
  word: { ...type.brand, color: colors.ink },
});
