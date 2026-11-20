import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import AuthFooter from '../components/AuthFooter';
import Button from '../components/Button';
import Field from '../components/Field';
import Screen from '../components/Screen';
import { Member } from '../data/types';
import { activateAccount } from '../data/api';
import { colors, type } from '../theme/theme';

type Props = { navigation: any; onActivated: (member: Member) => void };

// Screen 16 · Sign up. Implements BR-01 (18+), BR-02 (OTP), BR-03 (NIN), BR-06 (Consent)
export default function SignUpScreen({ navigation, onActivated }: Props) {
  const [memberNumber, setMemberNumber] = useState('YM 2334');
  const [email, setEmail] = useState('amina@example.com');
  const [phone, setPhone] = useState('+256 700 000 234');
  const [dob, setDob] = useState('1995-04-14');
  const [nin, setNin] = useState('CM95012345ABCD');
  const [code, setCode] = useState('IMARA-2026');
  const [password, setPassword] = useState('amina123');
  const [consentGiven, setConsentGiven] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestOtp = () => {
    setError('');
    if (!phone.trim()) {
      setError('Enter your mobile phone number for OTP verification.');
      return;
    }
    setOtpSent(true);
    setOtpCode('1234'); // Demo simulated OTP code
  };

  const submit = async () => {
    setError('');
    if (!consentGiven) {
      setError('Consent to data collection and credit scoring is required to activate your account.');
      return;
    }
    if (!otpSent) {
      setError('Please verify your phone number with the SMS code before creating your account.');
      return;
    }
    if (!dob.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
      setError('Enter your Date of Birth in YYYY-MM-DD format (must be 18 or older to join).');
      return;
    }
    if (!nin.trim()) {
      setError('Enter your valid National ID Number (NIN).');
      return;
    }

    setLoading(true);
    try {
      const member = await activateAccount({
        memberNumber,
        email,
        invitationCode: code,
        password,
        dobIso: dob.trim(),
        phone: phone.trim(),
        otpCode: otpCode.trim(),
        nin: nin.trim().toUpperCase(),
        consentGiven,
      });
      onActivated(member);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your account.');
      setLoading(false);
    }
  };

  return (
    <Screen header={<AppHeader logo />} footer={<AuthFooter />}>
      <View style={{ gap: 6 }}>
        <Text style={styles.display}>Create your account</Text>
        <Text style={styles.body}>Use your SACCO invitation to activate your verified member account.</Text>
      </View>

      <View style={{ gap: 14 }}>
        <Field label="Member number" value={memberNumber} onChangeText={setMemberNumber} placeholder="e.g. YM 2334" />
        <Field
          label="Registered email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <Field
          label="Date of birth (YYYY-MM-DD) · 18+ years required"
          value={dob}
          onChangeText={setDob}
          placeholder="1995-04-14"
        />
        <Field
          label="National ID Number (NIN)"
          value={nin}
          onChangeText={setNin}
          autoCapitalize="characters"
          placeholder="e.g. CM95012345ABCD"
        />

        <View style={{ gap: 6 }}>
          <Field
            label="Mobile money phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+256 700 000 000"
          />
          {!otpSent ? (
            <Pressable onPress={requestOtp} style={styles.otpBtn}>
              <Text style={styles.otpBtnText}>Send SMS OTP verification code →</Text>
            </Pressable>
          ) : (
            <View style={styles.otpBox}>
              <Field
                label="Enter 4-digit OTP code sent to your phone"
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                placeholder="1234"
              />
              <Text style={styles.otpHint}>✓ Phone verification code confirmed for demo</Text>
            </View>
          )}
        </View>

        <Field label="Invitation code" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="IMARA-2026" />
        <Field
          label="Create password · 8+ characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="At least 8 characters"
        />

        <Pressable onPress={() => setConsentGiven(!consentGiven)} style={styles.consentRow}>
          <View style={[styles.checkbox, consentGiven && styles.checkboxActive]}>
            {consentGiven ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
          </View>
          <Text style={styles.consentText}>
            I consent to SACCO data collection, Credit Reference Bureau (CRB) inquiry, and automated credit scoring under the Uganda Data Protection Act 2019.
          </Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Create account  →" onPress={submit} loading={loading} />
      </View>

      <View style={{ gap: 10, alignItems: 'center' }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Already a member? Sign in</Text>
        </Pressable>
        <Text style={styles.small}>No invitation yet? Contact your SACCO administrator.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  display: { ...type.display, fontSize: 32, lineHeight: 38, color: colors.ink },
  body: { ...type.body, color: colors.muted },
  error: { ...type.body, color: colors.danger },
  link: { ...type.label, color: colors.ink },
  small: { ...type.small, color: colors.muted, textAlign: 'center' },
  otpBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  otpBtnText: { ...type.label, color: colors.primary, fontSize: 12 },
  otpBox: { backgroundColor: colors.soft, padding: 12, borderRadius: 8, gap: 6 },
  otpHint: { ...type.caption, color: colors.success },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 4 },
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
