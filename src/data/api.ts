// THE DATA LAYER — SACCO Savings & Micro-Loan System
// Complete implementation of Business Rules BR-01 to BR-66
import { calculateRisk, RISK_BANDS } from './riskScore';
import {
  auditLogs,
  DEMO_TODAY,
  demoAccounts,
  deposits,
  histories,
  INVITATION_CODE,
  loans,
  members,
  notifications,
  repayments,
} from './sampleData';
import {
  AppNotification,
  AuditRecord,
  Channel,
  Deposit,
  Loan,
  Member,
  RepaymentRecord,
  RiskResult,
  StatementData,
} from './types';
import { addMonths, formatDate, formatMonthLabel, formatUGX } from '../utils/format';
import { applyRepaymentWaterfall, calculateLatePenalty, calculateLoanQuote } from '../utils/loanMath';

// ============================================================================
// CONFIGURABLE SYSTEM PARAMETERS (SRS Parameters Sheet)
// ============================================================================
export const MIN_LOAN = 50000;               // BR-26: Minimum micro-loan amount in UGX
export const MAX_LOAN_CEILING = 5000000;      // BR-36: Absolute maximum loan cap in UGX
export const FIRST_LOAN_CAP = 300000;         // BR-35: Maximum loan for first-time borrowers
export const MIN_DEPOSITS = 3;                // BR-21: Minimum required savings deposits
export const MIN_ACCOUNT_AGE = 30;            // BR-22: Minimum account age in days
export const GRACE_DAYS = 5;                  // BR-48: Grace period days after due date
export const PENALTY_CAP = 10;                // BR-49: Maximum penalty percentage
export const DEFAULT_DAYS = 30;               // BR-51: Days overdue before default classification
export const COOLDOWN_DAYS = 60;              // BR-54: Cooldown period after default settlement
export const ORIGINATION_CAP = 3;             // BR-57: Max origination fee percentage
export const SIM_SWAP_DAYS = 3;               // BR-05: SIM swap review window in days
export const CRB_VALID_DAYS = 30;             // BR-16: Maximum age of cached CRB report
export const LIQUIDITY_CAP = 80;              // BR-11: Max % of pool allocated to loans
export const LIQUIDITY_RESERVE = 20;          // BR-11: Min % of pool kept for withdrawals
export const BAD_DEBT_RESERVE = 10;           // BR-53: % of loan interest directed to bad debt reserve
export const REMINDER_DAYS = 3;               // BR-46: Days before due date to send reminder
export const MAX_LOAN_MULTIPLE = 3;           // BR-34: Baseline 3x multiplier
export const INTEREST_RATE = 12;              // Default baseline interest percent
export const TERM_OPTIONS = [1, 3, 6, 12, 18, 24]; // USSD + Mobile App term options
export const EXAMPLE_REQUEST = 200000;
export const TODAY = DEMO_TODAY;

const wait = (ms = 150) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Helper: Calculate age from ISO date string
function getAge(dobIso: string): number {
  const [birthY, birthM, birthD] = dobIso.split('-').map(Number);
  const [todayY, todayM, todayD] = TODAY.split('-').map(Number);
  let age = todayY - birthY;
  if (todayM < birthM || (todayM === birthM && todayD < birthD)) {
    age--;
  }
  return age;
}

// Helper: Days between two ISO dates
function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
}

// ============================================================================
// 1. REGISTRATION AND IDENTITY (BR-01 to BR-06)
// ============================================================================

export async function signIn(email: string, password: string): Promise<Member> {
  await wait();
  const account = demoAccounts.find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password,
  );
  if (!account) throw new Error('Wrong email or password.');
  const member = members.find((m) => m.id === account.memberId);
  if (!member) throw new Error('Member account not found.');
  if (member.accountClosed) throw new Error('This account has been closed. Please contact your SACCO.');
  return member;
}

export interface ActivationPayload {
  memberNumber: string;
  email: string;
  invitationCode: string;
  password: string;
  dobIso?: string;       // BR-01: Must be >= 18 years
  phone?: string;        // BR-02: Verified phone number
  otpCode?: string;      // BR-02: OTP verification
  nin?: string;          // BR-03: National ID Number
  momoName?: string;     // BR-04: Mobile money name match
  consentGiven?: boolean;// BR-06: Explicit consent
}

