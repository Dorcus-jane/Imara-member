import { MemberHistory, RiskResult } from './types';
import { formatUGX } from '../utils/format';

// Weights from the SRS (section 8). If a member has no loan history yet,
// that factor is left out and the others are scaled up.
const W_ON_TIME = 0.4;
const W_REPAYMENT = 0.3;
const W_TENURE = 0.2;
const W_SIZE = 0.1;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function calculateRisk(history: MemberHistory, requested: number, savings: number): RiskResult {
  if (history.monthsInGroup < 3) {
    return {
      score: 0,
      label: 'Not enough history',
      headline: 'Not enough history yet',
      requested,
      savings,
      reasons: [
        {
          title: 'Time in the group',
          text: `You’ve been a member for ${history.monthsInGroup} month${history.monthsInGroup === 1 ? '' : 's'}. A score appears after 3 months.`,
        },
      ],
    };
  }

  const onTime = history.expectedContributions > 0 ? history.onTimeContributions / history.expectedContributions : 0;
  const tenure = Math.min(history.monthsInGroup, 24) / 24;
  const ratio = savings > 0 ? requested / savings : 1;
  const size = clamp01(1 - ratio);
  const hasLoanHistory = history.instalmentsDue > 0;
  const repayment = hasLoanHistory ? history.instalmentsOnTime / history.instalmentsDue : 0;

  let score: number;
  if (hasLoanHistory) {
    score = W_ON_TIME * onTime + W_REPAYMENT * repayment + W_TENURE * tenure + W_SIZE * size;
  } else {
    score = (W_ON_TIME * onTime + W_TENURE * tenure + W_SIZE * size) / (W_ON_TIME + W_TENURE + W_SIZE);
  }
  score = Math.round(clamp01(score) * 100) / 100;

  const label = score >= 0.75 ? 'Low risk' : score >= 0.5 ? 'Medium risk' : 'High risk';
  const headline =
    label === 'Low risk'
      ? 'Low risk · A strong track record'
      : label === 'Medium risk'
        ? 'Medium risk · Room to grow'
        : 'High risk · Let’s build your record';

  const repaymentText = !hasLoanHistory
    ? 'You have no earlier loans yet.'
    : history.instalmentsOnTime === history.instalmentsDue
      ? 'Your previous loan was repaid on time.'
      : `You paid ${history.instalmentsOnTime} of ${history.instalmentsDue} loan instalments on time.`;

  return {
    score,
    label,
    headline,
    requested,
    savings,
    reasons: [
      {
        title: 'On-time contributions',
        text: `Paid on time in ${history.onTimeContributions} of ${history.expectedContributions} months.`,
      },
      { title: 'Loan repayment record', text: repaymentText },
      { title: 'Time in the group', text: `You’ve been a member for ${history.monthsInGroup} months.` },
      {
        title: 'Loan size vs savings',
        text: `${formatUGX(requested)} requested against ${formatUGX(savings)} saved.`,
      },
    ],
  };
}
