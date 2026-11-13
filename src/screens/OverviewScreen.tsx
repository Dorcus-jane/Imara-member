import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';
import DepositLedger from '../components/DepositLedger';
import Screen from '../components/Screen';
import { Card, DarkCard, SoftBox } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { getDeposits, getLoans, getRisk, getTotalSavings } from '../data/api';
import { Deposit, Loan, RiskResult } from '../data/types';
import { colors, type } from '../theme/theme';
import { formatUGX, greeting, timeNow } from '../utils/format';
import { useLoad } from '../utils/useLoad';

export default function OverviewScreen({ navigation }: any) {
  const { member, offline } = useAuth();
  const syncedAt = useRef(timeNow()).current;

  const savings = useLoad(() => getTotalSavings(member.id), [member.id], 0);
  const deposits = useLoad<Deposit[]>(() => getDeposits(member.id), [member.id], []);
  const loans = useLoad<Loan[]>(() => getLoans(member.id), [member.id], []);
  const risk = useLoad<RiskResult | null>(() => getRisk(member.id), [member.id], null);

  const pending = loans.find((l) => l.status === 'Pending');
  const apply = () => navigation.navigate(pending ? 'ApplicationStatus' : 'ApplyLoan', pending ? { loanId: pending.id } : undefined);
  const riskText = !risk
    ? ''
    : risk.label === 'Not enough history'
      ? 'Not enough history  ›'
      : `${risk.score.toFixed(2)} · ${risk.label}  ›`;
  const recent = deposits.slice(0, offline ? 1 : 2);

  return (
    <Screen header={<AppHeader logo onBell={() => navigation.navigate('Notifications')} />}>
      {offline ? (
        <SoftBox>
          <Text style={styles.offlineTitle}>You’re offline</Text>
          <Text style={styles.small}>Showing saved data from {syncedAt}. We’ll refresh when you reconnect.</Text>
        </SoftBox>
      ) : null}

      <View style={{ gap: 2 }}>
        <Text style={styles.greeting}>
          {greeting()}, {member.fullName.split(' ')[0]}
        </Text>
        <Text style={styles.body}>Here’s your financial picture today.</Text>
      </View>

      <DarkCard>
        <Text style={styles.eyebrow}>YOUR TOTAL SAVINGS</Text>
        <Text style={styles.balance}>{formatUGX(savings)}</Text>
        <Text style={styles.onDarkSmall}>Recorded by your SACCO · Updated today</Text>
      </DarkCard>

      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          {offline ? (
            <Pressable style={[styles.action, styles.actionDisabled]}>
              <Text style={[styles.actionText, { color: colors.muted }]}>Connect to apply</Text>
            </Pressable>
          ) : (
            <Pressable onPress={apply} style={styles.action}>
              <Text style={styles.actionText}>Apply for a loan  ↗</Text>
            </Pressable>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Pressable onPress={() => navigation.navigate('Statements')} style={styles.action}>
            <Text style={styles.actionText}>View statement  ↗</Text>
          </Pressable>
        </View>
      </View>

      <Pressable onPress={() => navigation.navigate('RiskScore')} style={styles.risk}>
        <View style={styles.riskTop}>
          <Text style={styles.body}>Your risk score</Text>
          <Text style={styles.riskValue}>{riskText}</Text>
        </View>
        <Text style={styles.small}>See what’s working in your favour.</Text>
      </Pressable>

      <View style={styles.sectionRow}>
        <Text style={styles.section}>Recent deposits</Text>
        <Pressable onPress={() => navigation.navigate('Deposits')}>
          <Text style={styles.link}>View all</Text>
        </Pressable>
      </View>

      <DepositLedger deposits={recent} onPressDeposit={() => navigation.navigate('Deposits')} />

      <Text style={styles.caption}>Synced today at {syncedAt} · Example member data</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { ...type.title, color: colors.ink },
  body: { ...type.body, color: colors.muted },
  small: { ...type.small, color: colors.muted },
  offlineTitle: { ...type.label, color: colors.ink },
  eyebrow: { ...type.eyebrow, color: colors.brass },
  balance: { ...type.balance, color: colors.onDark },
  onDarkSmall: { ...type.small, color: colors.secondaryDark },
  actions: { flexDirection: 'row', gap: 16 },
  action: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionDisabled: { backgroundColor: colors.soft, borderColor: colors.soft },
  actionText: { ...type.label, color: colors.ink },
  risk: { borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 16, paddingVertical: 12, gap: 4 },
  riskTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  riskValue: { ...type.label, color: colors.primary },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { ...type.section, color: colors.ink },
  link: { ...type.label, color: colors.primary },
  caption: { ...type.caption, color: colors.muted },
});
