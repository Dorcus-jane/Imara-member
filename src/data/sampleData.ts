import { AppNotification, AuditRecord, Deposit, Loan, Member, MemberHistory, RepaymentRecord } from './types';
import { calculateLoanQuote } from '../utils/loanMath';

// DEMO DATA matching Figma and Uganda SACCO regulations
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
    memberNo: 'IM-0001',
    fullName: 'Rolex Musinguzi',
    name: 'Rolex Musinguzi',
    email: 'rolex@example.com',
    phone: '+256 700 000 001',
    joinedDate: '2026-10-20',
    dobIso: '2001-08-20', // Age 25 (BR-01 >= 18)
    nin: 'CM01098765EFGH',
    momoName: 'Rolex Musinguzi',
    simSwapFlagged: false,
    consentGiven: true,
    consentTimestamp: '2026-10-20T10:00:00Z',
    crbConsentGiven: true,
    lockedSavings: 0,
    loanLimit: 300000,
    fraudFlag: false,
    accountClosed: false,
  },
  {
    id: 'm2',
    memberNumber: 'YM 2334',
    memberNo: 'YM 2334',
    fullName: 'Amina Were',
    name: 'Amina Were',
    email: 'amina@example.com',
    phone: '+256 700 000 234',
    joinedDate: '2025-11-12',
    dobIso: '1995-04-14', // Age 31 (BR-01 >= 18)
    nin: 'CM95012345ABCD',
    momoName: 'Amina Were',
    simSwapFlagged: false,
    consentGiven: true,
    consentTimestamp: '2025-11-12T09:00:00Z',
    crbConsentGiven: true,
    lockedSavings: 0,
    loanLimit: 3000000,
    fraudFlag: false,
    accountClosed: false,
  },
];

export const histories: Record<string, MemberHistory> = {
  m1: {
    monthsInGroup: 1,
    expectedContributions: 1,
    onTimeContributions: 1,
    instalmentsDue: 0,
    instalmentsOnTime: 0,
    crbStatus: 'No record',
    crbScore: 60,
  },
  // 11 of 12 contributions on time; previous 12-month loan repaid on time.
  m2: {
    monthsInGroup: 12,
    expectedContributions: 12,
    onTimeContributions: 11,
    instalmentsDue: 12,
    instalmentsOnTime: 12,
    crbStatus: 'Clean',
    crbScore: 88,
  },
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
      memberNo: 'YM 2334',
      amount,
      channel,
      method: channel,
      type: 'Deposit',
      fee: channel === 'Mobile money' ? 1000 : 0,
      date: `${year}-${String(month).padStart(2, '0')}-11`,
      receivedAt: `${year}-${String(month).padStart(2, '0')}-11T12:00:00Z`,
      reference: `DEP-${String(n).padStart(3, '0')}`,
      status: 'confirmed',
      source: 'App',
    });
  }
  return list;
}

export const deposits: Deposit[] = [
  {
    id: 'r1',
    memberId: 'm1',
    memberNo: 'IM-0001',
    amount: 50000,
    channel: 'Till',
    method: 'Till',
    type: 'Deposit',
    fee: 0,
    date: '2026-11-11',
    receivedAt: '2026-11-11T14:30:00Z',
    reference: 'DEP-001',
    status: 'confirmed',
    source: 'App',
  },
  ...buildAminaDeposits(),
];

const l1Quote = calculateLoanQuote(150000, 12, 12, '2025-10-10');

export const loans: Loan[] = [
  {
    id: 'l1',
    memberId: 'm2',
    memberNo: 'YM 2334',
    type: 'Business loan',
    amountRequested: 150000,
    amount: 150000,
    interestRate: 12,
    annualRate: 12,
    termMonths: 12,
    purpose: 'Business stock',
    status: 'Repaid',
    appliedDate: '2025-10-10',
    decidedDate: '2025-10-10',
    completedDate: '2026-10-10',
    dueDate: '2026-10-10',
    repaid: l1Quote.total,
    outstandingBalance: 0,
    originationFee: l1Quote.originationFee,
    transactionFee: l1Quote.transactionFee,
    totalRepayable: l1Quote.total,
    riskBand: 'Low risk',
    schedule: l1Quote.schedule.map((s) => ({ ...s, status: 'Paid', paidDate: s.dueDate })),
    source: 'App',
  },
  {
    id: 'l2',
    memberId: 'm2',
    memberNo: 'YM 2334',
    type: 'Emergency loan',
    amountRequested: 50000,
    amount: 50000,
    interestRate: 12,
    annualRate: 12,
    termMonths: 6,
    purpose: 'Emergency medical expenses',
    status: 'Rejected',
    appliedDate: '2025-02-02',
    decidedDate: '2025-02-02',
    note: 'Application declined by automated rule set: capacity exceeded.',
    repaid: 0,
    declineReasons: [
      'Active loan limit exceeded for the requested term.',
      'Savings balance at application was below required collateral multiple.',
      'Emergency tier requires minimum 3 months prior repayments.',
    ],
    source: 'App',
  },
];

export const repayments: RepaymentRecord[] = [
  {
    id: 'rep-01',
    loanId: 'l1',
    memberId: 'm2',
    amount: l1Quote.total,
    channel: 'Mobile money',
    date: '2026-10-10',
    reference: 'REP-MOMO-9912',
    breakdown: {
      feesPaid: l1Quote.totalFees,
      interestPaid: l1Quote.interest,
      principalPaid: 150000,
      penaltyPaid: 0,
    },
  },
];

export const auditLogs: AuditRecord[] = [
  {
    id: 'aud-01',
    timestamp: '2025-10-10T11:00:00Z',
    reviewerId: 'SYSTEM-AUTO',
    action: 'AUTO_APPROVE_LOAN',
    reason: 'Risk band: Low risk (Score 85 >= 75). Passed all BR eligibility checks.',
    targetId: 'l1',
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
