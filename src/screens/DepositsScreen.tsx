import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import DepositLedger from '../components/DepositLedger';
import Field from '../components/Field';
import Row from '../components/Row';
import Screen from '../components/Screen';
import SupportDialog from '../components/SupportDialog';
import { Card, DarkCard } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { getAvailableSavings, getDeposits, getLockedSavings, withdrawSavings } from '../data/api';
import { Channel, Deposit } from '../data/types';
import { colors, fonts, type } from '../theme/theme';
import { formatUGX } from '../utils/format';
import { useLoad } from '../utils/useLoad';

const CHANNELS: Channel[] = ['Bank transfer', 'Mobile money', 'Till'];

export default function DepositsScreen() {
  const { member } = useAuth();
  const deposits = useLoad<Deposit[]>(() => getDeposits(member.id), [member.id], []);
  const availableSavings = useLoad<number>(() => getAvailableSavings(member.id), [member.id], 0);
  const lockedSavings = useLoad<number>(() => getLockedSavings(member.id), [member.id], 0);

  const [filter, setFilter] = useState<Channel | null>(null);
  const [visibleCount, setVisibleCount] = useState(3);
  const [filterOpen, setFilterOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawChannel, setWithdrawChannel] = useState<Channel>('Mobile money');
  const [withdrawing, setWithdrawing] = useState(false);

  const total = deposits.reduce((sum, d) => (d.type === 'Withdrawal' ? sum - d.amount : sum + d.amount), 0);
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

  const handleWithdraw = async () => {
    const amt = Number(withdrawAmount.replace(/[^0-9]/g, '')) || 0;
    if (amt <= 0) {
      Alert.alert('Amount Required', 'Enter an amount to withdraw.');
      return;
    }
    if (amt > availableSavings) {
      Alert.alert(
        'Insufficient Unlocked Funds',
        `You can only withdraw up to ${formatUGX(availableSavings)}. ${formatUGX(lockedSavings)} is locked as security for an active loan.`,
      );
      return;
    }

    setWithdrawing(true);
    try {
      await withdrawSavings(member.id, amt, withdrawChannel);
      setWithdrawOpen(false);
      setWithdrawAmount('');
      Alert.alert('Withdrawal Submitted', `Withdrawal of ${formatUGX(amt)} via ${withdrawChannel} processed.`);
    } catch (e) {
      Alert.alert('Withdrawal Error', e instanceof Error ? e.message : 'Could not process withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <Screen header={<AppHeader title="Deposits" />}>
      <DarkCard>
        <Text style={styles.eyebrow}>TOTAL SAVINGS</Text>
        <Text style={styles.balance}>{formatUGX(total)}</Text>
        <Text style={styles.onDarkSmall}>{deposits.length} ledger transactions · All time</Text>
      </DarkCard>

      {/* Unlocked vs Locked Collateral Box */}
      <Card style={{ padding: 18, gap: 10 }}>
        <Text style={styles.cardTitle}>Available Savings</Text>
        <Row label="Available to withdraw" value={formatUGX(availableSavings)} strong />
        <Row label="Locked as loan security" value={formatUGX(lockedSavings)} />
        <Button
          title="Withdraw unlocked savings  ↗"
          variant="outline"
          onPress={() => setWithdrawOpen(true)}
        />
      </Card>

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
          <Text style={styles.small}>No transactions for this channel yet.</Text>
        </Card>
      ) : (
        <DepositLedger deposits={shown} />
      )}

      {hasMore ? <Button title="Load earlier transactions" variant="outline" onPress={() => setVisibleCount((n) => n + 3)} /> : null}

      <Text style={styles.small}>
        Every deposit and withdrawal is recorded in an official timestamped ledger. Questions?{' '}
        <Text style={styles.inlineLink} onPress={() => setSupportOpen(true)}>
          Contact your SACCO.
        </Text>
      </Text>

      {/* Filter Dialog */}
      <Dialog visible={filterOpen} onClose={() => setFilterOpen(false)}>
        <Text style={styles.dialogTitle}>Filter transactions</Text>
        <Text style={styles.dialogBody}>Choose a channel to explore recorded ledger entries.</Text>
        <View style={{ gap: 16 }}>
          <Button title="All channels" variant="outline" onPress={() => choose(null)} />
          {CHANNELS.map((c) => (
            <Button key={c} title={c} variant="outline" onPress={() => choose(c)} />
          ))}
          <Button title="Cancel" onPress={() => setFilterOpen(false)} />
        </View>
      </Dialog>

      {/* Withdraw Modal */}
      <Dialog visible={withdrawOpen} onClose={() => setWithdrawOpen(false)}>
        <Text style={styles.dialogTitle}>Withdraw savings</Text>
        <Text style={styles.dialogBody}>
          You may withdraw up to your unlocked balance ({formatUGX(availableSavings)}).
          {lockedSavings > 0 ? ` Note: ${formatUGX(lockedSavings)} is pledged as active loan security.` : ''}
        </Text>
        <Field
          label="Amount to withdraw (UGX)"
          value={withdrawAmount}
          onChangeText={setWithdrawAmount}
          keyboardType="number-pad"
          placeholder="50,000"
        />
        <View style={{ gap: 8 }}>
          <Text style={{ ...type.label, color: colors.ink }}>Payout channel</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['Mobile money', 'Bank transfer'] as Channel[]).map((c) => (
              <Button
                key={c}
                title={c}
                variant={withdrawChannel === c ? 'primary' : 'outline'}
                onPress={() => setWithdrawChannel(c)}
              />
            ))}
          </View>
        </View>
        <Button
          title={`Confirm withdrawal`}
          onPress={handleWithdraw}
          loading={withdrawing}
        />
        <Button title="Cancel" variant="outline" onPress={() => setWithdrawOpen(false)} />
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
  cardTitle: { ...type.cardTitle, color: colors.ink },
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
