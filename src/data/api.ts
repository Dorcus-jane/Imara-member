// THE DATA LAYER.
// Every screen gets its data from the functions in this file and nowhere else.
// Today they read the sample data in memory. To connect Firestore later,
// rewrite the bodies of these functions and keep their names and return types.
import { calculateRisk } from './riskScore';
import {
  DEMO_TODAY,
  INVITATION_CODE,
  demoAccounts,
  deposits,
  histories,
  loans,
  members,
  notifications,
} from './sampleData';
import { AppNotification, Deposit, Loan, Member, RiskResult, StatementData } from './types';
import { addMonths, formatDate, formatMonthLabel, formatUGX } from '../utils/format';
import { loanTotals } from '../utils/loanMath';

export const MAX_LOAN_MULTIPLE = 3; // administrator-set limit: loan up to 3x savings
export const INTEREST_RATE = 12; // flat percent
export const TERM_OPTIONS = [6, 12, 18, 24];
export const EXAMPLE_REQUEST = 200000; // used to show an example score before a request is made
export const TODAY = DEMO_TODAY;

const wait = (ms = 200) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ---------- Accounts ----------
export async function signIn(email: string, password: string): Promise<Member> {
  await wait();
  const account = demoAccounts.find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password,
  );
  if (!account) throw new Error('Wrong email or password.');
  const member = members.find((m) => m.id === account.memberId);
  if (!member) throw new Error('Member account not found.');
  return member;
}

export async function activateAccount(
  memberNumber: string,
  email: string,
  invitationCode: string,
  password: string,
): Promise<Member> {
  await wait();
  const member = members.find(
    (m) =>
      m.memberNumber.toLowerCase() === memberNumber.trim().toLowerCase() &&
      m.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!member) throw new Error('We could not find that member number and email. Check with your SACCO.');
  if (invitationCode.trim().toUpperCase() !== INVITATION_CODE) throw new Error('That invitation code is not valid.');
  if (password.length < 8) throw new Error('Choose a password with 8 or more characters.');
  const existing = demoAccounts.find((a) => a.memberId === member.id);
  if (existing) existing.password = password;
  else demoAccounts.push({ email: member.email, password, memberId: member.id });
  return member;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await wait();
  if (!email.trim()) throw new Error('Enter the email linked to your member account.');
}

// ---------- Deposits ----------
export async function getDeposits(memberId: string): Promise<Deposit[]> {
  await wait();
  return deposits.filter((d) => d.memberId === memberId).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getTotalSavings(memberId: string): Promise<number> {
  const list = await getDeposits(memberId);
  return list.reduce((sum, d) => sum + d.amount, 0);
}

// ---------- Loans ----------
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

export async function applyForLoan(
  memberId: string,
  amount: number,
  termMonths: number,
  purpose: string,
): Promise<Loan> {
  await wait();
  if (loans.some((l) => l.memberId === memberId && l.status === 'Pending')) {
    throw new Error('You already have a pending application. Please wait for a decision.');
  }
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter the amount you want to borrow.');
  const loan: Loan = {
    id: 'l' + (loans.length + 1),
    memberId,
    type: 'Business loan',
    amountRequested: amount,
    interestRate: INTEREST_RATE,
    termMonths,
    purpose: purpose.trim() || 'Not stated',
    status: 'Pending',
    appliedDate: TODAY,
    repaid: 0,
  };
  loans.push(loan);
  return loan;
}

// Demo only: shows what happens when the SACCO approves a pending request.
export async function previewDecision(loanId: string): Promise<Loan> {
  await wait();
  const loan = loans.find((l) => l.id === loanId);
  if (!loan) throw new Error('Loan not found.');
  loan.status = 'Approved';
  loan.decidedDate = TODAY;
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

export function loanOutstanding(loan: Loan): number {
  if (loan.status !== 'Approved') return 0;
  const { total } = loanTotals(loan.amountRequested, loan.interestRate, loan.termMonths);
  return Math.max(0, total - loan.repaid);
}

export function nextInstalmentDate(loan: Loan): string {
  return addMonths(loan.decidedDate ?? TODAY, 1);
}

// ---------- Risk score ----------
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
      reasons: [],
    };
  }
  return calculateRisk(history, requested, savings);
}

// ---------- Notifications ----------
export async function getNotifications(memberId: string): Promise<AppNotification[]> {
  await wait();
  return notifications.filter((n) => n.memberId === memberId).sort((a, b) => b.date.localeCompare(a.date));
}

// ---------- Statements ----------
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
  const opening = all.filter((d) => d.date < start).reduce((s, d) => s + d.amount, 0);
  const inPeriod = all.filter((d) => d.date >= start && d.date <= end).reduce((s, d) => s + d.amount, 0);
  const memberLoans = loans.filter((l) => l.memberId === memberId);
  const approved = memberLoans
    .filter((l) => l.decidedDate && l.decidedDate >= start && l.decidedDate <= end && l.status !== 'Rejected' && l.status !== 'Pending')
    .reduce((s, l) => s + l.amountRequested, 0);
  const startLabel = formatDate(start).slice(0, 2);
  const endLabel = formatDate(end);
  return {
    member,
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    rangeLabel: `${startLabel} – ${endLabel}`,
    opening,
    depositsInPeriod: inPeriod,
    closing: opening + inPeriod,
    loansApproved: approved,
    repayments: 0,
    updatedOn: TODAY,
  };
}
