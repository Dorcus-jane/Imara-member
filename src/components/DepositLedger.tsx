import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { Deposit } from '../data/types';
import { colors, type } from '../theme/theme';
import { formatDate, formatUGX } from '../utils/format';

type Props = { deposits: Deposit[]; onPressDeposit?: (deposit: Deposit) => void };

// White card with one row per recorded deposit.
export default function DepositLedger({ deposits, onPressDeposit }: Props) {
  return (
    <Card style={{ overflow: 'hidden' }}>
      {deposits.map((d, index) => (
        <Pressable
          key={d.id}
          onPress={() => onPressDeposit?.(d)}
          style={[styles.row, index < deposits.length - 1 && styles.divider]}
        >
          <View style={styles.icon}>
            <Ionicons name="download-outline" size={18} color={colors.ink} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.top}>
              <Text style={styles.date}>{formatDate(d.date)}</Text>
              <Text style={styles.amount}>+ {formatUGX(d.amount)}</Text>
            </View>
            <Text style={styles.sub}>
              {d.channel}  ·  {d.reference}
            </Text>
          </View>
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  icon: { width: 30, height: 34, borderRadius: 7, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { ...type.body, color: colors.muted },
  amount: { ...type.label, color: colors.primary },
  sub: { ...type.small, color: colors.muted },
});
