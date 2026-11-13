import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';
import Screen from '../components/Screen';
import { Card, DarkCard } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { getLoans } from '../data/api';
import { Loan, LoanStatus } from '../data/types';
import { colors, fonts, type } from '../theme/theme';
import { formatDate, formatUGX } from '../utils/format';
import { useLoad } from '../utils/useLoad';

const statusColor: Record<LoanStatus, string> = {
  Repaid: colors.success,
  Approved: colors.primary,
  Pending: colors.pending,
  Rejected: colors.danger,
};

function subtitle(loan: Loan): string {
  switch (loan.status) {
    case 'Repaid':
      return `${loan.termMonths} months · Completed ${formatDate(loan.completedDate ?? loan.appliedDate)}`;
    case 'Rejected':
      return `${formatDate(loan.appliedDate)} · ${loan.note ?? 'Contact your SACCO for details.'}`;
    case 'Approved':
      return `${loan.termMonths} months · Approved ${formatDate(loan.decidedDate ?? loan.appliedDate)}`;
    default:
      return `${loan.termMonths} months · Applied ${formatDate(loan.appliedDate)}`;
  }
}

export default function LoansScreen({ navigation }: any) {
  const { member, offline } = useAuth();
  const loans = useLoad<Loan[]>(() => getLoans(member.id), [member.id], []);
  const pending = loans.find((l) => l.status === 'Pending');

  const apply = () =>
    navigation.navigate(pending ? 'ApplicationStatus' : 'ApplyLoan', pending ? { loanId: pending.id } : undefined);

  const open = (loan: Loan) => {
    if (loan.status === 'Pending') navigation.navigate('ApplicationStatus', { loanId: loan.id });
    else if (loan.status !== 'Rejected') navigation.navigate('LoanDetails', { loanId: loan.id });
  };

  return (
    <Screen header={<AppHeader title="Loans" />}>
      <DarkCard style={{ gap: 10 }}>
        <Text style={styles.eyebrow}>A LITTLE SUPPORT. A BIG STEP.</Text>
        <View>
          <Text style={styles.display}>Move your</Text>
          <Text style={styles.display}>plans forward.</Text>
        </View>
        <Text style={styles.heroBody}>Apply, follow your application and keep track of every repayment.</Text>
      </DarkCard>

      <Button
        title={offline ? 'Connect to apply' : 'Apply for a loan  →'}
        variant={offline ? 'disabled' : 'primary'}
        onPress={apply}
      />

      <Text style={styles.section}>Your loan history</Text>

      {loans.length === 0 ? (
        <Card style={{ padding: 20 }}>
          <Text style={styles.small}>You have no loans yet. When you apply, they will appear here.</Text>
        </Card>
      ) : null}

      {loans.map((loan) => (
        <Pressable key={loan.id} onPress={() => open(loan)}>
          <Card style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.type}>{loan.type}</Text>
              <Text style={[styles.status, { color: statusColor[loan.status] }]}>{loan.status}</Text>
            </View>
            <Text style={styles.amount}>{formatUGX(loan.amountRequested)}</Text>
            <Text style={styles.small}>{subtitle(loan)}</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...type.eyebrow, color: colors.brass },
  display: { ...type.display, color: colors.onDark },
  heroBody: { ...type.body, color: colors.secondaryDark },
  section: { ...type.section, color: colors.ink },
  card: { padding: 20, gap: 8 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { ...type.body, color: colors.muted },
  status: { ...type.label },
  amount: { fontFamily: fonts.manropeMedium, fontSize: 28, lineHeight: 36, color: colors.ink, letterSpacing: -0.3 },
  small: { ...type.small, color: colors.muted },
});
