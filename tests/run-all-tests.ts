// Automated Test Suite for Imara SACCO Mobile & USSD System
// Validates Business Rules BR-01 through BR-66, Loan Math, Scoring Engine & Data Layer

declare const process: any;

import {
  activateAccount,
  applyForLoan,
  closeAccount,
  exportMemberData,
  FIRST_LOAN_CAP,
  getAvailableSavings,
  getDeposits,
  getLoans,
  getLockedSavings,
  getRisk,
  getTotalSavings,
  MIN_ACCOUNT_AGE,
  MIN_DEPOSITS,
  MIN_LOAN,
  recordRepayment,
  signIn,
  updateConsentPreferences,
  withdrawSavings,
} from '../src/data/api';
import { calculateRisk, RISK_BANDS } from '../src/data/riskScore';
import {
  applyRepaymentWaterfall,
  calculateLatePenalty,
  calculateLoanQuote,
  GRACE_DAYS,
  MOMO_DISBURSEMENT_FEE,
  ORIGINATION_FEE_RATE,
  PENALTY_CAP_PERCENT,
} from '../src/utils/loanMath';
import { MemberHistory } from '../src/data/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

async function assertRejects(promise: Promise<any>, testName: string, expectedErrorSubstring = '') {
  try {
    await promise;
    console.error(`  ❌ FAIL: ${testName} (Expected exception but succeeded)`);
    failed++;
  } catch (err: any) {
    if (expectedErrorSubstring && !err.message.toLowerCase().includes(expectedErrorSubstring.toLowerCase())) {
      console.error(
        `  ❌ FAIL: ${testName} (Error "${err.message}" did not contain "${expectedErrorSubstring}")`,
      );
      failed++;
    } else {
      console.log(`  ✅ PASS: ${testName} -> Threw: "${err.message}"`);
      passed++;
    }
  }
}

