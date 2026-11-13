import React, { useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import AuthFooter from '../components/AuthFooter';
import Button from '../components/Button';
import Field from '../components/Field';
import Screen from '../components/Screen';
import { SoftBox } from '../components/Card';
import { colors, radius, type } from '../theme/theme';

type Props = {
  onSignIn: (email: string, password: string) => Promise<void>;
  navigation: any;
};

export default function SignInScreen({ onSignIn, navigation }: Props) {
  // Pre-filled with the demo member shown in the design.
  const [email, setEmail] = useState('amina@example.com');
  const [password, setPassword] = useState('amina123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await onSignIn(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
      setLoading(false);
    }
  };

  return (
    <Screen header={<AppHeader logo />} footer={<AuthFooter />}>
      <ImageBackground
        source={require('../../assets/banknotes.jpg')}
        resizeMode="cover"
        style={styles.hero}
        imageStyle={{ borderRadius: radius.card }}
      >
        <View style={styles.scrim} />
        <Text style={styles.eyebrow}>MEMBER ACCESS</Text>
        <View>
          <Text style={styles.display} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            Your savings.
          </Text>
          <Text style={styles.display} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            Your next chapter.
          </Text>
        </View>
        <View>
          <Text style={styles.heroBody}>Welcome back to your SACCO.</Text>
          <Text style={styles.heroBody}>Let’s keep growing, together.</Text>
        </View>
      </ImageBackground>

      <View style={{ gap: 16 }}>
        <Field
          label="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Enter your password"
        />
        <Pressable onPress={() => navigation.navigate('ResetPassword')} style={{ alignSelf: 'flex-end' }}>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Sign in  →" onPress={submit} loading={loading} />
      </View>

      <Pressable onPress={() => navigation.navigate('SignUp')}>
        <SoftBox>
          <Text style={styles.helpTitle}>New to Imara? Sign up  →</Text>
          <Text style={styles.helpBody}>Have a SACCO invitation? Activate your member account to get started.</Text>
        </SoftBox>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 218,
    borderRadius: radius.card,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 6,
  },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.imageScrim, borderRadius: radius.card },
  eyebrow: { ...type.eyebrow, letterSpacing: 1.8, color: colors.brass },
  display: { ...type.photoDisplay, color: colors.onDark },
  heroBody: { ...type.body, color: colors.secondaryDark },
  link: { ...type.label, color: colors.primary },
  error: { ...type.body, color: colors.danger },
  helpTitle: { ...type.label, color: colors.ink },
  helpBody: { ...type.small, color: colors.muted },
});
