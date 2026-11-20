import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Row from '../components/Row';
import Screen from '../components/Screen';
import SectionTitle from '../components/SectionTitle';
import { Card, DarkCard, SoftBox } from '../components/Card';
import { getLoan, getLockedSavings, loanOutstanding, nextInstalmentDate, recordRepayment } from '../data/api';
import { Channel, Loan } from '../data/types';
import { colors, fonts, type } from '../theme/theme';
import { formatDate, formatUGX } from '../utils/format';
import { calculateLoanQuote } from '../utils/loanMath';
import { useLoad } from '../utils/useLoad';

export default function LoanDetailsScreen({ navigation, route }: any) {
  const loanId: string = route.params?.loanId;
  const loan = useLoad<Loan | undefined>(() => getLoan(loanId), [loanId], undefined);
  const lockedSavings = useLoad<number>(() => (loan ? getLockedSavings(loan.memberId) : Promise.resolve(0)), [loan], 0);

  const [repayOpen, setRepayOpen] = useState(false);
  const [repayAmountText, setRepayAmountText] = useState('');
  const [repayChannel, setRepayChannel] = useState<Channel>('Mobile money');
  const [submitting, setSubmitting] = useState(false);

  if (!loan) {
    return (
      <Screen header={<AppHeader title="Loan details" onBack={() => navigation.navigate('Loans')} />}>
        <View />
      </Screen>
    );
  }

  const quote = calculateLoanQuote(loan.amountRequested, loan.interestRate, loan.termMonths, loan.appliedDate);
  const outstanding = loan.status === 'Repaid' ? 0 : loanOutstanding(loan);
  const repaid = loan.status === 'Repaid' ? quote.total : loan.repaid;
  const progress = quote.total > 0 ? Math.min(1, repaid / quote.total) : 0;

  const handleRepay = async () => {
    const amt = Number(repayAmountText.replace(/[^0-9]/g, '')) || 0;
    if (amt <= 0) {
      Alert.alert('Amount Required', 'Enter the amount you wish to repay.');
      return;
    }
    setSubmitting(true);
    try {
      await recordRepayment(loan.id, amt, repayChannel);
      setRepayOpen(false);
      setRepayAmountText('');
      Alert.alert('Payment Recorded', `Successfully recorded repayment of ${formatUGX(amt)} via ${repayChannel}.`);
    } catch (e) {
      Alert.alert('Repayment Error', e instanceof Error ? e.message : 'Could not process repayment.');
    } finally {
      setSubmitting(false);
    }
  };

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
          {formatUGX(repaid)} repaid of {formatUGX(quote.total)}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </DarkCard>

      {/* Next Instalment and Quick Repay Action */}
      {loan.status === 'Approved' || loan.status === 'Overdue' ? (
        <SoftBox style={{ padding: 20, gap: 10 }}>
          <View style={styles.top}>
            <Text style={styles.muted}>Next instalment due</Text>
            <Text style={styles.value}>{formatDate(nextInstalmentDate(loan))}</Text>
          </View>
          <Text style={styles.instalment}>{formatUGX(quote.monthly)}</Text>
          <Text style={styles.small}>
            Repay via Mobile Money or dial *123# on your registered SIM. Payments clear overdue penalties and fees first, then interest, then principal.
          </Text>
          <Button
            title="Make a repayment  →"
            onPress={() => {
              setRepayAmountText(String(quote.monthly));
              setRepayOpen(true);
            }}
          />
        </SoftBox>
      ) : null}

      {/* Collateral Security Box */}
      <Card style={{ padding: 18, gap: 8 }}>
        <Text style={styles.cardTitle}>Loan Security</Text>
        <Row
          label="Locked savings"
          value={loan.status === 'Repaid' ? 'UGX 0 (Released)' : formatUGX(lockedSavings)}
          strong
        />
        <Text style={styles.small}>
          {loan.status === 'Repaid'
            ? 'All locked savings have been fully released back to your available balance.'
            : 'Locked savings cannot be withdrawn until this loan is fully repaid.'}
        </Text>
      </Card>

      {/* Cost Breakdown */}
      <Card style={{ padding: 20, gap: 12 }}>
        <Text style={styles.cardTitle}>Loan cost breakdown</Text>
        <Row label="Principal borrowed" value={formatUGX(loan.amountRequested)} />
        <Row label={`Interest · ${loan.interestRate}% flat`} value={formatUGX(quote.interest)} />
        <Row label="Origination fee (2%)" value={formatUGX(quote.originationFee)} />
        <Row label="Disbursement transfer fee" value={formatUGX(quote.transactionFee)} />
        <Row label="Repayment term" value={`${loan.termMonths} months`} />
        <Row label="Monthly instalment" value={formatUGX(quote.monthly)} />
        <Row label="Total repaid" value={formatUGX(repaid)} />
        <Row label="Total to repay" value={formatUGX(quote.total)} strong />
      </Card>

      {/* Instalment Schedule Preview */}
      {loan.schedule && loan.schedule.length > 0 ? (
        <Card style={{ padding: 20, gap: 12 }}>
          <Text style={styles.cardTitle}>Instalment schedule</Text>
          {loan.schedule.map((item) => (
            <View key={item.instalmentNumber} style={styles.scheduleRow}>
              <View>
                <Text style={styles.scheduleText}>
                  Month {item.instalmentNumber} · Due {formatDate(item.dueDate)}
                </Text>
                <Text style={styles.small}>
                  Principal {formatUGX(item.principal)} + Interest {formatUGX(item.interest)}
                </Text>
              </View>
              <Text
                style={[
                  styles.scheduleStatus,
                  item.status === 'Paid' && { color: colors.success },
                  item.status === 'Overdue' && { color: colors.danger },
                ]}
              >
                {item.status === 'Paid' ? `Paid ✓` : formatUGX(item.totalDue)}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      <SectionTitle>Repayment history</SectionTitle>
      <Text style={styles.body}>
        {loan.status === 'Repaid'
          ? `Repaid in full on ${formatDate(loan.completedDate ?? loan.appliedDate)}.`
          : repaid > 0
            ? `${formatUGX(repaid)} paid to date. Remaining balance: ${formatUGX(outstanding)}.`
            : 'No repayments recorded yet. Pay via mobile money or USSD *123#.'}
      </Text>

      {/* Make Repayment Dialog */}
      <Dialog visible={repayOpen} onClose={() => setRepayOpen(false)}>
        <Text style={styles.dialogTitle}>Make a repayment</Text>
        <Text style={styles.body}>
          Payments clear overdue penalties and fees first, then interest, and finally loan principal.
        </Text>
        <Field
          label="Repayment amount (UGX)"
          value={repayAmountText}
          onChangeText={setRepayAmountText}
          keyboardType="number-pad"
          placeholder="50,000"
        />
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Select payment channel</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['Mobile money', 'USSD', 'Till'] as Channel[]).map((c) => (
              <Button
                key={c}
                title={c}
                variant={repayChannel === c ? 'primary' : 'outline'}
                onPress={() => setRepayChannel(c)}
              />
            ))}
          </View>
        </View>
        <Button
          title={`Pay ${repayAmountText ? formatUGX(Number(repayAmountText) || 0) : ''} now`}
          onPress={handleRepay}
          loading={submitting}
        />
        <Button title="Cancel" variant="outline" onPress={() => setRepayOpen(false)} />
      </Dialog>
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
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  scheduleText: { ...type.label, color: colors.ink },
  scheduleStatus: { ...type.label, color: colors.muted },
  dialogTitle: { fontFamily: fonts.manropeSemiBold, fontSize: 20, color: colors.ink },
  label: { ...type.label, color: colors.ink },
});
