import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import AuthFooter from '../components/AuthFooter';
import Button from '../components/Button';
import Field from '../components/Field';
import Screen from '../components/Screen';
import { Member } from '../data/types';
import { activateAccount } from '../data/api';
import { colors, type } from '../theme/theme';

type Props = { navigation: any; onActivated: (member: Member) => void };

// Screen 16 · Sign up. A member activates the account their SACCO invited them to.
export default function SignUpScreen({ navigation, onActivated }: Props) {
  const [memberNumber, setMemberNumber] = useState('YM 2334');
  const [email, setEmail] = useState('amina@example.com');
  const [code, setCode] = useState('IMARA-2026');
  const [password, setPassword] = useState('amina123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const member = await activateAccount(memberNumber, email, code, password);
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
        <Text style={styles.body}>Use your SACCO invitation to activate your member account.</Text>
      </View>

      <View style={{ gap: 16 }}>
        <Field label="Member number" value={memberNumber} onChangeText={setMemberNumber} placeholder="e.g. YM 2334" />
        <Field
          label="Registered email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <Field label="Invitation code" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="IMARA-0000" />
        <Field
          label="Create password · 8+ characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="At least 8 characters"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Create account" onPress={submit} loading={loading} />
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
  display: { ...type.display, fontSize: 34, lineHeight: 40, color: colors.ink },
  body: { ...type.body, color: colors.muted },
  error: { ...type.body, color: colors.danger },
  link: { ...type.label, color: colors.ink },
  small: { ...type.small, color: colors.muted, textAlign: 'center' },
});
