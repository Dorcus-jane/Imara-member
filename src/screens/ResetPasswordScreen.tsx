import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import AuthFooter from '../components/AuthFooter';
import Button from '../components/Button';
import Field from '../components/Field';
import Screen from '../components/Screen';
import { SoftBox } from '../components/Card';
import { requestPasswordReset } from '../data/api';
import { colors, type } from '../theme/theme';

export default function ResetPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('amina@example.com');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    setLoading(true);
    try {
      await requestPasswordReset(email);
      Alert.alert('Reset link sent', 'If that email is linked to a member account, a reset link is on its way. (Demo: no email is sent.)');
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen header={<AppHeader logo />} footer={<AuthFooter />}>
      <View style={{ gap: 8 }}>
        <Text style={styles.eyebrow}>LET’S GET YOU BACK IN</Text>
        <View>
          <Text style={styles.display}>Forgot your</Text>
          <Text style={styles.display}>password?</Text>
        </View>
        <Text style={styles.body}>Enter the email linked to your member account. We’ll send you a reset link.</Text>
      </View>

      <View style={{ gap: 16 }}>
        <Field
          label="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <Button title="Send reset link" onPress={send} loading={loading} />
        <Button title="←  Back to sign in" variant="outline" onPress={() => navigation.goBack()} />
      </View>

      <SoftBox style={{ paddingVertical: 20 }}>
        <Text style={styles.helpTitle}>Need a hand?</Text>
        <Text style={styles.helpBody}>
          If you no longer have access to your email, contact your SACCO administrator.
        </Text>
      </SoftBox>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...type.eyebrow, letterSpacing: 1.8, color: colors.brass },
  display: { ...type.display, color: colors.ink },
  body: { ...type.body, color: colors.muted },
  helpTitle: { ...type.label, color: colors.ink },
  helpBody: { ...type.small, color: colors.muted },
});