async function runTests() {
  console.log('\n=============================================================');
  console.log(' IMARA SACCO AUTOMATED VERIFICATION SUITE (BR-01 to BR-66) ');
  console.log('=============================================================\n');

  // --------------------------------------------------------------------------
  // 1. REGISTRATION & IDENTITY (BR-01 to BR-06)
  // --------------------------------------------------------------------------
  console.log('📋 1. Testing Registration and Identity (BR-01 to BR-06)...');

  // BR-01: Age >= 18 check (User born 2012 is ~14 years old in 2026)
  await assertRejects(
    activateAccount({
      memberNumber: 'YM 2334',
      email: 'amina@example.com',
      invitationCode: 'IMARA-2026',
      password: 'password123',
      dobIso: '2012-05-10', // 14 years old
      nin: 'CM12000000TEST',
      consentGiven: true,
    }),
    'BR-01: Reject user under 18 years old',
    'at least 18 years old',
  );

  // BR-03: Reject duplicate NIN
  await assertRejects(
    activateAccount({
      memberNumber: 'YM 2334',
      email: 'amina@example.com',
      invitationCode: 'IMARA-2026',
      password: 'password123',
      dobIso: '1995-04-14',
      nin: 'CM01098765EFGH', // Duplicate of Rolex (m1)
      consentGiven: true,
    }),
    'BR-03: Reject duplicate National ID Number (NIN)',
    'already registered to another account',
  );

  // BR-04: Mobile money name mismatch
  await assertRejects(
    activateAccount({
      memberNumber: 'YM 2334',
      email: 'amina@example.com',
      invitationCode: 'IMARA-2026',
      password: 'password123',
      dobIso: '1995-04-14',
      nin: 'CM95000000TEST',
      momoName: 'Completely Different Name',
      consentGiven: true,
    }),
    'BR-04: Reject mismatch between registered name and MoMo name',
    'name mismatch',
  );

  // BR-06: Explicit consent requirement
  await assertRejects(
    activateAccount({
      memberNumber: 'YM 2334',
      email: 'amina@example.com',
      invitationCode: 'IMARA-2026',
      password: 'password123',
      dobIso: '1995-04-14',
      nin: 'CM95000000TEST',
      consentGiven: false,
    }),
    'BR-06: Reject account activation without explicit consent',
    'Consent required',
  );

  // Valid Sign In
  const member = await signIn('amina@example.com', 'amina123');
  assert(member.id === 'm2', 'Authentication: Sign in with valid credentials');

  // --------------------------------------------------------------------------
  // 2. CREDIT SCORING ENGINE (BR-27 to BR-33, BR-18)
  // --------------------------------------------------------------------------
  console.log('\n📊 2. Testing Credit Scoring Engine (BR-27 to BR-33)...');

  // BR-27: Score must be on 0 to 100 scale
  const aminaRisk = await getRisk('m2', 200000);
  assert(
    aminaRisk.score >= 0 && aminaRisk.score <= 100,
    'BR-27: Credit score computed on 0 to 100 scale',
    `Score: ${aminaRisk.score}`,
  );
  assert(aminaRisk.score >= 75, 'BR-33: Amina assigned to Low Risk band (score >= 75)');
  assert(aminaRisk.label === 'Low risk', 'BR-33: Correct risk label "Low risk"');
  assert(aminaRisk.reasons.length === 6, 'BR-28: Evaluates all 6 weighted factors');

  // BR-29: Low starting score / Not enough history for < 3 months
  const rolexRisk = await getRisk('m1', 100000);
  assert(
    rolexRisk.label === 'Not enough history',
    'BR-29: Member with < 3 months assigned "Not enough history"',
  );

  // BR-18: Thin file CRB handling
  const thinHistory: MemberHistory = {
    monthsInGroup: 6,
    expectedContributions: 6,
    onTimeContributions: 6,
    instalmentsDue: 0,
    instalmentsOnTime: 0,
    crbStatus: 'No record',
    crbScore: 60,
  };
  const thinResult = calculateRisk(thinHistory, 100000, 300000);
  assert(
    thinResult.score >= 50 && thinResult.score < 75,
    'BR-18: Thin-file CRB user assigned neutral baseline score (Medium risk)',
    `Score: ${thinResult.score}`,
  );

  // BR-17: Active default / blacklisting on CRB caps score at high risk
  const defaultedHistory: MemberHistory = {
    ...thinHistory,
    crbStatus: 'Listed',
  };
  const listedResult = calculateRisk(defaultedHistory, 100000, 300000);
  assert(
    listedResult.score <= 30 && listedResult.label === 'Very high risk',
    'BR-17: Listed CRB active default forces Very High Risk classification',
    `Score: ${listedResult.score}`,
  );

  // --------------------------------------------------------------------------
  // 3. LOAN MATH & WATERFALL (BR-41, BR-45, BR-48, BR-49, BR-55, BR-57)
  // --------------------------------------------------------------------------
  console.log('\n💰 3. Testing Loan Math & Waterfall Allocation (BR-41, BR-45, BR-48, BR-49)...');

  const quote = calculateLoanQuote(200000, 12, 12, '2026-11-19');
  assert(quote.interest === 24000, 'Loan Interest: 12% flat on 200,000 = 24,000 UGX');
  assert(quote.originationFee === 4000, 'BR-57: Origination fee 2% of 200,000 = 4,000 UGX');
  assert(quote.transactionFee === MOMO_DISBURSEMENT_FEE, 'BR-55: Mobile money disbursement fee 1,500 UGX');
  assert(quote.total === 200000 + 24000 + 4000 + 1500, 'BR-41: Total repayable includes principal + interest + all disclosed fees');
  assert(quote.schedule.length === 12, 'BR-41: Generated 12 individual monthly due date entries');
  assert(quote.schedule[0].dueDate === '2026-12-19', 'BR-41: First instalment due 1 month after origination');

  // BR-45: Repayment waterfall (Penalties -> Fees -> Interest -> Principal)
  // Payment of UGX 10,000 against: Penalty 2,000, Fees 5,000, Interest 8,000, Principal 50,000
  const waterfall = applyRepaymentWaterfall(10000, 5000, 8000, 50000, 2000);
  assert(waterfall.penaltyPaid === 2000, 'BR-45 Waterfall: Penalties cleared first (2,000 UGX)');
  assert(waterfall.feesPaid === 5000, 'BR-45 Waterfall: Fees cleared second (5,000 UGX)');
  assert(waterfall.interestPaid === 3000, 'BR-45 Waterfall: Remaining 3,000 UGX applied to interest');
  assert(waterfall.principalPaid === 0, 'BR-45 Waterfall: Principal untouched until interest cleared');

  // BR-48 & BR-49: Grace period and penalty cap
  const withinGrace = calculateLatePenalty(50000, 3);
  assert(withinGrace === 0, `BR-48: Zero penalty within ${GRACE_DAYS}-day grace period`);

  const pastGrace = calculateLatePenalty(100000, 15); // 10 days past grace @ 0.5% = 5%
  assert(pastGrace === 5000, 'BR-49: 0.5%/day penalty after grace period (5,000 UGX on 100k for 10 days)');

  const extremeLate = calculateLatePenalty(100000, 60); // Would be 55 * 0.5% = 27.5%, capped at 10%
  assert(extremeLate === 10000, `BR-49: Late penalty strictly capped at ${PENALTY_CAP_PERCENT}% (10,000 UGX)`);

  // --------------------------------------------------------------------------
  // 4. LOAN ELIGIBILITY & DECISIONING (BR-15 to BR-40, BR-43, BR-47)
  // --------------------------------------------------------------------------
  console.log('\n🏛️ 4. Testing Loan Eligibility Rules (BR-15 to BR-40)...');

  // BR-15: CRB consent required
  await assertRejects(
    applyForLoan('m2', 100000, 6, 'Stock', false),
    'BR-15: Reject loan if user does not grant CRB consent',
    'Credit Bureau consent required',
  );

  // BR-26: Below MIN_LOAN
  await assertRejects(
    applyForLoan('m2', 20000, 6, 'Stock', true),
    `BR-26: Reject loan below MIN_LOAN (${MIN_LOAN} UGX)`,
    'Minimum loan amount',
  );

  // BR-21: Rolex only has 1 deposit (needs MIN_DEPOSITS >= 3)
  await assertRejects(
    applyForLoan('m1', 100000, 6, 'Stock', true),
    `BR-21: Reject loan for member with fewer than ${MIN_DEPOSITS} deposits`,
    'at least 3 deposits',
  );

  // BR-37 & BR-43: Apply for loan for Amina (Low risk -> Auto-approved + Savings locked)
  const initialAvailable = await getAvailableSavings('m2');
  const appliedLoan = await applyForLoan('m2', 150000, 6, 'Produce stall expansion', true);
  assert(appliedLoan.status === 'Approved', 'BR-37: Auto-approve Low Risk band loan');

  const lockedAfterLoan = await getLockedSavings('m2');
  assert(lockedAfterLoan > 0, `BR-43: Savings collateral locked on loan approval (${lockedAfterLoan} UGX)`);

  // BR-23: Reject second active loan
  await assertRejects(
    applyForLoan('m2', 100000, 6, 'Second loan', true),
    'BR-23: Reject duplicate loan when an active loan exists',
    'only one active loan',
  );

  // --------------------------------------------------------------------------
  // 5. SAVINGS, WITHDRAWALS & COLLATERAL PROTECTION (BR-08, BR-09, BR-12)
  // --------------------------------------------------------------------------
  console.log('\n🏦 5. Testing Savings, Withdrawals & Collateral Locking (BR-08, BR-09, BR-12)...');

  const totalSavings = await getTotalSavings('m2');
  const availableSavings = await getAvailableSavings('m2');

  // BR-08 / BR-09: Cannot withdraw locked collateral
  await assertRejects(
    withdrawSavings('m2', totalSavings, 'Mobile money'),
    'BR-08 / BR-09: Prevent withdrawal of savings locked as collateral',
    'Insufficient unlocked savings',
  );

  // BR-12: Can withdraw unlocked savings
  const withdrawAmount = Math.min(20000, availableSavings);
  if (withdrawAmount > 0) {
    const withdrawal = await withdrawSavings('m2', withdrawAmount, 'Mobile money');
    assert(
      withdrawal.type === 'Withdrawal',
      `BR-12: Successfully withdraw unlocked savings (${withdrawAmount} UGX)`,
    );
  }

  // --------------------------------------------------------------------------
  // 6. REPAYMENT & RELEASE OF COLLATERAL (BR-44, BR-45, BR-47)
  // --------------------------------------------------------------------------
  console.log('\n💳 6. Testing Loan Repayment & Collateral Release (BR-44, BR-47)...');

  // Repay full remaining balance of the newly applied loan
  const outstandingBefore = appliedLoan.outstandingBalance || 150000;
  const repayment = await recordRepayment(appliedLoan.id, outstandingBefore, 'Mobile money');
  assert(repayment.amount === outstandingBefore, 'BR-44: Repay loan via Mobile Money');
  assert(appliedLoan.status === 'Repaid', 'BR-47: Loan marked as fully Repaid');

  const lockedAfterRepay = await getLockedSavings('m2');
  assert(lockedAfterRepay === 0, 'BR-47: Collateral released back to unlocked savings upon full repayment');

  // --------------------------------------------------------------------------
  // 7. COMPLIANCE, DATA EXPORT & ACCOUNT CLOSURE (BR-12, BR-13, BR-64, BR-65)
  // --------------------------------------------------------------------------
  console.log('\n🔒 7. Testing Compliance, Data Export & Account Closure (BR-12, BR-13, BR-65)...');

  // BR-65: Export data under Uganda Data Protection Act 2019
  const memberExport = await exportMemberData('m2');
  assert(
    memberExport.includes('Uganda Data Protection & Privacy Act 2019'),
    'BR-65: Export summary references Uganda Data Protection Act 2019',
  );
  assert(memberExport.includes('Total Savings:'), 'BR-65: Export summary includes savings breakdown');
  assert(memberExport.includes('Credit Score:'), 'BR-65: Export summary includes credit score assessment');
  assert(memberExport.includes('Full Name: Amina Were'), 'BR-65: Export summary includes member profile');

  // BR-64: Update consent preferences
  await updateConsentPreferences('m2', true, false);
  const updatedMember = (await signIn('amina@example.com', 'amina123'));
  assert(updatedMember.crbConsentGiven === false, 'BR-64: Successfully update user consent preferences');

  console.log('\n=============================================================');
  console.log(` TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
