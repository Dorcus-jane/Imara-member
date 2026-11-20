import { MemberHistory, RiskLabel, RiskResult } from './types';
import { formatUGX } from '../utils/format';

// Business Rules Section 3.x.5 & 3.x.6 (BR-27, BR-28, BR-29, BR-31, BR-32, BR-33, BR-34, BR-56)
// Six weighted factors according to BR-28:
// 1. Repayment history: 25%
// 2. Savings consistency: 15%
// 3. Amount saved: 20%
// 4. CRB report: 15%
// 5. Capacity (debt-to-savings/income ratio): 15%
// 6. Account tenure and activity: 10%

export const MODEL_VERSION = 'v2.1-BR-UG';

export const RISK_BANDS = {
  LOW: { min: 75, max: 100, label: 'Low risk' as RiskLabel, multiple: 3.0, interestRate: 10 },
  MEDIUM: { min: 50, max: 74, label: 'Medium risk' as RiskLabel, multiple: 2.0, interestRate: 12 },
  HIGH: { min: 30, max: 49, label: 'High risk' as RiskLabel, multiple: 1.5, interestRate: 15 },
  VERY_HIGH: { min: 0, max: 29, label: 'Very high risk' as RiskLabel, multiple: 0.0, interestRate: 18 },
};

const clamp = (val: number, min = 0, max = 1) => Math.max(min, Math.min(max, val));

