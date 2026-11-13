import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import Row from '../components/Row';
import Screen from '../components/Screen';
import SectionTitle from '../components/SectionTitle';
import { Card, DarkCard, SoftBox } from '../components/Card';
import { getLoan, loanOutstanding, nextInstalmentDate } from '../data/api';
import { Loan } from '../data/types';
import { colors, fonts, type } from '../theme/theme';
import { formatDate, formatUGX } from '../utils/format';
import { loanTotals } from '../utils/loanMath';
import { useLoad } from '../utils/useLoad';

export default function LoanDetailsScreen({ navigation, route }: any) {
  const loanId: string = route.params?.loanId;
  const loan = useLoad<Loan | undefined>(() => getLoan(loanId), [loanId], undefined);

  if (!loan) {
    return <Screen header={<AppHeader title="Loan details" onBack={() => navigation.navigate('Loans')} />}><View /></Screen>;
  }

  const totals = loanTotals(loan.amountRequested, loan.interestRate, loan.termMonths);
  const outstanding = loan.status === 'Repaid' ? 0 : loanOutstanding(loan);
  const repaid = loan.status === 'Repaid' ? totals.total : loan.repaid;
  const progress = totals.total > 0 ? Math.min(1, repaid / totals.total) : 0;

  return (
    <Screen header={<AppHeader title="Loan details" onBack={() => navigation.navigate('Loans')} />}>
      <DarkCard style={{ gap: 8 }}>
        <View style={styles.top}>
          <Text style={styles.onDark}>{loan.type}</Text>
          <Text style={styles.onDarkStrong}>{loan.status}</Text>
        </View>
        <Text style={styles.eyebrow}>OUTSTANDING BALANCE</Text>
        <Text style={styles.balance}>{formatUGX(outstanding)}</Text>
        <Text style={styles.onDarkSmall}>
          {formatUGX(repaid)} repaid of {formatUGX(totals.total)}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </DarkCard>

      {loan.status === 'Approved' ? (
        <SoftBox style={{ padding: 20, gap: 10 }}>
          <View style={styles.top}>
            <Text style={styles.muted}>Next instalment</Text>
            <Text style={styles.value}>{formatDate(nextInstalmentDate(loan))}</Text>
          </View>
          <Text style={styles.instalment}>{formatUGX(totals.monthly)}</Text>
          <Text style={styles.small}>
            Arrange repayment with your SACCO. Your administrator records payments.
          </Text>
        </SoftBox>
      ) : null}

      <Card style={{ padding: 20, gap: 12 }}>
        <Text style={styles.cardTitle}>Your loan at a glance</Text>
        <Row label="Amount borrowed" value={formatUGX(loan.amountRequested)} />
        <Row label={`Interest · ${loan.interestRate}% flat`} value={formatUGX(totals.interest)} />
        <Row label="Repayment term" value={`${loan.termMonths} months`} />
        <Row label="Monthly instalment" value={formatUGX(totals.monthly)} />
        <Row label="Total repaid" value={formatUGX(repaid)} />
        <Row label="Total to repay" value={formatUGX(totals.total)} strong />
      </Card>

      <SectionTitle>Repayment history</SectionTitle>
      <Text style={styles.body}>
        {loan.status === 'Repaid'
          ? `Repaid in full on ${formatDate(loan.completedDate ?? loan.appliedDate)}.`
          : 'No repayments recorded yet. They’ll appear here after your administrator records them.'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  onDark: { ...type.body, color: colors.secondaryDark },
  onDarkStrong: { ...type.label, color: colors.onDark },
  eyebrow: { ...type.eyebrow, color: colors.brass, marginTop: 4 },
  balance: { fontFamily: fonts.manropeMedium, fontSize: 36, lineHeight: 44, letterSpacing: -0.5, color: colors.onDark },
  onDarkSmall: { ...type.small, color: colors.secondaryDark },
  track: { height: 5, borderRadius: 3, backgroundColor: 'rgba(250,250,244,0.25)', overflow: 'hidden', marginTop: 4 },
  fill: { height: 5, borderRadius: 3, backgroundColor: colors.brass },
  muted: { ...type.body, color: colors.muted },
  value: { ...type.label, color: colors.ink },
  instalment: { fontFamily: fonts.manropeMedium, fontSize: 28, lineHeight: 36, color: colors.ink, letterSpacing: -0.3 },
  small: { ...type.small, color: colors.muted },
  body: { ...type.body, color: colors.muted },
  cardTitle: { ...type.cardTitle, color: colors.ink },
});
