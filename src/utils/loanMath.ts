import { LoanScheduleItem } from '../data/types';
import { addMonths } from './format';

export const ORIGINATION_FEE_RATE = 2.0; // 2% origination fee (capped at 3% by BR-57)
export const MOMO_DISBURSEMENT_FEE = 1500; // Flat UGX 1,500 mobile money transfer fee (BR-55)
export const GRACE_DAYS = 5; // BR-48
export const PENALTY_CAP_PERCENT = 10; // BR-49 max 10% penalty
export const PENALTY_DAILY_RATE = 0.5; // 0.5% per day overdue after grace period

export interface LoanQuote {
  amount: number;
  ratePercent: number;
  termMonths: number;
  interest: number;
  originationFee: number;
  transactionFee: number;
  totalFees: number;
  total: number;
  monthly: number;
  schedule: LoanScheduleItem[];
}

// Backwards-compatible loanTotals + extended quote
export function loanTotals(amount: number, ratePercent: number, termMonths: number, startDateIso = '2026-11-19') {
  const quote = calculateLoanQuote(amount, ratePercent, termMonths, startDateIso);
  return {
    interest: quote.interest,
    total: quote.total,
    monthly: quote.monthly,
    originationFee: quote.originationFee,
    transactionFee: quote.transactionFee,
    totalFees: quote.totalFees,
    schedule: quote.schedule,
  };
}

export function calculateLoanQuote(
  amount: number,
  ratePercent: number,
  termMonths: number,
  startDateIso: string = '2026-11-19',
): LoanQuote {
  if (amount <= 0 || termMonths <= 0) {
    return {
      amount: 0,
      ratePercent,
      termMonths,
      interest: 0,
      originationFee: 0,
      transactionFee: 0,
      totalFees: 0,
      total: 0,
      monthly: 0,
      schedule: [],
    };
  }

  // Interest (BR-56)
  const interest = Math.round(amount * (ratePercent / 100));

  // Origination fee: 2% of principal, capped at 3% (BR-57)
  const originationFee = Math.round(amount * (ORIGINATION_FEE_RATE / 100));

  // Mobile money disbursement fee (BR-55)
  const transactionFee = MOMO_DISBURSEMENT_FEE;
  const totalFees = originationFee + transactionFee;

  // Total repayable (BR-41)
  const total = amount + interest + totalFees;
  const monthly = Math.round(total / termMonths);

  // Generate repayment schedule with individual due dates (BR-41)
  const schedule: LoanScheduleItem[] = [];
  const principalPerMonth = Math.round(amount / termMonths);
  const interestPerMonth = Math.round(interest / termMonths);
  const feePerMonth = Math.round(totalFees / termMonths);

  let cumulativePaid = 0;
  for (let i = 1; i <= termMonths; i++) {
    const isLast = i === termMonths;
    const itemTotal = isLast ? total - cumulativePaid : monthly;
    cumulativePaid += itemTotal;

    const dueDate = addMonths(startDateIso, i);
    schedule.push({
      instalmentNumber: i,
      dueDate,
      totalDue: itemTotal,
      principal: isLast ? amount - principalPerMonth * (termMonths - 1) : principalPerMonth,
      interest: isLast ? interest - interestPerMonth * (termMonths - 1) : interestPerMonth,
      fee: isLast ? totalFees - feePerMonth * (termMonths - 1) : feePerMonth,
      status: 'Pending',
    });
  }

  return {
    amount,
    ratePercent,
    termMonths,
    interest,
    originationFee,
    transactionFee,
    totalFees,
    total,
    monthly,
    schedule,
  };
}

// Repayment waterfall (BR-45):
// 1. Penalties & Fees first
// 2. Interest second
// 3. Principal last
export interface WaterfallResult {
  penaltyPaid: number;
  feesPaid: number;
  interestPaid: number;
  principalPaid: number;
  remainingPayment: number;
  remainingBalance: number;
}

export function applyRepaymentWaterfall(
  payment: number,
  feesOutstanding: number,
  interestOutstanding: number,
  principalOutstanding: number,
  penaltyOutstanding = 0,
): WaterfallResult {
  let funds = payment;

  // 1. Penalties
  const penaltyPaid = Math.min(funds, penaltyOutstanding);
  funds -= penaltyPaid;

  // 2. Fees
  const feesPaid = Math.min(funds, feesOutstanding);
  funds -= feesPaid;

  // 3. Interest
  const interestPaid = Math.min(funds, interestOutstanding);
  funds -= interestPaid;

  // 4. Principal
  const principalPaid = Math.min(funds, principalOutstanding);
  funds -= principalPaid;

  const remainingBalance =
    penaltyOutstanding - penaltyPaid +
    (feesOutstanding - feesPaid) +
    (interestOutstanding - interestPaid) +
    (principalOutstanding - principalPaid);

  return {
    penaltyPaid,
    feesPaid,
    interestPaid,
    principalPaid,
    remainingPayment: funds,
    remainingBalance: Math.max(0, remainingBalance),
  };
}

// Late payment penalty calculator (BR-48, BR-49)
export function calculateLatePenalty(overdueAmount: number, daysOverdue: number): number {
  if (daysOverdue <= GRACE_DAYS || overdueAmount <= 0) {
    return 0;
  }
  const chargeableDays = daysOverdue - GRACE_DAYS;
  const rawPenalty = overdueAmount * ((chargeableDays * PENALTY_DAILY_RATE) / 100);
  const maxPenalty = overdueAmount * (PENALTY_CAP_PERCENT / 100);
  return Math.round(Math.min(rawPenalty, maxPenalty));
}
