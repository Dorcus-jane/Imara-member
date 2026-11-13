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
import { applyForLoan, getTotalSavings, INTEREST_RATE, MAX_LOAN_MULTIPLE, TERM_OPTIONS } from '../data/api';
import { colors, fonts, radius, type } from '../theme/theme';
import { formatNumber, formatUGX } from '../utils/format';
import { loanTotals } from '../utils/loanMath';

export default function ApplyLoanScreen({ navigation }: any) {
  const { member, offline } = useAuth();
  const [amountText, setAmountText] = useState('');
  const [term, setTerm] = useState(12);
  const [purpose, setPurpose] = useState('');
  const [savings, setSavings] = useState(0);
  const [termOpen, setTermOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTotalSavings(member.id).then(setSavings);
  }, [member.id]);

  // Start with a clean form every time the screen opens.
  useFocusEffect(
    useCallback(() => {
      setAmountText('');
      setPurpose('');
      setTerm(12);
      setError('');
    }, []),
  );

  const amount = Number(amountText.replace(/[^0-9]/g, '')) || 0;
  const limit = savings * MAX_LOAN_MULTIPLE;
  const overLimit = amount > limit && amount > 0;
  const totals = loanTotals(amount, INTEREST_RATE, term);

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
    setLoading(true);
    try {
      const loan = await applyForLoan(member.id, amount, term, purpose);
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
        <Text style={styles.body}>Your SACCO makes the final lending decision.</Text>
      </View>

      <View style={{ gap: 8 }}>
        <Field
          label="Loan amount (UGX)"
          value={amountText ? formatNumber(amount) : ''}
          onChangeText={setAmountText}
          placeholder="200,000"
          keyboardType="number-pad"
        />
        <Text style={[styles.caption, overLimit && { color: colors.danger }]}>
          {overLimit
            ? `Above your limit of ${formatUGX(limit)}. The SACCO may decline it.`
            : `Example limit: ${formatUGX(limit)} · ${MAX_LOAN_MULTIPLE}× your saving`}
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
        <Text style={styles.cardTitle}>Your repayment estimate</Text>
        <Row label={`Interest · ${INTEREST_RATE}% flat`} value={formatUGX(totals.interest)} />
        <Row label="Total to repay" value={formatUGX(totals.total)} />
        <Row label="Monthly instalment" value={formatUGX(totals.monthly)} strong />
        <Text style={styles.caption}>Final instalment adjusted for rounding.</Text>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.small}>
        By submitting, you agree to SACCO lending terms. This is a request, not a loan approval.
      </Text>

      <Dialog visible={termOpen} onClose={() => setTermOpen(false)}>
        <Text style={styles.dialogTitle}>Repayment term</Text>
        <View style={{ gap: 12 }}>
          {TERM_OPTIONS.map((t) => (
            <Button
              key={t}
              title={`${t} months`}
              variant="outline"
              onPress={() => {
                setTerm(t);
                setTermOpen(false);
              }}
            />
          ))}
        </View>
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
});
