import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, type } from '../theme/theme';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'disabled';
  loading?: boolean;
  danger?: boolean; // red label, used for Sign out
};

export default function Button({ title, onPress, variant = 'primary', loading, danger }: Props) {
  const isDisabled = variant === 'disabled';
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled || loading}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'outline' && styles.outline,
        isDisabled && styles.disabled,
        pressed && { opacity: 0.88 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onDark : colors.primary} />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'primary' && { color: colors.onDark },
            variant === 'outline' && { color: danger ? colors.danger : colors.ink },
            isDisabled && { color: colors.muted },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primary: { backgroundColor: colors.primary },
  outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  disabled: { backgroundColor: colors.soft },
  text: { ...type.button },
});
