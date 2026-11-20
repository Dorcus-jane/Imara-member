import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Row from '../components/Row';
import Screen from '../components/Screen';
import SupportDialog from '../components/SupportDialog';
import { Card, DarkCard, SoftBox } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { closeAccount, exportMemberData, getRisk, requestPasswordReset, updateConsentPreferences } from '../data/api';
import { RiskResult } from '../data/types';
import { colors, fonts, type } from '../theme/theme';
import { formatDate, maskPhone } from '../utils/format';
import { useLoad } from '../utils/useLoad';

export default function ProfileScreen({ navigation }: any) {
  const { member, signOut, offline, toggleOffline } = useAuth();
  const risk = useLoad<RiskResult | null>(() => getRisk(member.id), [member.id], null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [closeAccOpen, setCloseAccOpen] = useState(false);
  const [dataExporting, setDataExporting] = useState(false);
  const [crbConsent, setCrbConsent] = useState(member.crbConsentGiven ?? true);
  const [dataConsent, setDataConsent] = useState(member.consentGiven ?? true);

  const sendReset = async () => {
    try {
      await requestPasswordReset(member.email);
      Alert.alert('Reset link sent', `A password reset link is on its way to ${member.email}. (Demo: no email is sent.)`);
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const handleExportData = async () => {
    setDataExporting(true);
    try {
      const dataStr = await exportMemberData(member.id);
      Alert.alert(
        'Your Member Data Summary',
        `Your personal data package under the Uganda Data Protection and Privacy Act 2019 has been prepared:\n\n${dataStr.slice(0, 300)}...`,
      );
    } catch (e) {
      Alert.alert('Export Failed', e instanceof Error ? e.message : 'Could not export data.');
    } finally {
      setDataExporting(false);
    }
  };

  const handleSaveConsent = async () => {
    try {
      await updateConsentPreferences(member.id, dataConsent, crbConsent);
      setPrivacyOpen(false);
      Alert.alert('Consent Preferences Saved', 'Your privacy and CRB consent settings have been updated.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update preferences.');
    }
  };

  const handleCloseAccount = async () => {
    try {
      const res = await closeAccount(member.id);
      setCloseAccOpen(false);
      Alert.alert(
        'Account Closed',
        `Your SACCO account has been closed. Any active loans were settled from your savings. Final payout disbursed: UGX ${res.payoutAmount.toLocaleString()}.`,
        [{ text: 'OK', onPress: signOut }],
      );
    } catch (e) {
      Alert.alert('Account Closure Blocked', e instanceof Error ? e.message : 'Could not close account.');
    }
  };

  const riskText = !risk
    ? ''
    : risk.label === 'Not enough history'
      ? 'Not enough history  ›'
      : `${risk.score}/100 · ${risk.label}  ›`;

  return (
    <Screen header={<AppHeader title="Profile" />}>
      <DarkCard style={{ gap: 10 }}>
        <Text style={styles.eyebrow}>IMARA SACCO MEMBER</Text>
        <Text style={styles.name}>{member.fullName}</Text>
        <Text style={styles.onDark}>{member.memberNumber} · Active member</Text>
      </DarkCard>

      {/* USSD *123# Integration Info Card */}
      <SoftBox style={{ padding: 18, gap: 8 }}>
        <View style={styles.between}>
          <Text style={styles.ussdTitle}>USSD Quick Banking (*123#)</Text>
          <Text style={styles.ussdBadge}>Live on MTN/Airtel</Text>
        </View>
        <Text style={styles.small}>
          Dial <Text style={{ fontFamily: fonts.manropeSemiBold, color: colors.primary }}>*123#</Text> from your verified phone ({maskPhone(member.phone)}) to check savings, deposit, take quick loans, or repay instantly without internet.
        </Text>
      </SoftBox>

      {/* Member Details */}
      <Card style={{ padding: 20, gap: 12 }}>
        <Text style={styles.cardTitle}>Your registered details</Text>
        <Row label="Email" value={member.email} />
        <Row label="Phone" value={maskPhone(member.phone)} />
        <Row label="National ID (NIN)" value={member.nin ?? 'CM95012345ABCD'} />
        <Row label="Date of birth" value={member.dobIso ? formatDate(member.dobIso) : '14 Apr 1995 (31 yrs)'} />
        <Row label="Member since" value={formatDate(member.joinedDate)} />
        <Text style={styles.small}>National ID and phone verified per SACCO membership policy.</Text>
      </Card>

      {/* Preferences and Actions */}
      <Card style={{ padding: 20, gap: 16 }}>
        <LinkRow label="Your credit score" value={riskText} onPress={() => navigation.navigate('RiskScore')} />
        <LinkRow label="Notifications & alerts" value="View updates  ›" onPress={() => navigation.navigate('Notifications')} />
        <LinkRow label="Password & security" value="Reset password  ›" onPress={sendReset} />
        <LinkRow label="Privacy & consent" value="Manage  ›" onPress={() => setPrivacyOpen(true)} />
        <LinkRow label="Download personal data summary" value="View summary  ›" onPress={handleExportData} />
        <LinkRow label="Close SACCO account" value="Review terms  ›" onPress={() => setCloseAccOpen(true)} />
        <LinkRow label="Help & support" value="Contact SACCO  ›" onPress={() => setSupportOpen(true)} />
      </Card>

      <Button title="Sign out" variant="outline" danger onPress={signOut} />

      <Pressable onPress={toggleOffline}>
        <Text style={styles.demo}>{offline ? 'Demo: back online →' : 'Demo: preview offline mode →'}</Text>
      </Pressable>

      {/* Privacy & Consent Dialog */}
      <Dialog visible={privacyOpen} onClose={() => setPrivacyOpen(false)}>
        <Text style={styles.dialogTitle}>Data Privacy & Consent</Text>
        <Text style={styles.dialogBody}>
          Under the Uganda Data Protection and Privacy Act 2019, you retain full ownership of your data.
        </Text>
        <View style={{ gap: 12 }}>
          <Pressable onPress={() => setDataConsent(!dataConsent)} style={styles.consentToggle}>
            <Text style={{ ...type.label, color: colors.ink, flex: 1 }}>Data collection & scoring consent</Text>
            <Text style={{ ...type.label, color: dataConsent ? colors.success : colors.danger }}>
              {dataConsent ? 'Granted ✓' : 'Revoked'}
            </Text>
          </Pressable>

          <Pressable onPress={() => setCrbConsent(!crbConsent)} style={styles.consentToggle}>
            <Text style={{ ...type.label, color: colors.ink, flex: 1 }}>Credit Reference Bureau (CRB) query consent</Text>
            <Text style={{ ...type.label, color: crbConsent ? colors.success : colors.danger }}>
              {crbConsent ? 'Granted ✓' : 'Revoked'}
            </Text>
          </Pressable>
        </View>
        <Button title="Save preferences" onPress={handleSaveConsent} />
        <Button title="Cancel" variant="outline" onPress={() => setPrivacyOpen(false)} />
      </Dialog>

      {/* Close Account Dialog */}
      <Dialog visible={closeAccOpen} onClose={() => setCloseAccOpen(false)}>
        <Text style={styles.dialogTitle}>Close SACCO Account</Text>
        <Text style={styles.dialogBody}>
          Any active loans will first be settled using your pooled savings. The remaining balance will be disbursed to your registered mobile money account.
        </Text>
        <Button title="Confirm account closure" variant="outline" danger onPress={handleCloseAccount} />
        <Button title="Keep my account" onPress={() => setCloseAccOpen(false)} />
      </Dialog>

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
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ussdTitle: { ...type.label, color: colors.ink },
  ussdBadge: { ...type.caption, color: colors.primary, backgroundColor: colors.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dialogTitle: { ...type.title, color: colors.ink },
  dialogBody: { ...type.body, color: colors.muted },
  consentToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
});