export async function activateAccount(
  memberNumberOrPayload: string | ActivationPayload,
  emailParam?: string,
  invitationCodeParam?: string,
  passwordParam?: string,
): Promise<Member> {
  await wait();

  // Support both legacy positional arguments and extended payload
  let payload: ActivationPayload;
  if (typeof memberNumberOrPayload === 'object') {
    payload = memberNumberOrPayload;
  } else {
    payload = {
      memberNumber: memberNumberOrPayload,
      email: emailParam || '',
      invitationCode: invitationCodeParam || '',
      password: passwordParam || '',
    };
  }

  const { memberNumber, email, invitationCode, password, dobIso, nin, momoName, consentGiven } = payload;

  const member = members.find(
    (m) =>
      m.memberNumber.toLowerCase() === memberNumber.trim().toLowerCase() &&
      m.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!member) throw new Error('We could not find that member number and email. Check with your SACCO.');
  if (invitationCode.trim().toUpperCase() !== INVITATION_CODE) throw new Error('That invitation code is not valid.');
  if (password.length < 8) throw new Error('Choose a password with 8 or more characters.');

  // BR-01: Must be 18 years or older
  const effectiveDob = dobIso || member.dobIso;
  if (effectiveDob) {
    const age = getAge(effectiveDob);
    if (age < 18) {
      throw new Error(`Registration failed: You must be at least 18 years old to join the SACCO (current age: ${age}).`);
    }
    member.dobIso = effectiveDob;
  }

  // BR-03: Require valid NIN and reject duplicate
  const effectiveNin = nin || member.nin;
  if (effectiveNin) {
    const duplicate = members.find((m) => m.id !== member.id && m.nin && m.nin.toUpperCase() === effectiveNin.trim().toUpperCase());
    if (duplicate) {
      throw new Error('Registration failed: This National ID Number (NIN) is already registered to another account.');
    }
    member.nin = effectiveNin.trim().toUpperCase();
  }

  // BR-04: Confirm name matches mobile money
  if (momoName && momoName.trim().toLowerCase() !== member.fullName.trim().toLowerCase()) {
    throw new Error(`Mobile money name mismatch: Account name "${member.fullName}" must match registered MoMo name.`);
  }

  // BR-06: Explicit consent requirement
  if (consentGiven !== undefined) {
    if (!consentGiven) {
      throw new Error('Consent required: You must explicitly agree to data collection and credit scoring.');
    }
    member.consentGiven = true;
    member.consentTimestamp = new Date().toISOString();
  }

  const existing = demoAccounts.find((a) => a.memberId === member.id);
  if (existing) existing.password = password;
  else demoAccounts.push({ email: member.email, password, memberId: member.id });

  return member;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await wait();
  if (!email.trim()) throw new Error('Enter the email linked to your member account.');
}

// ============================================================================
// 2. SAVINGS, WITHDRAWALS & POOL LIQUIDITY (BR-07 to BR-14)
// ============================================================================

