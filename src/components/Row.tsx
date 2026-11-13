import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';
import { colors, type } from '../theme/theme';

type Props = {
  label: string;
  value: string;
  strong?: boolean;
  valueStyle?: StyleProp<TextStyle>;
};

// Label on the left in muted text, value on the right.
export default function Row({ label, value, strong, valueStyle }: Props) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, strong && styles.strongLabel]}>{label}</Text>
      <Text style={[styles.value, strong && styles.strongValue, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  label: { ...type.body, color: colors.muted },
  value: { ...type.label, color: colors.ink, textAlign: 'right', flexShrink: 1 },
  strongLabel: { ...type.label, color: colors.ink },
  strongValue: { fontFamily: type.section.fontFamily, fontSize: 14 },
});