export function calculateRisk(
  history: MemberHistory,
  requested: number,
  savings: number,
  asOfDate: string = '2026-11-19',
): RiskResult {
  // BR-22 / BR-29: Accounts under 3 months get "Not enough history"
  if (history.monthsInGroup < 3) {
    return {
      score: 0,
      label: 'Not enough history',
      headline: 'Not enough history yet',
      requested,
      savings,
      maxLoanLimit: 0,
      interestRate: 12,
      scoredAt: asOfDate,
      modelVersion: MODEL_VERSION,
      inputs: {
        monthsInGroup: history.monthsInGroup,
        savings,
        requested,
      },
      reasons: [
        {
          title: 'Account tenure',
          text: `You have been a member for ${history.monthsInGroup} month${history.monthsInGroup === 1 ? '' : 's'}. A full risk score is generated after 3 months.`,
        },
      ],
      crbReport: {
        status: history.crbStatus ?? 'No record',
        score: history.crbScore ?? 60,
        queryDate: asOfDate,
      },
    };
  }

  // Factor 1: Repayment History (25%) (BR-28, BR-29)
  // New users with no loan history start at a conservative neutral score (40%)
  const hasLoanHistory = history.instalmentsDue > 0;
  const repaymentRatio = hasLoanHistory ? history.instalmentsOnTime / history.instalmentsDue : 0.45;
  const missedPenalty = history.missedPayments ? Math.min(0.5, history.missedPayments * 0.15) : 0;
  const scoreRepayment = clamp(repaymentRatio - missedPenalty) * 100;

  // Factor 2: Savings Consistency (15%) (BR-28)
  const consistencyRatio = history.expectedContributions > 0 ? history.onTimeContributions / history.expectedContributions : 0.5;
  const scoreConsistency = clamp(consistencyRatio) * 100;

  // Factor 3: Amount Saved (20%) (BR-28)
  // Benchmark target: UGX 1,000,000 for top tier
  const amountRatio = Math.min(1, savings / 1000000);
  const scoreAmountSaved = clamp(amountRatio) * 100;

  // Factor 4: CRB Report (15%) (BR-16, BR-17, BR-18)
  // BR-18: 'No record' treated as thin-file neutral (60/100). Clean = 100, Listed/Default = 0
  const crbStatus = history.crbStatus ?? 'Clean';
  let scoreCRB = 100;
  if (crbStatus === 'Listed') {
    scoreCRB = 0; // Blacklisted / active default
  } else if (crbStatus === 'No record') {
    scoreCRB = 60; // Thin file neutral score
  } else if (history.crbScore !== undefined) {
    scoreCRB = clamp(history.crbScore / 100) * 100;
  }

  // Factor 5: Capacity / Loan Size vs Savings (15%) (BR-28)
  // Loan requested vs current savings
  const coverageRatio = savings > 0 ? requested / savings : 1.0;
  // If requesting <= 1x savings, 100. If 2x, 60. If >= 3x, 30.
  const scoreCapacity = clamp(coverageRatio <= 1 ? 1.0 : coverageRatio <= 2 ? 0.75 : coverageRatio <= 3 ? 0.5 : 0.2) * 100;

  // Factor 6: Tenure and Activity (10%) (BR-28)
  // Capped at 24 months for max points
  const tenureRatio = Math.min(history.monthsInGroup, 24) / 24;
  const scoreTenure = clamp(tenureRatio) * 100;

  // Weighted Sum (BR-28)
  // 25% + 15% + 20% + 15% + 15% + 10% = 100%
  let totalScore =
    0.25 * scoreRepayment +
    0.15 * scoreConsistency +
    0.20 * scoreAmountSaved +
    0.15 * scoreCRB +
    0.15 * scoreCapacity +
    0.10 * scoreTenure;

  // Active default on CRB forces High/Very High (BR-17)
  if (crbStatus === 'Listed') {
    totalScore = Math.min(totalScore, 25);
  }

  const finalScore = Math.round(clamp(totalScore, 0, 100));

  // Determine Risk Band (BR-33)
  let label: RiskLabel = 'Low risk';
  let multiple = RISK_BANDS.LOW.multiple;
  let interestRate = RISK_BANDS.LOW.interestRate;
  let headline = 'Low risk · Strong repayment outlook';

  if (finalScore >= RISK_BANDS.LOW.min) {
    label = RISK_BANDS.LOW.label;
    multiple = RISK_BANDS.LOW.multiple;
    interestRate = RISK_BANDS.LOW.interestRate;
    headline = 'Low risk · Strong repayment outlook';
  } else if (finalScore >= RISK_BANDS.MEDIUM.min) {
    label = RISK_BANDS.MEDIUM.label;
    multiple = RISK_BANDS.MEDIUM.multiple;
    interestRate = RISK_BANDS.MEDIUM.interestRate;
    headline = 'Medium risk · Eligible with standard terms';
  } else if (finalScore >= RISK_BANDS.HIGH.min) {
    label = RISK_BANDS.HIGH.label;
    multiple = RISK_BANDS.HIGH.multiple;
    interestRate = RISK_BANDS.HIGH.interestRate;
    headline = 'High risk · Requires manual review by SACCO';
  } else {
    label = RISK_BANDS.VERY_HIGH.label;
    multiple = RISK_BANDS.VERY_HIGH.multiple;
    interestRate = RISK_BANDS.VERY_HIGH.interestRate;
    headline = 'Very high risk · Loan applications currently restricted';
  }

  // Maximum borrowing capacity (BR-34)
  const maxLoanLimit = Math.round(savings * multiple);

  // Top reasons explaining the score (BR-40)
  const reasons = [
    {
      title: 'Repayment record (25% weight)',
      text: !hasLoanHistory
        ? 'First-time borrower baseline score applied.'
        : history.instalmentsOnTime === history.instalmentsDue
          ? `All ${history.instalmentsDue} previous loan instalments paid on time.`
          : `Paid ${history.instalmentsOnTime} of ${history.instalmentsDue} loan instalments on time.`,
    },
    {
      title: 'Savings consistency (15% weight)',
      text: `Contributed on time in ${history.onTimeContributions} of ${history.expectedContributions} expected months.`,
    },
    {
      title: 'Accumulated savings (20% weight)',
      text: `${formatUGX(savings)} saved in your SACCO pool.`,
    },
    {
      title: 'Credit bureau report (15% weight)',
      text: crbStatus === 'Clean'
        ? 'Clean credit bureau status with no active defaults.'
        : crbStatus === 'No record'
          ? 'Thin-file credit record: no external defaults reported.'
          : 'Active default or adverse record reported by credit reference bureau.',
    },
    {
      title: 'Borrowing capacity (15% weight)',
      text: requested > 0
        ? `Requesting ${formatUGX(requested)} against ${formatUGX(savings)} saved (${coverageRatio.toFixed(1)}x multiple).`
        : `Allowed borrowing up to ${multiple}x your savings (${formatUGX(maxLoanLimit)}).`,
    },
    {
      title: 'SACCO tenure (10% weight)',
      text: `Active membership for ${history.monthsInGroup} months.`,
    },
  ];

  return {
    score: finalScore,
    label,
    headline,
    reasons,
    requested,
    savings,
    maxLoanLimit,
    interestRate,
    scoredAt: asOfDate,
    modelVersion: MODEL_VERSION,
    inputs: {
      repaymentScore: Math.round(scoreRepayment),
      consistencyScore: Math.round(scoreConsistency),
      amountScore: Math.round(scoreAmountSaved),
      crbScore: Math.round(scoreCRB),
      capacityScore: Math.round(scoreCapacity),
      tenureScore: Math.round(scoreTenure),
    },
    crbReport: {
      status: crbStatus,
      score: scoreCRB,
      queryDate: asOfDate,
    },
  };
}
