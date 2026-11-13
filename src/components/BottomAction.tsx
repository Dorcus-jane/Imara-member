import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from './Button';
import { colors } from '../theme/theme';

type Props = { title: string; onPress: () => void; loading?: boolean; variant?: 'primary' | 'disabled' };

// Full-width action pinned to the bottom of a screen (Apply for a loan, Back to loans).
export default function BottomAction({ title, onPress, loading, variant = 'primary' }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <Button title={title} onPress={onPress} loading={loading} variant={variant} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
    paddingHorizontal: 21,
  },
});
