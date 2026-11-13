import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';
import Row from '../components/Row';
import Screen from '../components/Screen';
import SupportDialog from '../components/SupportDialog';
import { Card, DarkCard } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { getRisk, requestPasswordReset } from '../data/api';
import { RiskResult } from '../data/types';
import { colors, type } from '../theme/theme';
import { formatDate, maskPhone } from '../utils/format';
import { useLoad } from '../utils/useLoad';

export default function ProfileScreen({ navigation }: any) {
  const { member, signOut, offline, toggleOffline } = useAuth();
  const risk = useLoad<RiskResult | null>(() => getRisk(member.id), [member.id], null);
  const [supportOpen, setSupportOpen] = useState(false);

  const sendReset = async () => {
    try {
      await requestPasswordReset(member.email);
      Alert.alert('Reset link sent', `A password reset link is on its way to ${member.email}. (Demo: no email is sent.)`);
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const riskText = !risk
    ? ''
    : risk.label === 'Not enough history'
      ? 'Not enough history  ›'
      : `${risk.score.toFixed(2)} · ${risk.label}  ›`;

  return (
    <Screen header={<AppHeader title="Profile" />}>
      <DarkCard style={{ gap: 10 }}>
        <Text style={styles.eyebrow}>IMARA MEMBER</Text>
        <Text style={styles.name}>{member.fullName}</Text>
        <Text style={styles.onDark}>{member.memberNumber} · Active member</Text>
      </DarkCard>

      <Card style={{ padding: 20, gap: 12 }}>
        <Text style={styles.cardTitle}>Your details</Text>
        <Row label="Email" value={member.email} />
        <Row label="Phone" value={maskPhone(member.phone)} />
        <Row label="Member since" value={formatDate(member.joinedDate)} />
        <Text style={styles.small}>To update your details, contact your SACCO administrator.</Text>
      </Card>

      <Card style={{ padding: 20, gap: 16 }}>
        <LinkRow label="Your risk score" value={riskText} onPress={() => navigation.navigate('RiskScore')} />
        <LinkRow label="Notifications" value="View updates  ›" onPress={() => navigation.navigate('Notifications')} />
        <LinkRow label="Password" value="Reset password  ›" onPress={sendReset} />
        <LinkRow label="Help & support" value="Contact SACCO  ›" onPress={() => setSupportOpen(true)} />
      </Card>

      <Button title="Sign out" variant="outline" danger onPress={signOut} />

      <Pressable onPress={toggleOffline}>
        <Text style={styles.demo}>{offline ? 'Demo: back online →' : 'Demo: preview offline mode →'}</Text>
      </Pressable>

      <SupportDialog visible={supportOpen} onClose={() => setSupportOpen(false)} />
    </Screen>
  );

}

function LinkRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.linkRow}>
      <Text style={styles.body}>{label}</Text>
      <Text style={styles.linkValue}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...type.eyebrow, color: colors.brass },
  name: { ...type.display, fontSize: 36, lineHeight: 42, color: colors.onDark },
  onDark: { ...type.body, color: colors.secondaryDark },
  cardTitle: { ...type.cardTitle, color: colors.ink },
  body: { ...type.body, color: colors.muted },
  small: { ...type.small, color: colors.muted },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkValue: { ...type.label, color: colors.ink },
  demo: { ...type.label, color: colors.ink },
});
