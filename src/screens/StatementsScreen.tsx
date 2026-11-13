import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Row from '../components/Row';
import Screen from '../components/Screen';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { getStatement, getStatementMonths } from '../data/api';
import { StatementData } from '../data/types';
import { colors, fonts, type } from '../theme/theme';
import { formatMonthLabel, formatUGX } from '../utils/format';
import { downloadStatementPdf, shareStatement } from '../utils/statementExport';
import { useLoad } from '../utils/useLoad';

export default function StatementsScreen() {
  const { member } = useAuth();
  const months = useLoad<string[]>(() => getStatementMonths(member.id), [member.id], []);
  const [monthKey, setMonthKey] = useState<string | undefined>(undefined);
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getStatement(member.id, monthKey).then((s) => {
      if (active) setStatement(s);
    });
    return () => {
      active = false;
    };
  }, [member.id, monthKey]);

  const run = async (action: () => Promise<void>) => {
    if (!statement) return;
    setBusy(true);
    try {
      await action();
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen header={<AppHeader title="Statements" />}>
      <View style={{ gap: 8 }}>
        <Text style={styles.heading}>Your money, in one place.</Text>
        <Text style={styles.body}>View and share your account activity.</Text>
      </View>

      <Pressable onPress={() => setPickerOpen(true)}>
        <Card style={{ padding: 20, gap: 10 }}>
          <View style={styles.top}>
            <Text style={styles.body}>Statement period</Text>
            <View style={styles.periodValue}>
              <Text style={styles.value}>{statement?.monthLabel ?? ''}</Text>
              <Ionicons name="chevron-down" size={12} color={colors.ink} />
            </View>
          </View>
          <Text style={styles.small}>{statement?.rangeLabel ?? ''}</Text>
        </Card>
      </Pressable>

      {statement ? (
        <Card style={{ padding: 20, gap: 12 }}>
          <Text style={styles.eyebrow}>IMARA SACCO</Text>
          <Text style={styles.statementTitle}>Member statement</Text>
          <Text style={styles.body}>
            {statement.member.fullName} · {statement.member.memberNumber}
          </Text>
          <Row label="Opening savings" value={formatUGX(statement.opening)} />
          <Row label="Deposits this period" value={formatUGX(statement.depositsInPeriod)} />
          <Row label="Closing savings" value={formatUGX(statement.closing)} strong />
          <View style={styles.divider} />
          <Row label="Loans approved" value={formatUGX(statement.loansApproved)} />
          <Row label="Repayments" value={formatUGX(statement.repayments)} />
          <Text style={styles.caption}>Updated 12 Nov 2026 · Example data</Text>
        </Card>
      ) : null}

      <Button title="Share statement  ↗" onPress={() => run(() => shareStatement(statement!))} loading={busy} />
      <Button title="Download PDF" variant="outline" onPress={() => run(() => downloadStatementPdf(statement!))} />

      <Text style={styles.small}>
        Your statement contains personal financial information. Share it only with people you trust.
      </Text>

      <Dialog visible={pickerOpen} onClose={() => setPickerOpen(false)}>
        <Text style={styles.dialogTitle}>Statement period</Text>
        <View style={{ gap: 12 }}>
          {months.map((key) => (
            <Button
              key={key}
              title={formatMonthLabel(key)}
              variant="outline"
              onPress={() => {
                setMonthKey(key);
                setPickerOpen(false);
              }}
            />
          ))}
        </View>
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: fonts.manropeSemiBold, fontSize: 22, lineHeight: 30, color: colors.ink },
  body: { ...type.body, color: colors.muted },
  small: { ...type.small, color: colors.muted },
  caption: { ...type.caption, color: colors.muted },
  value: { ...type.label, color: colors.ink },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  periodValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrow: { ...type.eyebrow, color: colors.muted },
  statementTitle: { fontFamily: fonts.manropeSemiBold, fontSize: 24, lineHeight: 32, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.line },
  dialogTitle: { fontFamily: fonts.manropeSemiBold, fontSize: 22, color: colors.ink },
});
