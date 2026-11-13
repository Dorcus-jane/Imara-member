import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import DepositLedger from '../components/DepositLedger';
import Screen from '../components/Screen';
import SupportDialog from '../components/SupportDialog';
import { Card, DarkCard } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { getDeposits } from '../data/api';
import { Channel, Deposit } from '../data/types';
import { colors, fonts, type } from '../theme/theme';
import { formatUGX } from '../utils/format';
import { useLoad } from '../utils/useLoad';

const CHANNELS: Channel[] = ['Bank transfer', 'Mobile money', 'Till'];

export default function DepositsScreen() {
  const { member } = useAuth();
  const deposits = useLoad<Deposit[]>(() => getDeposits(member.id), [member.id], []);
  const [filter, setFilter] = useState<Channel | null>(null);
  const [visibleCount, setVisibleCount] = useState(3);
  const [filterOpen, setFilterOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const total = deposits.reduce((sum, d) => sum + d.amount, 0);
  const filtered = filter ? deposits.filter((d) => d.channel === filter) : deposits;
  const shown = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;
  const year = shown[0]?.date.slice(0, 4) ?? '';
  const moreLabel = filter && filter !== 'Bank transfer' ? filter : 'More';

  const choose = (value: Channel | null) => {
    setFilter(value);
    setVisibleCount(3);
    setFilterOpen(false);
  };

  return (
    <Screen header={<AppHeader title="Deposits" />}>
      <DarkCard>
        <Text style={styles.eyebrow}>TOTAL SAVINGS</Text>
        <Text style={styles.balance}>{formatUGX(total)}</Text>
        <Text style={styles.onDarkSmall}>{deposits.length} contributions · All time</Text>
      </DarkCard>

      <View style={styles.chips}>
        <Chip label="All channels" active={filter === null} onPress={() => choose(null)} />
        <Chip label="Bank transfer" active={filter === 'Bank transfer'} onPress={() => choose('Bank transfer')} />
        <Chip
          label={moreLabel}
          active={filter === 'Mobile money' || filter === 'Till'}
          chevron
          onPress={() => setFilterOpen(true)}
        />
      </View>

      <Text style={styles.eyebrowMuted}>
        {year ? `${year}  ·  ` : ''}
        {(filter ?? 'All channels').toUpperCase()}
      </Text>

      {shown.length === 0 ? (
        <Card style={{ padding: 20 }}>
          <Text style={styles.small}>No deposits for this channel yet.</Text>
        </Card>
      ) : (
        <DepositLedger deposits={shown} />
      )}

      {hasMore ? <Button title="Load earlier deposits" variant="outline" onPress={() => setVisibleCount((n) => n + 3)} /> : null}

      <Text style={styles.small}>
        Deposits are recorded by your administrator. Something missing?{' '}
        <Text style={styles.inlineLink} onPress={() => setSupportOpen(true)}>
          Contact your SACCO.
        </Text>
      </Text>

      <Dialog visible={filterOpen} onClose={() => setFilterOpen(false)}>
        <Text style={styles.dialogTitle}>Filter deposits</Text>
        <Text style={styles.dialogBody}>Choose a channel to explore the recorded sample deposits.</Text>
        <View style={{ gap: 16 }}>
          <Button title="All channels" variant="outline" onPress={() => choose(null)} />
          {CHANNELS.map((c) => (
            <Button key={c} title={c} variant="outline" onPress={() => choose(c)} />
          ))}
          <Button title="Cancel" onPress={() => setFilterOpen(false)} />
        </View>
      </Dialog>
      <SupportDialog visible={supportOpen} onClose={() => setSupportOpen(false)} />
    </Screen>
  );
}

function Chip({ label, active, onPress, chevron }: { label: string; active?: boolean; onPress: () => void; chevron?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={styles.chipText}>{label}</Text>
      {chevron ? <Ionicons name="chevron-down" size={12} color={colors.ink} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...type.eyebrow, color: colors.brass },
  eyebrowMuted: { ...type.eyebrow, color: colors.muted },
  balance: { ...type.balance, fontSize: 36, color: colors.onDark },
  onDarkSmall: { ...type.small, color: colors.secondaryDark },
  small: { ...type.small, color: colors.muted },
  inlineLink: { ...type.small, fontFamily: fonts.interMedium, color: colors.ink },
  chips: { flexDirection: 'row', gap: 10 },
  chip: {
    height: 40,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: { borderColor: colors.primary },
  chipText: { ...type.label, color: colors.ink },
  dialogTitle: { ...type.title, color: colors.ink },
  dialogBody: { ...type.body, color: colors.muted },
});
