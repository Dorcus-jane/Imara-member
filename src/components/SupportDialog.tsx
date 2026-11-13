import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Dialog from './Dialog';
import Button from './Button';
import { colors, type } from '../theme/theme';

type Props = { visible: boolean; onClose: () => void };

// Screen 14 · Prototype feedback ("Member support").
export default function SupportDialog({ visible, onClose }: Props) {
  return (
    <Dialog visible={visible} onClose={onClose}>
      <Text style={styles.eyebrow}>IMARA MEMBER</Text>
      <Text style={styles.title}>Member support</Text>
      <Text style={styles.body}>
        Contact your SACCO administrator for account access, record corrections and repayment arrangements. This
        prototype does not send messages.
      </Text>
      <Button title="Done" onPress={onClose} />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...type.caption, color: colors.muted, letterSpacing: 1.2 },
  title: { ...type.title, color: colors.ink },
  body: { ...type.body, color: colors.muted, lineHeight: 20 },
});
