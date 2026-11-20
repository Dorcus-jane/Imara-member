import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import BottomAction from '../components/BottomAction';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Row from '../components/Row';
import Screen from '../components/Screen';
import { Card, SoftBox } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { appealLoanDecision, getLoans, previewDecision } from '../data/api';
import { Loan } from '../data/types';
import { colors, fonts, type } from '../theme/theme';
import { formatDate, formatUGX } from '../utils/format';
import { useLoad } from '../utils/useLoad';

export default function ApplicationStatusScreen({ navigation, route }: any) {
  const { member } = useAuth();
  const loanId: string | undefined = route.params?.loanId;
  const [busy, setBusy] = useState(false);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);

  const loan = useLoad<Loan | undefined>(
    async () => {
      const all = await getLoans(member.id);
      return all.find((l) => l.id === loanId) ?? all.find((l) => l.status === 'Pending') ?? all[0];
    },
    [member.id, loanId],
    undefined,
  );

  const previewApproval = async () => {
    if (!loan) return;
    setBusy(true);
    try {
      await previewDecision(loan.id);
      navigation.navigate('LoanDetails', { loanId: loan.id });
    } finally {
      setBusy(false);
    }
  };

  const handleAppeal = async () => {
    if (!loan) return;
    if (!appealReason.trim()) {
      Alert.alert('Appeal Reason Required', 'Please provide a justification for reviewing this loan application.');
      return;
    }
    setAppealSubmitting(true);
    try {
      await appealLoanDecision(loan.id, appealReason);
      setAppealOpen(false);
      Alert.alert('Appeal Received', 'Your appeal has been queued for review by the SACCO credit committee.');
    } catch (e) {
      Alert.alert('Appeal Error', e instanceof Error ? e.message : 'Could not submit appeal.');
    } finally {
      setAppealSubmitting(false);
    }
  };

  const isRejected = loan?.status === 'Rejected';
  const isApproved = loan?.status === 'Approved';

  return (
    <Screen
      header={<AppHeader title="Application status" onBack={() => navigation.navigate('Loans')} />}
      footer={<BottomAction title="Back to loans  →" onPress={() => navigation.navigate('Loans')} />}
    >
      <SoftBox style={{ padding: 20, gap: 10 }}>
        <Text style={[styles.eyebrow, isRejected && { color: colors.danger }, isApproved && { color: colors.success }]}>
          {isApproved ? 'LOAN APPROVED' : isRejected ? 'APPLICATION NOT APPROVED' : 'APPLICATION UNDER REVIEW'}
        </Text>
        <View>
          <Text style={styles.display}>
            {isApproved ? 'Ready to move' : isRejected ? 'Decision' : 'You’re one'}
          </Text>
          <Text style={styles.display}>
            {isApproved ? 'forward.' : isRejected ? 'explained.' : 'step closer.'}
          </Text>
        </View>
        <Text style={styles.body}>
          {isApproved
            ? 'Your application passed automated risk checks and has been approved.'
            : isRejected
              ? 'Our automated lending rules could not approve this request at this time.'
              : 'Your SACCO Credit Committee is reviewing your request in the committee review queue.'}
        </Text>
      </SoftBox>

      {loan ? (
        <Card style={{ padding: 20, gap: 12 }}>
          <View style={styles.top}>
            <Text style={styles.body}>{loan.type}</Text>
            <Text
              style={[
                styles.status,
                {
                  color: isApproved ? colors.success : isRejected ? colors.danger : colors.pending,
                },
              ]}
            >
              {loan.status}
            </Text>
          </View>
          <Text style={styles.amount}>{formatUGX(loan.amountRequested)}</Text>
          <Row label="Term" value={`${loan.termMonths} months`} />
          <Row label="Purpose" value={loan.purpose} />
          <Row label="Applied" value={formatDate(loan.appliedDate)} />
          {loan.riskBand ? <Row label="Risk band" value={loan.riskBand} /> : null}
          {loan.appealStatus && loan.appealStatus !== 'None' ? (
            <Row label="Appeal status" value={`${loan.appealStatus} in review`} strong />
          ) : null}
        </Card>
      ) : null}

      {/* Top 3 Decline Reasons */}
      {isRejected && loan?.declineReasons && loan.declineReasons.length > 0 ? (
        <Card style={{ padding: 20, gap: 12, borderColor: colors.danger }}>
          <Text style={[styles.cardTitle, { color: colors.danger }]}>Reasons for this decision</Text>
          {loan.declineReasons.slice(0, 3).map((reason, idx) => (
            <View key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Text style={{ ...type.label, color: colors.danger }}>{idx + 1}.</Text>
              <Text style={{ ...type.small, color: colors.ink, flex: 1 }}>{reason}</Text>
            </View>
          ))}
          <Button
            title="Appeal this decision  ↗"
            variant="outline"
            onPress={() => setAppealOpen(true)}
          />
        </Card>
      ) : null}

      {/* Application Journey Tracker */}
      <Card style={{ padding: 20, gap: 12 }}>
        <Text style={styles.cardTitle}>Your application journey</Text>
        <Text style={styles.stepDone}>✓  Application submitted & credit history checked</Text>
        <Text style={isApproved || isRejected ? styles.stepDone : styles.stepNow}>
          {isApproved ? '✓  Approved based on credit criteria' : isRejected ? '✗  Decision reached' : '◷  In committee review queue'}
        </Text>
        <Text style={isApproved ? styles.stepDone : isRejected ? styles.stepDone : styles.stepNext}>
          {isApproved ? '✓  Funds ready & savings security reserved' : isRejected ? '○  Appeal option available' : '○  Decision and notification'}
        </Text>
      </Card>

      {!isApproved && !isRejected ? (
        <Pressable onPress={previewApproval} disabled={busy || !loan}>
          <Text style={styles.demo}>Demo: simulate committee approval override →</Text>
        </Pressable>
      ) : null}

      {/* Appeal Dialog */}
      <Dialog visible={appealOpen} onClose={() => setAppealOpen(false)}>
        <Text style={styles.dialogTitle}>Appeal loan decision</Text>
        <Text style={styles.body}>
          Under SACCO policy, you have the right to appeal a declined application for independent review by the Credit Committee.
        </Text>
        <Field
          label="Explain your circumstances or new collateral"
          value={appealReason}
          onChangeText={setAppealReason}
          placeholder="e.g., I have added business assets and a registered guarantor."
          multiline
        />
        <Button
          title="Submit appeal for review"
          onPress={handleAppeal}
          loading={appealSubmitting}
        />
        <Button title="Cancel" variant="outline" onPress={() => setAppealOpen(false)} />
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...type.eyebrow, color: colors.primary },
  display: { ...type.display, color: colors.ink },
  body: { ...type.body, color: colors.muted },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { ...type.label },
  amount: { fontFamily: fonts.manropeMedium, fontSize: 30, lineHeight: 38, color: colors.ink, letterSpacing: -0.3 },
  cardTitle: { ...type.cardTitle, color: colors.ink },
  stepDone: { ...type.label, color: colors.ink },
  stepNow: { ...type.label, color: colors.pending },
  stepNext: { ...type.label, color: colors.muted },
  small: { ...type.small, color: colors.muted },
  demo: { ...type.label, color: colors.ink },
  dialogTitle: { fontFamily: fonts.manropeSemiBold, fontSize: 20, color: colors.ink },
});
