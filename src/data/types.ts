export type Channel = 'Till' | 'Bank transfer' | 'Mobile money' | 'USSD';
export type LoanStatus = 'Pending' | 'Approved' | 'Rejected' | 'Repaid' | 'Overdue' | 'Defaulted';
export type RiskLabel = 'Low risk' | 'Medium risk' | 'High risk' | 'Very high risk' | 'Not enough history';

export interface Member {
  id: string;
  memberNumber: string; // legacy alias
  memberNo?: string;    // USSD / Firestore field
  fullName: string;     // legacy alias
  name?: string;        // USSD / Firestore field
  email: string;
  phone: string;
  joinedDate: string;   // YYYY-MM-DD
  dobIso?: string;      // YYYY-MM-DD (BR-01 >= 18)
  nin?: string;         // National ID (BR-03)
  momoName?: string;    // Verified MoMo name (BR-04)
  simSwapFlagged?: boolean; // Flagged for recent SIM swap (BR-05)
  consentGiven?: boolean;   // Explicit data consent (BR-06)
  consentTimestamp?: string;
  crbConsentGiven?: boolean;// CRB check consent (BR-15)
  lockedSavings?: number;   // Savings locked as collateral (BR-08, BR-09, BR-43)
  loanLimit?: number;       // Member loan ceiling (BR-34, BR-36)
  fraudFlag?: boolean;      // Open fraud flag (BR-25)
  accountClosed?: boolean;  // Account closure state (BR-12, BR-13)
}

export interface MemberHistory {
  monthsInGroup: number;
  expectedContributions: number;
  onTimeContributions: number;
  instalmentsDue: number;
  instalmentsOnTime: number;
  missedPayments?: number;
  totalSavings?: number;
  crbStatus?: 'Clean' | 'Listed' | 'No record';
  crbScore?: number;
}

export interface Deposit {
  id: string;
  memberId: string;
  memberNo?: string;
  amount: number;
  channel: Channel;
  method?: string;      // USSD / Firestore alignment
  type?: 'Deposit' | 'Withdrawal';
  fee?: number;         // Transaction fee (BR-55)
  date: string;
  receivedAt?: string;  // USSD / Firestore alignment
  reference: string;
  source?: 'App' | 'USSD' | 'Admin';
  status?: 'pending' | 'confirmed' | 'rejected';
}

export interface LoanScheduleItem {
  instalmentNumber: number;
  dueDate: string;
  totalDue: number;
  principal: number;
  interest: number;
  fee: number;
  status: 'Pending' | 'Paid' | 'Overdue';
  paidDate?: string;
}

export interface Loan {
  id: string;
  memberId: string;
  memberNo?: string;
  type: string;           // e.g. "Business loan", "Quick loan"
  amountRequested: number;// legacy alias
  amount?: number;        // USSD / Firestore alignment
  interestRate: number;   // Annual / Flat percent (BR-56)
  annualRate?: number;    // USSD / Firestore alignment
  termMonths: number;
  purpose: string;
  status: LoanStatus;
  appliedDate: string;
  decidedDate?: string;
  completedDate?: string;
  dueDate?: string;
  note?: string;
  repaid: number;
  outstandingBalance?: number;
  originationFee?: number;// BR-57
  transactionFee?: number;// BR-55
  totalRepayable?: number;// BR-41
  riskBand?: RiskLabel;   // BR-33
  declineReasons?: string[];// Top 3 reasons if declined/reduced (BR-40)
  appealStatus?: 'None' | 'Pending' | 'Approved' | 'Rejected'; // BR-62
  appealReason?: string;
  guarantorName?: string; // BR-52
  guarantorPhone?: string;// BR-52
  schedule?: LoanScheduleItem[]; // BR-41
  source?: 'App' | 'USSD' | 'Admin';
}

export interface RiskFactor {
  title: string;
  text: string;
  weightPercent?: number;
  scoreContribution?: number;
}

export interface RiskResult {
  score: number;        // 0 to 100 (BR-27)
  label: RiskLabel;
  headline: string;
  reasons: RiskFactor[];// BR-40
  requested: number;
  savings: number;
  maxLoanLimit?: number;// BR-34
  interestRate?: number;// BR-56
  scoredAt?: string;    // BR-32
  modelVersion?: string;// BR-32
  inputs?: Record<string, number | string>; // BR-32
  crbReport?: {
    status: 'Clean' | 'Listed' | 'No record';
    score: number;
    queryDate: string;
  };
}

export interface RepaymentRecord {
  id: string;
  loanId: string;
  memberId: string;
  amount: number;
  channel: Channel;
  date: string;
  reference: string;
  breakdown: {
    feesPaid: number;
    interestPaid: number;
    principalPaid: number;
    penaltyPaid: number;
  };
}

export interface AppNotification {
  id: string;
  memberId: string;
  kind: 'deposit' | 'loan' | 'reminder' | 'warning';
  heading: string;
  title: string;
  body: string;
  date: string;
  linkLabel: string;
  linkId: string;
}

export interface StatementData {
  member: Member;
  monthKey: string;     // YYYY-MM
  monthLabel: string;   // "November 2026"
  rangeLabel: string;   // "01 – 12 Nov 2026"
  opening: number;
  depositsInPeriod: number;
  withdrawalsInPeriod?: number;
  closing: number;
  loansApproved: number;
  repayments: number;
  updatedOn: string;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  reviewerId: string;
  action: string;
  reason: string;
  targetId: string;
}
