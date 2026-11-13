import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import BottomAction from '../components/BottomAction';
import Button from '../components/Button';
import Row from '../components/Row';
import Screen from '../components/Screen';
import { Card, SoftBox } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { getLoans, previewDecision } from '../data/api';
import { Loan } from '../data/types';
import { colors, fonts, type } from '../theme/theme';
import { formatDate, formatUGX } from '../utils/format';
import { useLoad } from '../utils/useLoad';

export default function ApplicationStatusScreen({ navigation, route }: any) {
  const { member } = useAuth();
  const loanId: string | undefined = route.params?.loanId;
  const [busy, setBusy] = useState(false);
  const loan = useLoad<Loan | undefined>(
    async () => {
      const all = await getLoans(member.id);
      return all.find((l) => l.id === loanId) ?? all.find((l) => l.status === 'Pending');
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

  return (
    <Screen
      header={<AppHeader title="Application status" onBack={() => navigation.navigate('Loans')} />}
      footer={<BottomAction title="Back to loans  →" onPress={() => navigation.navigate('Loans')} />}
    >
      <SoftBox style={{ padding: 20, gap: 10 }}>
        <Text style={styles.eyebrow}>APPLICATION RECEIVED</Text>
        <View>
          <Text style={styles.display}>You’re one</Text>
          <Text style={styles.display}>step closer.</Text>
        </View>
        <Text style={styles.body}>Your SACCO is reviewing your request. We’ll notify you when a decision is made.</Text>
      </SoftBox>

      {loan ? (
        <Card style={{ padding: 20, gap: 12 }}>
          <View style={styles.top}>
            <Text style={styles.body}>{loan.type}</Text>
            <Text style={[styles.status, { color: colors.pending }]}>{loan.status}</Text>
          </View>
          <Text style={styles.amount}>{formatUGX(loan.amountRequested)}</Text>
          <Row label="Term" value={`${loan.termMonths} months`} />
          <Row label="Purpose" value={loan.purpose} />
          <Row label="Applied" value={formatDate(loan.appliedDate)} />
        </Card>
      ) : null}

      <Card style={{ padding: 20, gap: 12 }}>
        <Text style={styles.cardTitle}>Your application journey</Text>
        <Text style={styles.stepDone}>✓  Application submitted</Text>
        <Text style={styles.stepNow}>◷  Under review by your SACCO</Text>
        <Text style={styles.stepNext}>○  Decision and notification</Text>
      </Card>

      <Button title="New application unavailable" variant="disabled" />
      <Text style={styles.small}>
        You can apply again once this request has a decision. This helps prevent duplicate applications.
      </Text>

      <Pressable onPress={previewApproval} disabled={busy || !loan}>
        <Text style={styles.demo}>Demo: preview SACCO decision →</Text>
      </Pressable>
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
});
