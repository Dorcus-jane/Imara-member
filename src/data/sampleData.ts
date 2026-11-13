import { AppNotification, Deposit, Loan, Member, MemberHistory } from './types';

// DEMO DATA ONLY. Replace with real data when the Firestore connection is added.
// The demo "today" matches the dates shown in the Figma designs.
export const DEMO_TODAY = '2026-11-12';
export const INVITATION_CODE = 'IMARA-2026';

export const demoAccounts: { email: string; password: string; memberId: string }[] = [
  { email: 'amina@example.com', password: 'amina123', memberId: 'm2' },
  { email: 'rolex@example.com', password: 'rolex123', memberId: 'm1' },
];

export const members: Member[] = [
  {
    id: 'm1',
    memberNumber: 'IM-0001',
    fullName: 'Rolex Musinguzi',
    email: 'rolex@example.com',
    phone: '+256 700 000 001',
    joinedDate: '2026-10-20',
  },
  {
    id: 'm2',
    memberNumber: 'YM 2334',
    fullName: 'Amina Were',
    email: 'amina@example.com',
    phone: '+256 700 000 234',
    joinedDate: '2025-11-12',
  },
];

export const histories: Record<string, MemberHistory> = {
  m1: { monthsInGroup: 1, expectedContributions: 1, onTimeContributions: 1, instalmentsDue: 0, instalmentsOnTime: 0 },
  // 11 of 12 contributions on time; previous 12-month loan repaid on time.
  m2: { monthsInGroup: 12, expectedContributions: 12, onTimeContributions: 11, instalmentsDue: 12, instalmentsOnTime: 12 },
};

const channels = ['Till', 'Bank transfer', 'Mobile money'] as const;

// Amina: 12 contributions that add up to UGX 1,000,000 (DEP-000 to DEP-011).
function buildAminaDeposits(): Deposit[] {
  const list: Deposit[] = [];
  for (let n = 0; n <= 11; n++) {
    const monthIndex = 11 + n; // 11 = December 2025
    const year = 2025 + Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    const amount = n === 10 || n === 11 ? 100000 : 80000;
    let channel: (typeof channels)[number] = channels[n % 3];
    if (n === 9) channel = 'Till';
    if (n === 10) channel = 'Mobile money';
    if (n === 11) channel = 'Bank transfer';
    list.push({
      id: `d${n}`,
      memberId: 'm2',
      amount,
      channel,
      date: `${year}-${String(month).padStart(2, '0')}-11`,
      reference: `DEP-${String(n).padStart(3, '0')}`,
    });
  }
  return list;
}

export const deposits: Deposit[] = [
  { id: 'r1', memberId: 'm1', amount: 50000, channel: 'Till', date: '2026-11-11', reference: 'DEP-001' },
  ...buildAminaDeposits(),
];

export const loans: Loan[] = [
  {
    id: 'l1',
    memberId: 'm2',
    type: 'Business loan',
    amountRequested: 150000,
    interestRate: 12,
    termMonths: 12,
    purpose: 'Business stock',
    status: 'Repaid',
    appliedDate: '2025-10-10',
    decidedDate: '2025-10-10',
    completedDate: '2026-10-10',
    repaid: 168000,
  },
  {
    id: 'l2',
    memberId: 'm2',
    type: 'Emergency loan',
    amountRequested: 50000,
    interestRate: 12,
    termMonths: 6,
    purpose: 'Emergency',
    status: 'Rejected',
    appliedDate: '2025-02-02',
    decidedDate: '2025-02-02',
    note: 'Contact your SACCO for details.',
    repaid: 0,
  },
];

export const notifications: AppNotification[] = [
  {
    id: 'n1',
    memberId: 'm2',
    kind: 'deposit',
    heading: 'Deposit recorded',
    title: 'UGX 100,000 added to savings',
    body: 'Your bank transfer was recorded by your SACCO. Your total savings are UGX 1,000,000.',
    date: '2026-11-11',
    linkLabel: 'View deposit',
    linkId: 'd11',
  },
];
