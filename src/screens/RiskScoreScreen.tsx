import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import Screen from '../components/Screen';
import SectionTitle from '../components/SectionTitle';
import { Card, DarkCard, SoftBox } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { getRisk } from '../data/api';
import { RiskResult } from '../data/types';
import { colors, fonts, type } from '../theme/theme';
import { formatDate } from '../utils/format';
import { TODAY } from '../data/api';
import { useLoad } from '../utils/useLoad';

export default function RiskScoreScreen({ navigation }: any) {
  const { member } = useAuth();
  const risk = useLoad<RiskResult | null>(() => getRisk(member.id), [member.id], null);
  const hasScore = !!risk && risk.label !== 'Not enough history';

  return (
    <Screen header={<AppHeader title="Your risk score" onBack={() => navigation.goBack()} />}>
      <DarkCard style={{ gap: 8 }}>
        <Text style={styles.eyebrow}>YOUR REPAYMENT OUTLOOK</Text>
        <Text style={styles.score}>{hasScore ? `${risk!.score.toFixed(2)} / 1` : '— / 1'}</Text>
        <Text style={styles.headline}>{risk?.headline ?? ''}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round((hasScore ? risk!.score : 0) * 100)}%` }]} />
        </View>
        <Text style={styles.brassSmall}>Higher scores suggest more reliable repayment.</Text>
      </DarkCard>

      <SectionTitle>What’s behind your score?</SectionTitle>

      <Card style={{ padding: 16, gap: 16 }}>
        {(risk?.reasons ?? []).map((r) => (
          <View key={r.title} style={{ gap: 2 }}>
            <Text style={styles.factorTitle}>{r.title}</Text>
            <Text style={styles.small}>{r.text}</Text>
          </View>
        ))}
      </Card>

      <SoftBox style={{ padding: 20 }}>
        <Text style={styles.factorTitle}>Advice, not a decision</Text>
        <Text style={styles.small}>
          Your administrator makes the final decision. Your score is never the only reason to decline a loan.
        </Text>
      </SoftBox>

      <Text style={styles.caption}>Updated {formatDate(TODAY)} · Example score</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...type.eyebrow, color: colors.brass },
  score: { fontFamily: fonts.manropeMedium, fontSize: 46, lineHeight: 56, letterSpacing: -0.5, color: colors.onDark },
  headline: { ...type.body, color: colors.secondaryDark },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(250,250,244,0.25)', overflow: 'hidden', marginTop: 6 },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.brass },
  brassSmall: { ...type.small, color: colors.brass },
  factorTitle: { ...type.label, color: colors.ink },
  small: { ...type.small, color: colors.muted },
  caption: { ...type.caption, color: colors.muted },
});
