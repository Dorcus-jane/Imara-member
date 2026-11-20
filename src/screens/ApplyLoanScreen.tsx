import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import BottomAction from '../components/BottomAction';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Screen from '../components/Screen';
import { Card } from '../components/Card';
import Row from '../components/Row';
import { useAuth } from '../context/AuthContext';
import {
  applyForLoan,
  FIRST_LOAN_CAP,
  getLoans,
  getRisk,
  getTotalSavings,
  MIN_LOAN,
  TERM_OPTIONS,
} from '../data/api';
import { RiskResult } from '../data/types';
import { colors, fonts, radius, type } from '../theme/theme';
import { formatDate, formatNumber, formatUGX } from '../utils/format';
import { calculateLoanQuote } from '../utils/loanMath';

export default function ApplyLoanScreen({ navigation }: any) {
  const { member, offline } = useAuth();
  const [amountText, setAmountText] = useState('200000');
  const [term, setTerm] = useState(12);
  const [purpose, setPurpose] = useState('');
  const [savings, setSavings] = useState(0);
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [crbConsent, setCrbConsent] = useState(true);
  const [termOpen, setTermOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTotalSavings(member.id).then(setSavings);
    getRisk(member.id).then(setRisk);
    getLoans(member.id).then((all) => {
      setIsFirstTime(!all.some((l) => l.status === 'Repaid'));
    });
  }, [member.id]);

  useFocusEffect(
    useCallback(() => {
      setError('');
    }, []),
  );

  const amount = Number(amountText.replace(/[^0-9]/g, '')) || 0;
  const rate = risk?.interestRate || 12;
  const quote = calculateLoanQuote(amount, rate, term);

  let limit = risk?.maxLoanLimit || savings * 3;
  if (isFirstTime) {
    limit = Math.min(limit, FIRST_LOAN_CAP);
  }
  const overLimit = amount > limit && amount > 0;
  const underMin = amount < MIN_LOAN && amount > 0;

  const submit = async () => {
    setError('');
    if (offline) {
      setError('You are offline. Connect to apply.');
      return;
    }
    if (amount <= 0) {
      setError('Enter the amount you want to borrow.');
      return;
    }
    if (!crbConsent) {
      setError('You must consent to a Credit Reference Bureau (CRB) inquiry to submit a loan application.');
      return;
    }
    setLoading(true);
    try {
      const loan = await applyForLoan(member.id, amount, term, purpose, crbConsent);
      navigation.navigate('ApplicationStatus', { loanId: loan.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      header={<AppHeader title="Apply for a loan" onBack={() => navigation.navigate('Loans')} />}
      footer={<BottomAction title="Submit application  →" onPress={submit} loading={loading} />}
    >
      <View style={{ gap: 8 }}>
        <Text style={styles.heading}>Tell us what you need</Text>
        <Text style={styles.body}>Instant review based on your SACCO credit score and savings.</Text>
      </View>

      <View style={{ gap: 8 }}>
        <Field
          label="Loan amount (UGX)"
          value={amountText ? formatNumber(amount) : ''}
          onChangeText={setAmountText}
          placeholder="200,000"
          keyboardType="number-pad"
        />
        <Text style={[styles.caption, (overLimit || underMin) && { color: colors.danger }]}>
          {underMin
            ? `Minimum loan amount is ${formatUGX(MIN_LOAN)}.`
            : overLimit
              ? `Above your limit of ${formatUGX(limit)}. SACCO rules cap borrowing at this tier.`
              : `Your borrowing limit: ${formatUGX(limit)} · ${isFirstTime ? 'First-time borrower tier' : `${risk?.label || 'Standard'}`}`}
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>Repayment term</Text>
        <Pressable onPress={() => setTermOpen(true)} style={styles.select}>
          <Text style={styles.selectText}>{term} months</Text>
          <Ionicons name="chevron-down" size={14} color={colors.ink} />
        </Pressable>
      </View>

      <Field
        label="What is the loan for?"
        value={purpose}
        onChangeText={setPurpose}
        placeholder="Expand my produce stall"
        multiline
      />

      <Card style={{ padding: 20, gap: 12 }}>
        <View style={styles.between}>
          <Text style={styles.cardTitle}>Full cost disclosure</Text>
          <Text style={styles.bandBadge}>{risk?.label ?? 'Evaluating'}</Text>
        </View>

        <Row label={`Interest rate (${risk?.label ?? 'Tier'})`} value={`${rate}% flat`} />
        <Row label="Total interest" value={formatUGX(quote.interest)} />
        <Row label="Origination fee (2% capped at 3%)" value={formatUGX(quote.originationFee)} />
        <Row label="Mobile money transfer fee" value={formatUGX(quote.transactionFee)} />
        <View style={styles.divider} />
        <Row label="Total repayable" value={formatUGX(quote.total)} strong />
        <Row label="Monthly instalment" value={formatUGX(quote.monthly)} strong />

        <Pressable onPress={() => setScheduleOpen(true)} style={styles.scheduleLink}>
          <Text style={styles.scheduleLinkText}>Preview repayment schedule & due dates →</Text>
        </Pressable>
      </Card>

      <Pressable onPress={() => setCrbConsent(!crbConsent)} style={styles.consentRow}>
        <View style={[styles.checkbox, crbConsent && styles.checkboxActive]}>
          {crbConsent ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
        </View>
        <Text style={styles.consentText}>
          I authorise Imara SACCO to query my credit status from the Credit Reference Bureau (CRB) as required for loan assessment.
        </Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.small}>
        Loans are funded from pooled member savings. Savings up to 1/3 of the loan will be locked as loan security during the repayment period.
      </Text>

      {/* Repayment Term Picker */}
      <Dialog visible={termOpen} onClose={() => setTermOpen(false)}>
        <Text style={styles.dialogTitle}>Repayment term</Text>
        <View style={{ gap: 12 }}>
          {TERM_OPTIONS.map((t) => (
            <Button
              key={t}
              title={`${t} month${t > 1 ? 's' : ''}`}
              variant="outline"
              onPress={() => {
                setTerm(t);
                setTermOpen(false);
              }}
            />
          ))}
        </View>
      </Dialog>

      {/* Due Date Schedule Modal */}
      <Dialog visible={scheduleOpen} onClose={() => setScheduleOpen(false)}>
        <Text style={styles.dialogTitle}>Repayment schedule</Text>
        <Text style={styles.body}>Individual instalments with due dates:</Text>
        <View style={{ gap: 8, maxHeight: 300 }}>
          {quote.schedule.map((item) => (
            <View key={item.instalmentNumber} style={styles.scheduleItem}>
              <View>
                <Text style={styles.scheduleMonth}>Month {item.instalmentNumber}</Text>
                <Text style={styles.small}>Due {formatDate(item.dueDate)}</Text>
              </View>
              <Text style={styles.scheduleAmount}>{formatUGX(item.totalDue)}</Text>
            </View>
          ))}
        </View>
        <Button title="Close" onPress={() => setScheduleOpen(false)} />
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { ...type.title, color: colors.ink },
  body: { ...type.body, color: colors.muted },
  label: { ...type.label, color: colors.ink },
  caption: { ...type.caption, color: colors.muted },
  small: { ...type.small, color: colors.muted },
  error: { ...type.body, color: colors.danger },
  cardTitle: { ...type.cardTitle, color: colors.ink },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bandBadge: { ...type.caption, color: colors.primary, backgroundColor: colors.soft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 4 },
  select: {
    height: 52,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: { ...type.body, color: colors.ink },
  dialogTitle: { fontFamily: fonts.manropeSemiBold, fontSize: 22, color: colors.ink },
  scheduleLink: { paddingTop: 6 },
  scheduleLinkText: { ...type.label, color: colors.primary, fontSize: 12 },
  scheduleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  scheduleMonth: { ...type.label, color: colors.ink },
  scheduleAmount: { ...type.label, color: colors.primary },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 6 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  consentText: { ...type.small, color: colors.ink, flex: 1, lineHeight: 18 },
});