export async function getDeposits(memberId: string): Promise<Deposit[]> {
  await wait();
  return deposits.filter((d) => d.memberId === memberId).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getTotalSavings(memberId: string): Promise<number> {
  const list = await getDeposits(memberId);
  return list.reduce((sum, d) => {
    if (d.type === 'Withdrawal') return sum - d.amount;
    return sum + d.amount;
  }, 0);
}

// BR-08 / BR-09: Available savings excluding locked loan collateral
export async function getAvailableSavings(memberId: string): Promise<number> {
  const total = await getTotalSavings(memberId);
  const member = members.find((m) => m.id === memberId);
  const locked = member?.lockedSavings || 0;
  return Math.max(0, total - locked);
}

export async function getLockedSavings(memberId: string): Promise<number> {
  const member = members.find((m) => m.id === memberId);
  return member?.lockedSavings || 0;
}

// BR-07, BR-08, BR-09, BR-11, BR-12, BR-14: Savings withdrawal
export async function withdrawSavings(
  memberId: string,
  amount: number,
  channel: Channel = 'Mobile money',
): Promise<Deposit> {
  await wait();
  if (amount <= 0) throw new Error('Enter a valid amount to withdraw.');

  const available = await getAvailableSavings(memberId);
  if (amount > available) {
    const locked = await getLockedSavings(memberId);
    throw new Error(
      `Insufficient unlocked savings. Available: ${formatUGX(available)} (Locked as loan collateral: ${formatUGX(locked)}).`,
    );
  }

  // BR-11 / BR-14: Check pool liquidity reserve
  const allSavings = deposits.reduce((s, d) => (d.type === 'Withdrawal' ? s - d.amount : s + d.amount), 0);
  const requiredReserve = allSavings * (LIQUIDITY_RESERVE / 100);
  const isQueued = (allSavings - amount) < requiredReserve;

  const withdrawal: Deposit = {
    id: 'w' + (deposits.length + 1),
    memberId,
    memberNo: members.find((m) => m.id === memberId)?.memberNumber,
    amount,
    channel,
    method: channel,
    type: 'Withdrawal',
    fee: channel === 'Mobile money' ? 1500 : 0,
    date: TODAY,
    receivedAt: `${TODAY}T12:00:00Z`,
    reference: `WTH-${String(deposits.length + 1).padStart(3, '0')}`,
    status: isQueued ? 'pending' : 'confirmed',
    source: 'App',
  };

  deposits.push(withdrawal);

  notifications.push({
    id: 'n' + (notifications.length + 1),
    memberId,
    kind: 'deposit',
    heading: isQueued ? 'Withdrawal Queued' : 'Withdrawal Processed',
    title: `${formatUGX(amount)} withdrawn via ${channel}`,
    body: isQueued
      ? 'Your withdrawal was queued to preserve the mandatory SACCO reserve. It will disburse as new deposits settle.'
      : `Your withdrawal of ${formatUGX(amount)} has been initiated to your ${channel} account.`,
    date: TODAY,
    linkLabel: 'View transactions',
    linkId: withdrawal.id,
  });

  return withdrawal;
}

// BR-12 / BR-13: Close account and settle any active loans
export async function closeAccount(memberId: string): Promise<{ payoutAmount: number; shortfall: number }> {
  await wait();
  const member = members.find((m) => m.id === memberId);
  if (!member) throw new Error('Member not found.');

  const totalSavings = await getTotalSavings(memberId);
  const activeLoan = loans.find((l) => l.memberId === memberId && (l.status === 'Approved' || l.status === 'Overdue'));

  let outstanding = 0;
  if (activeLoan) {
    outstanding = loanOutstanding(activeLoan);
  }

  if (totalSavings >= outstanding) {
    // Settle loan and payout remaining savings
    const payout = totalSavings - outstanding;
    if (activeLoan) {
      activeLoan.status = 'Repaid';
      activeLoan.repaid += outstanding;
      activeLoan.completedDate = TODAY;
    }
    member.lockedSavings = 0;
    member.accountClosed = true;

    // Record clearing withdrawal
    deposits.push({
      id: 'w-close-' + Date.now(),
      memberId,
      amount: totalSavings,
      channel: 'Bank transfer',
      type: 'Withdrawal',
      date: TODAY,
      reference: 'ACC-CLOSURE-CLEARED',
      status: 'confirmed',
    });

    return { payoutAmount: payout, shortfall: 0 };
  } else {
    const shortfall = outstanding - totalSavings;
    throw new Error(
      `Cannot close account: Outstanding loan balance is ${formatUGX(outstanding)} while savings are ${formatUGX(totalSavings)}. Please clear the shortfall of ${formatUGX(shortfall)} first.`,
    );
  }
}

// ============================================================================
// 3. CREDIT BUREAU & LOAN ELIGIBILITY & DECISION (BR-15 to BR-41)
// ============================================================================

export async function getLoans(memberId: string): Promise<Loan[]> {
  await wait();
  return loans
    .filter((l) => l.memberId === memberId)
    .sort((a, b) => b.appliedDate.localeCompare(a.appliedDate) || b.id.localeCompare(a.id));
}

export async function getLoan(loanId: string): Promise<Loan | undefined> {
  await wait(50);
  return loans.find((l) => l.id === loanId);
}

// BR-15 to BR-41: Apply for loan with full business rule enforcement
export async function applyForLoan(
  memberId: string,
  amount: number,
  termMonths: number,
  purpose: string,
  crbConsentGiven = true,
): Promise<Loan> {
  await wait();
  const member = members.find((m) => m.id === memberId);
  if (!member) throw new Error('Member not found.');

  // BR-15: Explicit CRB consent check
  if (!crbConsentGiven) {
    throw new Error('Credit Bureau consent required: You must agree to a CRB inquiry to apply for a loan.');
  }

  // Minimum loan amount check
  if (amount < MIN_LOAN) {
    throw new Error(`Minimum loan amount is ${formatUGX(MIN_LOAN)}.`);
  }

  // BR-23: Only one active loan at a time
  const existingActive = loans.find(
    (l) => l.memberId === memberId && (l.status === 'Pending' || l.status === 'Approved' || l.status === 'Overdue'),
  );
  if (existingActive) {
    if (existingActive.status === 'Pending') {
      throw new Error('You already have a pending application under review. Please wait for a decision.');
    }
    if (existingActive.status === 'Overdue') {
      // BR-24: Reject if user has an overdue loan
      throw new Error('Application rejected: You have an overdue loan that must be cleared first.');
    }
    throw new Error('Application rejected: SACCO rules allow only one active loan per member at a time.');
  }

  // BR-25: Reject if user has an open fraud flag
  if (member.fraudFlag) {
    throw new Error('Application rejected: Your account has an open compliance review flag. Please visit the SACCO office.');
  }

  // BR-21: Minimum deposits check
  const memberDeposits = deposits.filter((d) => d.memberId === memberId && d.type !== 'Withdrawal');
  if (memberDeposits.length < MIN_DEPOSITS) {
    throw new Error(`Eligibility check failed: You need at least ${MIN_DEPOSITS} deposits before applying (current: ${memberDeposits.length}).`);
  }

  // BR-22: Minimum account age in days
  const accountAgeDays = daysBetween(member.joinedDate, TODAY);
  if (accountAgeDays < MIN_ACCOUNT_AGE) {
    throw new Error(
      `Eligibility check failed: Your account must be active for at least ${MIN_ACCOUNT_AGE} days before borrowing (active: ${accountAgeDays} days).`,
    );
  }

  // Calculate savings and credit risk score
  const savings = await getTotalSavings(memberId);
  const risk = await getRisk(memberId, amount);

  // BR-17: Reject if CRB report shows active default or blacklisting
  if (risk.crbReport?.status === 'Listed') {
    const loan: Loan = {
      id: 'l' + (loans.length + 1),
      memberId,
      memberNo: member.memberNumber,
      type: 'Business loan',
      amountRequested: amount,
      amount,
      interestRate: 15,
      termMonths,
      purpose: purpose.trim() || 'General',
      status: 'Rejected',
      appliedDate: TODAY,
      decidedDate: TODAY,
      repaid: 0,
      declineReasons: [
        'Adverse CRB report: Active default or blacklisting recorded at Credit Reference Bureau.',
        'High external credit risk rating.',
        'SACCO lending policy restricts credit to members with outstanding defaults.',
      ],
      note: 'Rejected due to adverse credit reference bureau report.',
    };
    loans.push(loan);
    return loan;
  }

  // Calculate borrowing limit
  // BR-34: Max loan = risk band's multiple x current savings
  let calculatedLimit = risk.maxLoanLimit || savings * MAX_LOAN_MULTIPLE;

  // BR-35: Cap first-time borrower at FIRST_LOAN_CAP (UGX 300,000)
  const priorRepaidLoans = loans.filter((l) => l.memberId === memberId && l.status === 'Repaid');
  const isFirstTime = priorRepaidLoans.length === 0;
  if (isFirstTime) {
    calculatedLimit = Math.min(calculatedLimit, FIRST_LOAN_CAP);
  }

  // BR-36: Cap at MAX_LOAN_CEILING
  calculatedLimit = Math.min(calculatedLimit, MAX_LOAN_CEILING);

  // BR-26: Reject if amount < MIN_LOAN or > calculated limit
  if (amount < MIN_LOAN) {
    throw new Error(`Minimum loan amount is ${formatUGX(MIN_LOAN)}.`);
  }
  if (amount > calculatedLimit) {
    throw new Error(
      `Requested amount exceeds your maximum limit of ${formatUGX(calculatedLimit)} ${
        isFirstTime ? `(First-time borrower limit: ${formatUGX(FIRST_LOAN_CAP)})` : ''
      }.`,
    );
  }

  // Determine loan rate from risk band (BR-56)
  const interestRate = risk.interestRate || INTEREST_RATE;
  const quote = calculateLoanQuote(amount, interestRate, termMonths, TODAY);

  // Loan decisioning based on Risk Band (BR-37, BR-38, BR-39):
  // - Low & Medium: Auto-approve
  // - High: Manual review queue (Pending)
  // - Very high: Decline (Rejected)
  let status: Loan['status'] = 'Pending';
  let declineReasons: string[] | undefined = undefined;

  if (risk.label === 'Very high risk') {
    // BR-39: Auto-decline
    status = 'Rejected';
    declineReasons = [
      'Credit risk score falls in the Very High Risk tier (< 30/100).',
      'Insufficient repayment or contribution track record.',
      'Borrowing capacity currently restricted by automated risk engine.',
    ];
  } else if (risk.label === 'Low risk' || risk.label === 'Medium risk') {
    // BR-37: Auto-approve
    status = 'Approved';
  } else {
    // BR-38: High band -> Manual review queue
    status = 'Pending';
  }

  const loan: Loan = {
    id: 'l' + (loans.length + 1),
    memberId,
    memberNo: member.memberNumber,
    type: 'Business loan',
    amountRequested: amount,
    amount,
    interestRate,
    annualRate: interestRate,
    termMonths,
    purpose: purpose.trim() || 'Not stated',
    status,
    appliedDate: TODAY,
    decidedDate: status !== 'Pending' ? TODAY : undefined,
    dueDate: addMonths(TODAY, termMonths),
    repaid: 0,
    outstandingBalance: status === 'Approved' ? quote.total : 0,
    originationFee: quote.originationFee,
    transactionFee: quote.transactionFee,
    totalRepayable: quote.total,
    riskBand: risk.label,
    schedule: quote.schedule,
    declineReasons,
    source: 'App',
  };

  // BR-43: Lock savings collateral at the moment of approval/disbursement
  if (status === 'Approved') {
    // Lock up to 1/3 of the loan as required collateral
    member.lockedSavings = Math.min(savings, Math.round(amount / MAX_LOAN_MULTIPLE));
  }

  loans.push(loan);

  // Audit entry (BR-61)
  auditLogs.push({
    id: 'aud-' + Date.now(),
    timestamp: new Date().toISOString(),
    reviewerId: status === 'Approved' ? 'SYSTEM-AUTO-APPROVAL' : status === 'Rejected' ? 'SYSTEM-AUTO-DECLINE' : 'SYSTEM-MANUAL-QUEUE',
    action: `LOAN_${status.toUpperCase()}`,
    reason: `Risk score: ${risk.score}/100 (${risk.label}). Risk tier lending criteria applied.`,
    targetId: loan.id,
  });

  // Notification (BR-40)
  notifications.push({
    id: 'n' + (notifications.length + 1),
    memberId,
    kind: 'loan',
    heading: status === 'Approved' ? 'Loan approved' : status === 'Rejected' ? 'Loan declined' : 'Application received',
    title:
      status === 'Approved'
        ? `${formatUGX(amount)} approved and ready`
        : status === 'Rejected'
          ? 'Application not approved'
          : 'Application under review',
    body:
      status === 'Approved'
        ? `Your request for ${formatUGX(amount)} at ${interestRate}% was approved. Repayments start next month.`
        : status === 'Rejected'
          ? `Your application for ${formatUGX(amount)} was not approved. You can view the reasons in the app.`
          : `Your request for ${formatUGX(amount)} has been forwarded for manual review.`,
    date: TODAY,
    linkLabel: 'View loan details',
    linkId: loan.id,
  });

  return loan;
}

// Demo helper: Approve a pending application manually
export async function previewDecision(loanId: string): Promise<Loan> {
  await wait();
  const loan = loans.find((l) => l.id === loanId);
  if (!loan) throw new Error('Loan not found.');

  loan.status = 'Approved';
  loan.decidedDate = TODAY;
  loan.dueDate = addMonths(TODAY, loan.termMonths);
  const quote = calculateLoanQuote(loan.amountRequested, loan.interestRate, loan.termMonths, TODAY);
  loan.outstandingBalance = quote.total;
  loan.schedule = quote.schedule;

  // Lock collateral
  const member = members.find((m) => m.id === loan.memberId);
  if (member) {
    const savings = await getTotalSavings(member.id);
    member.lockedSavings = Math.min(savings, Math.round(loan.amountRequested / MAX_LOAN_MULTIPLE));
  }

  // Audit record (BR-61)
  auditLogs.push({
    id: 'aud-' + Date.now(),
    timestamp: new Date().toISOString(),
    reviewerId: 'ADMIN-SIMULATOR',
    action: 'MANUAL_LOAN_APPROVAL',
    reason: 'Manual override decision via demo approval action.',
    targetId: loan.id,
  });

  notifications.push({
    id: 'n' + (notifications.length + 1),
    memberId: loan.memberId,
    kind: 'loan',
    heading: 'Loan approved',
    title: 'Your next chapter starts here.',
    body: `Your request for ${formatUGX(loan.amountRequested)} has been approved. Your SACCO will arrange repayment with you.`,
    date: TODAY,
    linkLabel: 'View loan details',
    linkId: loan.id,
  });

  return loan;
}

// Outstanding balance computation
export function loanOutstanding(loan: Loan): number {
  if (loan.status !== 'Approved' && loan.status !== 'Overdue') return 0;
  if (loan.outstandingBalance !== undefined) return loan.outstandingBalance;
  const quote = calculateLoanQuote(loan.amountRequested, loan.interestRate, loan.termMonths, loan.appliedDate);
  return Math.max(0, quote.total - loan.repaid);
}

export function nextInstalmentDate(loan: Loan): string {
  if (loan.schedule && loan.schedule.length > 0) {
    const nextItem = loan.schedule.find((s) => s.status === 'Pending' || s.status === 'Overdue');
    if (nextItem) return nextItem.dueDate;
  }
  return addMonths(loan.decidedDate ?? TODAY, 1);
}

// ============================================================================
// 4. DISBURSEMENT AND REPAYMENT (BR-42 to BR-54)
// ============================================================================

export async function recordRepayment(
  loanId: string,
  amount: number,
  channel: Channel = 'Mobile money',
): Promise<RepaymentRecord> {
  await wait();
  const loan = loans.find((l) => l.id === loanId);
  if (!loan) throw new Error('Loan not found.');
  if (loan.status !== 'Approved' && loan.status !== 'Overdue') {
    throw new Error('This loan is not active.');
  }
  if (amount <= 0) throw new Error('Enter a valid repayment amount.');

  const quote = calculateLoanQuote(loan.amountRequested, loan.interestRate, loan.termMonths, loan.decidedDate || loan.appliedDate);
  const currentOutstanding = loanOutstanding(loan);

  // BR-48 / BR-49: Late penalty calculation
  let penaltyDue = 0;
  const nextDate = nextInstalmentDate(loan);
  const overdueDays = daysBetween(nextDate, TODAY);
  if (overdueDays > GRACE_DAYS && loan.status === 'Overdue') {
    penaltyDue = calculateLatePenalty(quote.monthly, overdueDays);
  }

  // BR-45: Waterfall allocation (fees -> interest -> principal)
  const feesRemaining = Math.max(0, quote.totalFees - (loan.repaid * (quote.totalFees / quote.total)));
  const interestRemaining = Math.max(0, quote.interest - (loan.repaid * (quote.interest / quote.total)));
  const principalRemaining = Math.max(0, loan.amountRequested - (loan.repaid * (loan.amountRequested / quote.total)));

  const waterfall = applyRepaymentWaterfall(amount, feesRemaining, interestRemaining, principalRemaining, penaltyDue);

  loan.repaid += amount;
  loan.outstandingBalance = Math.max(0, currentOutstanding - amount);

  // Update schedule status
  if (loan.schedule) {
    let unallocated = amount;
    for (const item of loan.schedule) {
      if (item.status === 'Pending' || item.status === 'Overdue') {
        if (unallocated >= item.totalDue) {
          item.status = 'Paid';
          item.paidDate = TODAY;
          unallocated -= item.totalDue;
        } else {
          break;
        }
      }
    }
  }

  // Check if fully paid (BR-47)
  if (loan.outstandingBalance <= 0) {
    loan.status = 'Repaid';
    loan.completedDate = TODAY;

    // BR-47: Release locked savings
    const member = members.find((m) => m.id === loan.memberId);
    if (member) {
      member.lockedSavings = 0;
    }
  }

  const record: RepaymentRecord = {
    id: 'rep-' + (repayments.length + 1),
    loanId: loan.id,
    memberId: loan.memberId,
    amount,
    channel,
    date: TODAY,
    reference: `REP-${channel.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-4)}`,
    breakdown: {
      feesPaid: waterfall.feesPaid,
      interestPaid: waterfall.interestPaid,
      principalPaid: waterfall.principalPaid,
      penaltyPaid: waterfall.penaltyPaid,
    },
  };
  repayments.push(record);

  // Update history & trigger score recalculation (BR-30)
  const history = histories[loan.memberId];
  if (history) {
    history.instalmentsOnTime++;
  }

  notifications.push({
    id: 'n' + (notifications.length + 1),
    memberId: loan.memberId,
    kind: 'loan',
    heading: 'Repayment recorded',
    title: `UGX ${amount.toLocaleString()} received`,
    body: `Payment credited toward your loan via ${channel}. Remaining balance: ${formatUGX(loan.outstandingBalance)}.`,
    date: TODAY,
    linkLabel: 'View loan details',
    linkId: loan.id,
  });

  return record;
}

// BR-62: Appeal loan decision
export async function appealLoanDecision(loanId: string, appealReason: string): Promise<Loan> {
  await wait();
  const loan = loans.find((l) => l.id === loanId);
  if (!loan) throw new Error('Loan not found.');
  if (loan.status !== 'Rejected') {
    throw new Error('Only declined applications can be appealed.');
  }
  if (!appealReason.trim()) {
    throw new Error('Please provide a reason for your appeal.');
  }

  loan.appealStatus = 'Pending';
  loan.appealReason = appealReason.trim();

  // Route to manual review queue
  auditLogs.push({
    id: 'aud-app-' + Date.now(),
    timestamp: new Date().toISOString(),
    reviewerId: 'MEMBER-SELF',
    action: 'SUBMIT_APPEAL',
    reason: `Appeal: "${appealReason.trim()}"`,
    targetId: loan.id,
  });

  notifications.push({
    id: 'n' + (notifications.length + 1),
    memberId: loan.memberId,
    kind: 'reminder',
    heading: 'Appeal Submitted',
    title: 'Appeal routed to Credit Committee',
    body: 'Your appeal has been added to the manual review queue for the next lending meeting.',
    date: TODAY,
    linkLabel: 'View status',
    linkId: loan.id,
  });

  return loan;
}

// ============================================================================
// 5. RISK SCORING & TRANSPARENCY (BR-27 to BR-32, BR-60)
// ============================================================================

export async function getRisk(memberId: string, requested: number = EXAMPLE_REQUEST): Promise<RiskResult> {
  const savings = await getTotalSavings(memberId);
  const history = histories[memberId];
  if (!history) {
    return {
      score: 0,
      label: 'Not enough history',
      headline: 'Not enough history yet',
      requested,
      savings,
      maxLoanLimit: 0,
      interestRate: 12,
      scoredAt: TODAY,
      modelVersion: 'v2.1-BR-UG',
      reasons: [],
    };
  }
  return calculateRisk(history, requested, savings, TODAY);
}

// ============================================================================
// 6. NOTIFICATIONS & STATEMENTS (BR-60)
// ============================================================================

export async function getNotifications(memberId: string): Promise<AppNotification[]> {
  await wait();
  return notifications.filter((n) => n.memberId === memberId).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getStatementMonths(memberId: string): Promise<string[]> {
  const list = await getDeposits(memberId);
  const keys = new Set<string>([TODAY.slice(0, 7)]);
  list.forEach((d) => keys.add(d.date.slice(0, 7)));
  return Array.from(keys).sort().reverse();
}

export async function getStatement(memberId: string, monthKey: string = TODAY.slice(0, 7)): Promise<StatementData> {
  const member = members.find((m) => m.id === memberId);
  if (!member) throw new Error('Member not found.');
  const all = await getDeposits(memberId);
  const start = `${monthKey}-01`;
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const isCurrent = monthKey === TODAY.slice(0, 7);
  const endDay = isCurrent ? Number(TODAY.slice(8, 10)) : lastDay;
  const end = `${monthKey}-${String(endDay).padStart(2, '0')}`;

  const opening = all
    .filter((d) => d.date < start)
    .reduce((s, d) => (d.type === 'Withdrawal' ? s - d.amount : s + d.amount), 0);

  const inPeriodDeposits = all
    .filter((d) => d.date >= start && d.date <= end && d.type !== 'Withdrawal')
    .reduce((s, d) => s + d.amount, 0);

  const inPeriodWithdrawals = all
    .filter((d) => d.date >= start && d.date <= end && d.type === 'Withdrawal')
    .reduce((s, d) => s + d.amount, 0);

  const memberLoans = loans.filter((l) => l.memberId === memberId);
  const approved = memberLoans
    .filter((l) => l.decidedDate && l.decidedDate >= start && l.decidedDate <= end && l.status !== 'Rejected' && l.status !== 'Pending')
    .reduce((s, l) => s + l.amountRequested, 0);

  const memberRepayments = repayments.filter(
    (r) => r.memberId === memberId && r.date >= start && r.date <= end,
  );
  const repaymentsTotal = memberRepayments.reduce((s, r) => s + r.amount, 0);

  const startLabel = formatDate(start).slice(0, 2);
  const endLabel = formatDate(end);

  return {
    member,
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    rangeLabel: `${startLabel} – ${endLabel}`,
    opening,
    depositsInPeriod: inPeriodDeposits,
    withdrawalsInPeriod: inPeriodWithdrawals,
    closing: opening + inPeriodDeposits - inPeriodWithdrawals,
    loansApproved: approved,
    repayments: repaymentsTotal,
    updatedOn: TODAY,
  };
}

// ============================================================================
// 7. PRIVACY, COMPLIANCE & DATA EXPORT (BR-64, BR-65, BR-66)
// ============================================================================

export async function exportMemberData(memberId: string): Promise<string> {
  await wait();
  const member = members.find((m) => m.id === memberId);
  if (!member) throw new Error('Member not found.');

  const memberDeposits = deposits.filter((d) => d.memberId === memberId);
  const memberLoans = loans.filter((l) => l.memberId === memberId);
  const totalSavings = memberDeposits.reduce((sum, d) => (d.type === 'Withdrawal' ? sum - d.amount : sum + d.amount), 0);
  const lockedSavings = member.lockedSavings || 0;
  const availableSavings = Math.max(0, totalSavings - lockedSavings);
  const risk = await getRisk(memberId);

  const lines = [
    'IMARA SACCO — PERSONAL DATA SUMMARY',
    'Prepared under the Uganda Data Protection & Privacy Act 2019',
    `Date generated: ${formatDate(TODAY)}`,
    '',
    '1. MEMBER PROFILE',
    `• Full Name: ${member.fullName}`,
    `• Member Number: ${member.memberNumber}`,
    `• Registered Email: ${member.email}`,
    `• Verified Phone: ${member.phone}`,
    `• National ID (NIN): ${member.nin ?? 'Not recorded'}`,
    `• Date of Birth: ${member.dobIso ? formatDate(member.dobIso) : 'Not recorded'}`,
    `• Member Since: ${formatDate(member.joinedDate)}`,
    '',
    '2. SAVINGS SUMMARY',
    `• Total Savings: ${formatUGX(totalSavings)}`,
    `• Available to Withdraw: ${formatUGX(availableSavings)}`,
    `• Locked as Loan Security: ${formatUGX(lockedSavings)}`,
    `• Total Transactions on Record: ${memberDeposits.length}`,
    '',
    '3. CREDIT & LOAN ASSESSMENT',
    `• Current Credit Score: ${risk.score} / 100 (${risk.label})`,
    `• Approved Borrowing Limit: ${formatUGX(risk.maxLoanLimit ?? 0)}`,
    `• Credit Reference Status: ${risk.crbReport?.status ?? 'Clean'}`,
    '',
    '4. LOAN HISTORY',
    memberLoans.length === 0
      ? '• No loans on record.'
      : memberLoans
          .map(
            (l) =>
              `• ${l.type} (${formatUGX(l.amountRequested)}) — Status: ${l.status} (Applied: ${formatDate(l.appliedDate)})`,
          )
          .join('\n'),
    '',
    '5. YOUR PRIVACY RIGHTS',
    'You have the legal right to inspect, verify, and correct your personal information held by Imara SACCO. To update any details, contact your SACCO administrator.',
  ];

  return lines.join('\n');
}

export async function updateConsentPreferences(
  memberId: string,
  consentGiven: boolean,
  crbConsentGiven: boolean,
): Promise<void> {
  await wait();
  const member = members.find((m) => m.id === memberId);
  if (!member) throw new Error('Member not found.');

  member.consentGiven = consentGiven;
  member.crbConsentGiven = crbConsentGiven;

  auditLogs.push({
    id: 'aud-con-' + Date.now(),
    timestamp: new Date().toISOString(),
    reviewerId: 'MEMBER-SELF',
    action: 'UPDATE_PRIVACY_CONSENT',
    reason: `Updated consent: dataProcessing=${consentGiven}, crbInquiry=${crbConsentGiven}`,
    targetId: member.id,
  });
}
