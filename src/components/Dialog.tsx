import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme/theme';

type Props = { visible: boolean; onClose: () => void; children: React.ReactNode };

// Centered white dialog over a dark green backdrop.
export default function Dialog({ visible, onClose, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.dialog} onPress={() => undefined}>
          <View style={{ gap: 16 }}>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: 'center', paddingHorizontal: 20 },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
