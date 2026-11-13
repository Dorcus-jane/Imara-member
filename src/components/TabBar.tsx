import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, type } from '../theme/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'Overview', label: 'Overview', icon: 'home-outline' },
  { name: 'Deposits', label: 'Deposits', icon: 'download-outline' },
  { name: 'Loans', label: 'Loans', icon: 'archive-outline' },
  { name: 'Statements', label: 'Statements', icon: 'document-text-outline' },
  { name: 'Profile', label: 'Profile', icon: 'person-outline' },
];

// Detail screens live inside the tab navigator. Each one highlights a parent tab.
const PARENT: Record<string, string> = {
  LoanDetails: 'Loans',
  RiskScore: 'Profile',
  Notifications: 'Overview',
};

// Screens that hide the tab bar because they have their own bottom action.
const HIDDEN = ['ApplyLoan', 'ApplicationStatus'];

export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index].name;
  if (HIDDEN.includes(current)) return null;
  const active = PARENT[current] ?? current;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {TABS.map((tab) => {
        const isActive = active === tab.name;
        return (
          <Pressable key={tab.name} style={styles.item} onPress={() => navigation.navigate(tab.name)}>
            <View style={[styles.chip, isActive && styles.chipActive]}>
              <Ionicons name={tab.icon} size={21} color={colors.ink} />
            </View>
            <Text style={styles.label}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, height: 56 },
  chip: { width: 40, height: 27, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.soft },
  label: { ...type.nav, color: colors.ink },
});
