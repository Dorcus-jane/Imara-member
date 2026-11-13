import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import Screen from '../components/Screen';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { getNotifications, TODAY } from '../data/api';
import { AppNotification } from '../data/types';
import { formatDate, formatDayMonth, timeNow } from '../utils/format';
import { colors, fonts, type } from '../theme/theme';
import { useLoad } from '../utils/useLoad';

function dayKey(date: string): string {
  if (date === TODAY) return 'TODAY';
  const [y, m, d] = TODAY.split('-').map(Number);
  const yesterday = new Date(y, m - 1, d - 1);
  const iso = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (date === iso) return 'YESTERDAY';
  return formatDate(date).toUpperCase();
}

export default function NotificationsScreen({ navigation }: any) {
  const { member } = useAuth();
  const items = useLoad<AppNotification[]>(() => getNotifications(member.id), [member.id], []);

  const groups: { label: string; list: AppNotification[] }[] = [];
  items.forEach((n) => {
    const label = dayKey(n.date);
    const group = groups.find((g) => g.label === label);
    if (group) group.list.push(n);
    else groups.push({ label, list: [n] });
  });

  const open = (n: AppNotification) => {
    if (n.kind === 'loan') navigation.navigate('LoanDetails', { loanId: n.linkId });
    else navigation.navigate('Deposits');
  };

  return (
    <Screen header={<AppHeader title="Notifications" onBack={() => navigation.goBack()} />}>
      <View style={{ gap: 8 }}>
        <Text style={styles.heading}>You’re all caught up.</Text>
        <Text style={styles.body}>Your latest account updates, in one place.</Text>
      </View>

      {groups.map((g) => (
        <View key={g.label} style={{ gap: 12 }}>
          <Text style={styles.eyebrow}>{g.label}</Text>
          {g.list.map((n) => (
            <Pressable key={n.id} onPress={() => open(n)}>
              <Card style={{ padding: 20, gap: 10 }}>
                <View style={styles.top}>
                  <Text style={styles.small}>{n.heading}</Text>
                  <Text style={styles.valueSmall}>{n.date === TODAY ? timeNow() : formatDayMonth(n.date)}</Text>
                </View>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.body}>{n.body}</Text>
                <Text style={styles.link}>{n.linkLabel}  →</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      ))}

      <Text style={styles.small}>Notifications reflect records and decisions from your SACCO administrator.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: fonts.manropeSemiBold, fontSize: 24, lineHeight: 33, color: colors.ink },
  body: { ...type.body, color: colors.muted },
  small: { ...type.small, color: colors.muted },
  eyebrow: { ...type.eyebrow, color: colors.muted },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  valueSmall: { ...type.caption, color: colors.ink },
  title: { fontFamily: fonts.manropeSemiBold, fontSize: 17, lineHeight: 24, color: colors.ink },
  link: { ...type.label, color: colors.ink },
});
