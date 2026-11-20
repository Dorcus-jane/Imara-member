import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import Row from '../components/Row';
import Screen from '../components/Screen';
import SectionTitle from '../components/SectionTitle';
import { Card, DarkCard, SoftBox } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { getRisk, TODAY } from '../data/api';
import { RiskResult } from '../data/types';
import { colors, fonts, type } from '../theme/theme';
import { formatDate, formatUGX } from '../utils/format';
import { useLoad } from '../utils/useLoad';

export default function RiskScoreScreen({ navigation }: any) {
  const { member } = useAuth();
  const risk = useLoad<RiskResult | null>(() => getRisk(member.id), [member.id], null);
  const hasScore = !!risk && risk.label !== 'Not enough history';

  return (
    <Screen header={<AppHeader title="Credit risk score" onBack={() => navigation.goBack()} />}>
      <DarkCard style={{ gap: 8 }}>
        <View style={styles.topRow}>
          <Text style={styles.eyebrow}>YOUR CREDIT SCORE</Text>
          <Text style={styles.bandBadge}>{risk?.label ?? 'Evaluating'}</Text>
        </View>
        <Text style={styles.score}>{hasScore ? `${risk!.score} / 100` : '— / 100'}</Text>
        <Text style={styles.headline}>{risk?.headline ?? ''}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(hasScore ? risk!.score : 0)}%` }]} />
        </View>
        <Text style={styles.brassSmall}>
          Risk bands: Low (75–100) · Medium (50–74) · High (30–49) · Very high (0–29)
        </Text>
      </DarkCard>

      {/* Borrowing Terms for this Band */}
      {hasScore && risk ? (
        <Card style={{ padding: 18, gap: 10 }}>
          <Text style={styles.cardTitle}>Your borrowing terms</Text>
          <Row label="Loan multiple" value={`${risk.maxLoanLimit ? (risk.maxLoanLimit / risk.savings).toFixed(1) : 3}× savings`} />
          <Row label="Maximum borrowing limit" value={formatUGX(risk.maxLoanLimit ?? 0)} strong />
          <Row label="Applicable interest rate" value={`${risk.interestRate ?? 12}% flat`} />
          <Row label="Credit bureau status" value={risk.crbReport?.status ?? 'Clean'} />
        </Card>
      ) : null}

      <SectionTitle>How your score is calculated</SectionTitle>

      <Card style={{ padding: 16, gap: 16 }}>
        {(risk?.reasons ?? []).map((r) => (
          <View key={r.title} style={{ gap: 2 }}>
            <Text style={styles.factorTitle}>{r.title}</Text>
            <Text style={styles.small}>{r.text}</Text>
          </View>
        ))}
      </Card>

      <SoftBox style={{ padding: 18, gap: 8 }}>
        <Text style={styles.factorTitle}>Fair Lending Protection</Text>
        <Text style={styles.small}>
          In accordance with Uganda SACCO regulations, this score strictly excludes gender, ethnicity, tribe, religion, and location. It is computed purely from your savings consistency, repayment track record, and credit bureau records.
        </Text>
      </SoftBox>

      <Text style={styles.caption}>
        Scoring model: {risk?.modelVersion ?? 'v2.1'} · Computed on {formatDate(TODAY)}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...type.eyebrow, color: colors.brass },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bandBadge: { ...type.caption, color: colors.onDark, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  score: { fontFamily: fonts.manropeMedium, fontSize: 44, lineHeight: 52, letterSpacing: -0.5, color: colors.onDark },
  headline: { ...type.body, color: colors.secondaryDark },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(250,250,244,0.25)', overflow: 'hidden', marginTop: 6 },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.brass },
  brassSmall: { ...type.small, color: colors.brass },
  cardTitle: { ...type.cardTitle, color: colors.ink },
  factorTitle: { ...type.label, color: colors.ink },
  small: { ...type.small, color: colors.muted },
  caption: { ...type.caption, color: colors.muted },
});
