import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Logo from './Logo';
import { colors, radius, type } from '../theme/theme';

type Props = {
  // "logo": Imara mark with optional bell. "title": plain title. Add onBack for a back arrow.
  logo?: boolean;
  title?: string;
  onBack?: () => void;
  onBell?: () => void;
};

export default function AppHeader({ logo, title, onBack, onBell }: Props) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.back} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
      ) : null}
      {logo ? <Logo /> : <Text style={styles.title}>{title}</Text>}
      <View style={{ flex: 1 }} />
      {onBell ? (
        <Pressable onPress={onBell} style={styles.bell} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={22} color={colors.ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 72,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.canvas,
  },
  back: { marginRight: 10, marginLeft: -4 },
  title: { fontFamily: type.title.fontFamily, fontSize: 22, lineHeight: 31, color: colors.ink },
  bell: {
    width: 44,
    height: 44,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
