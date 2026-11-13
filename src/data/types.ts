export type Channel = 'Till' | 'Bank transfer' | 'Mobile money';
export type LoanStatus = 'Pending' | 'Approved' | 'Rejected' | 'Repaid';
export type RiskLabel = 'Low risk' | 'Medium risk' | 'High risk' | 'Not enough history';

export interface Member {
  id: string;
  memberNumber: string;
  fullName: string;
  email: string;
  phone: string;
  joinedDate: string; // YYYY-MM-DD
}

// Summary of a member's saving and repayment habits.
// With real data these numbers are worked out from deposits and repayments.
export interface MemberHistory {
  monthsInGroup: number;
  expectedContributions: number;
  onTimeContributions: number;
  instalmentsDue: number;
  instalmentsOnTime: number;
}

export interface Deposit {
  id: string;
  memberId: string;
  amount: number;
  channel: Channel;
  date: string;
  reference: string;
}

export interface Loan {
  id: string;
  memberId: string;
  type: string; // e.g. "Business loan"
  amountRequested: number;
  interestRate: number; // flat percent
  termMonths: number;
  purpose: string;
  status: LoanStatus;
  appliedDate: string;
  decidedDate?: string;
  completedDate?: string;
  note?: string;
  repaid: number;
}

export interface RiskResult {
  score: number; // 0 to 1
  label: RiskLabel;
  headline: string;
  reasons: { title: string; text: string }[];
  requested: number;
  savings: number;
}

export interface AppNotification {
  id: string;
  memberId: string;
  kind: 'deposit' | 'loan';
  heading: string; // small label, e.g. "Deposit recorded"
  title: string;
  body: string;
  date: string;
  linkLabel: string;
  linkId: string; // deposit id or loan id
}

export interface StatementData {
  member: Member;
  monthKey: string; // YYYY-MM
  monthLabel: string; // "November 2026"
  rangeLabel: string; // "01 – 12 Nov 2026"
  opening: number;
  depositsInPeriod: number;
  closing: number;
  loansApproved: number;
  repayments: number;
  updatedOn: string;
}
