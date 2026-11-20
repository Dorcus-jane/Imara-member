#!/usr/bin/env node
/**
 * Imara SACCO — Interactive USSD Banking CLI Simulator
 * Simulates dialing *123# on a phone using standard Africa's Talking USSD protocol.
 * 
 * Usage:
 *   node scripts/ussd-interactive.js
 *   or: npm run ussd
 */

const readline = require('readline');

// Sample member data store for standalone terminal simulation
const sampleMembers = {
  '+256700000001': {
    name: 'Amina Were',
    firstName: 'Amina',
    phone: '+256700000001',
    pin: '1234',
    pinAttempts: 0,
    savings: 1000000,
    lockedSavings: 50000,
    loanLimit: 3000000,
    creditScore: 85,
    riskBand: 'Low Risk',
    activeLoan: {
      type: 'Quick Micro-Loan',
      balance: 150000,
      monthly: 56000,
      nextDueDate: '2026-12-19',
    },
    miniStatement: [
      '2026-11-15: Dep UGX 100,000 (MTN)',
      '2026-10-30: Dep UGX 150,000 (Airtel)',
      '2026-10-15: Loan Repay UGX 56,000',
    ],
  },
  '+256700000002': {
    name: 'Rolex Denis',
    firstName: 'Denis',
    phone: '+256700000002',
    pin: '1234',
    pinAttempts: 0,
    savings: 200000,
    lockedSavings: 0,
    loanLimit: 600000,
    creditScore: 55,
    riskBand: 'Medium Risk',
    activeLoan: null,
    miniStatement: [
      '2026-11-01: Dep UGX 200,000 (MTN)',
    ],
  },
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let currentPhone = '+256700000001';
let sessionHistory = [];
let active = false;

function formatUGX(val) {
  return 'UGX ' + Number(val).toLocaleString();
}

function printBox(text, isEnd = false) {
  console.log('\n┌──────────────────────────────────────────────┐');
  console.log(`│ 📱 PHONE SCREEN ${isEnd ? '[SESSION ENDED]' : '[SESSION ACTIVE]'}        │`);
  console.log('├──────────────────────────────────────────────┤');
  const lines = text.split('\n');
  for (const line of lines) {
    console.log(`│ ${line.padEnd(44)} │`);
  }
  console.log('└──────────────────────────────────────────────┘');
}

/**
 * Core USSD Session Engine (Africa's Talking cumulative text protocol)
 */
function processUssd(phoneNumber, cumulativeText) {
  const member = sampleMembers[phoneNumber];
  if (!member) {
    return {
      type: 'END',
      message: 'Your phone number is not registered with Imara SACCO.\nPlease register in the mobile app or visit your branch.',
    };
  }

  const parts = cumulativeText ? cumulativeText.split('*').map((s) => s.trim()) : [];

  // Step 0: Initial dial *123# -> Prompt PIN
  if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) {
    return {
      type: 'CON',
      message: `Welcome to Imara SACCO, ${member.firstName}!\nEnter your 4-digit USSD PIN:`,
    };
  }

  const enteredPin = parts[0];
  if (enteredPin !== member.pin) {
    member.pinAttempts++;
    if (member.pinAttempts >= 3) {
      return {
        type: 'END',
        message: 'PIN locked after 3 incorrect attempts.\nPlease contact Imara SACCO support.',
      };
    }
    return {
      type: 'END',
      message: `Incorrect PIN (${3 - member.pinAttempts} attempts remaining).\nPlease dial *123# again.`,
    };
  }

  // PIN verified! Reset attempts
  member.pinAttempts = 0;

  // Step 1: Main Menu
  if (parts.length === 1) {
    return {
      type: 'CON',
      message: `Imara SACCO Menu:\n1. Check Balance\n2. Deposit (MoMo)\n3. Apply for Quick Loan\n4. Repay Active Loan\n5. Mini Statement\n6. Check Credit Score\n7. Change USSD PIN`,
    };
  }

  const option = parts[1];

  // OPTION 1: Check Balance
  if (option === '1') {
    const available = Math.max(0, member.savings - member.lockedSavings);
    let msg = `Total Savings: ${formatUGX(member.savings)}\nAvailable: ${formatUGX(available)}`;
    if (member.lockedSavings > 0) {
      msg += `\nLocked Collateral: ${formatUGX(member.lockedSavings)}`;
    }
    if (member.activeLoan) {
      msg += `\nActive Loan: ${formatUGX(member.activeLoan.balance)}\nDue: ${member.activeLoan.nextDueDate}`;
    } else {
      msg += `\nActive Loan: None`;
    }
    return { type: 'END', message: msg };
  }

  // OPTION 2: Deposit via Mobile Money
  if (option === '2') {
    if (parts.length === 2) {
      return { type: 'CON', message: 'Enter deposit amount (UGX):\n(Min: UGX 5,000)' };
    }
    const amount = Number(parts[2]);
    if (isNaN(amount) || amount < 5000) {
      return { type: 'END', message: 'Invalid deposit amount. Minimum is UGX 5,000.' };
    }
    member.savings += amount;
    member.miniStatement.unshift(`${new Date().toISOString().slice(0, 10)}: Dep ${formatUGX(amount)} (USSD)`);
    return {
      type: 'END',
      message: `Prompt sent to ${member.phone}!\nEnter your Mobile Money PIN on your phone to complete deposit of ${formatUGX(amount)}.`,
    };
  }

  // OPTION 3: Apply for Quick Loan
  if (option === '3') {
    if (member.activeLoan && member.activeLoan.balance > 0) {
      return {
        type: 'END',
        message: `You have an active loan of ${formatUGX(member.activeLoan.balance)}.\nSACCO policy permits one active loan at a time.`,
      };
    }
    if (parts.length === 2) {
      return {
        type: 'CON',
        message: `Your loan limit: ${formatUGX(member.loanLimit)}\nEnter loan amount to borrow:`,
      };
    }
    const loanAmt = Number(parts[2]);
    if (isNaN(loanAmt) || loanAmt < 50000 || loanAmt > member.loanLimit) {
      return {
        type: 'END',
        message: `Invalid loan amount. Must be between UGX 50,000 and ${formatUGX(member.loanLimit)}.`,
      };
    }
    if (parts.length === 3) {
      return {
        type: 'CON',
        message: `Select term for ${formatUGX(loanAmt)}:\n1. 1 Month\n2. 3 Months\n3. 6 Months`,
      };
    }
    const termMap = { '1': 1, '2': 3, '3': 6 };
    const term = termMap[parts[3]];
    if (!term) {
      return { type: 'END', message: 'Invalid term choice. Please dial again.' };
    }
    if (parts.length === 4) {
      const monthly = Math.round((loanAmt * 1.12) / term);
      return {
        type: 'CON',
        message: `Loan: ${formatUGX(loanAmt)} for ${term}m\nMonthly: ${formatUGX(monthly)}\n1. Confirm & Disburse\n2. Cancel`,
      };
    }
    if (parts[4] === '1') {
      const monthly = Math.round((loanAmt * 1.12) / term);
      member.activeLoan = {
        type: 'Quick Micro-Loan',
        balance: Math.round(loanAmt * 1.12),
        monthly,
        nextDueDate: '2026-12-20',
      };
      member.lockedSavings = Math.round(loanAmt / 3);
      return {
        type: 'END',
        message: `Success! ${formatUGX(loanAmt)} disbursed to ${member.phone}.\nFirst instalment of ${formatUGX(monthly)} due in 30 days.\nThank you for choosing Imara SACCO.`,
      };
    }
    return { type: 'END', message: 'Loan application cancelled.' };
  }

  // OPTION 4: Repay Active Loan
  if (option === '4') {
    if (!member.activeLoan || member.activeLoan.balance <= 0) {
      return { type: 'END', message: 'You have no active loan to repay.' };
    }
    if (parts.length === 2) {
      return {
        type: 'CON',
        message: `Outstanding: ${formatUGX(member.activeLoan.balance)}\nMonthly instalment: ${formatUGX(member.activeLoan.monthly)}\n\nEnter repayment amount (UGX):`,
      };
    }
    const repayAmt = Number(parts[2]);
    if (isNaN(repayAmt) || repayAmt <= 0) {
      return { type: 'END', message: 'Invalid repayment amount.' };
    }
    const paid = Math.min(repayAmt, member.activeLoan.balance);
    member.activeLoan.balance -= paid;
    if (member.activeLoan.balance <= 0) {
      member.activeLoan = null;
      member.lockedSavings = 0; // Collateral released
    }
    return {
      type: 'END',
      message: `Prompt sent to ${member.phone}!\nEnter MoMo PIN to complete repayment of ${formatUGX(repayAmt)}.\n${member.activeLoan ? `Remaining balance: ${formatUGX(member.activeLoan.balance)}` : 'Loan fully repaid! Collateral savings released.'}`,
    };
  }

  // OPTION 5: Mini Statement
  if (option === '5') {
    const list = member.miniStatement.slice(0, 3).join('\n');
    return {
      type: 'END',
      message: `Mini Statement:\n${list || 'No recent transactions.'}\nSavings: ${formatUGX(member.savings)}`,
    };
  }

  // OPTION 6: Check Credit Score
  if (option === '6') {
    return {
      type: 'END',
      message: `Credit Score: ${member.creditScore}/100\nRisk Band: ${member.riskBand}\nBorrowing Limit: ${formatUGX(member.loanLimit)}\nBased on savings consistency & credit history.`,
    };
  }

  // OPTION 7: Change USSD PIN
  if (option === '7') {
    if (parts.length === 2) {
      return { type: 'CON', message: 'Enter your NEW 4-digit PIN:' };
    }
    const newPin = parts[2];
    if (!/^\d{4}$/.test(newPin)) {
      return { type: 'END', message: 'Invalid PIN. Must be exactly 4 digits.' };
    }
    if (parts.length === 3) {
      return { type: 'CON', message: 'Confirm your NEW 4-digit PIN:' };
    }
    const confirmPin = parts[3];
    if (newPin !== confirmPin) {
      return { type: 'END', message: 'PINs do not match. Change PIN cancelled.' };
    }
    member.pin = newPin;
    return {
      type: 'END',
      message: 'USSD PIN changed successfully! Please use your new PIN for future sessions.',
    };
  }

  return { type: 'END', message: 'Invalid menu selection. Please dial *123# again.' };
}

function startSession() {
  const member = sampleMembers[currentPhone];
  sessionHistory = [];
  active = true;
  console.log(`\n📞 DIALING *123# as ${member ? member.name : currentPhone} (${currentPhone})...\n`);

  const response = processUssd(currentPhone, '');
  printBox(response.message, response.type === 'END');

  if (response.type === 'END') {
    active = false;
    promptNextAction();
  } else {
    promptUserInput();
  }
}

function promptUserInput() {
  rl.question('\n👉 Enter response (or 00 to cancel): ', (input) => {
    const clean = input.trim();
    if (clean === '00') {
      console.log('Session cancelled by user.');
      active = false;
      promptNextAction();
      return;
    }

    sessionHistory.push(clean);
    const cumulativeText = sessionHistory.join('*');
    const response = processUssd(currentPhone, cumulativeText);

    printBox(response.message, response.type === 'END');

    if (response.type === 'END') {
      active = false;
      promptNextAction();
    } else {
      promptUserInput();
    }
  });
}

function promptNextAction() {
  console.log('\nOptions:');
  console.log('  1. Dial *123# again (Amina Were: +256700000001, PIN: 1234)');
  console.log('  2. Dial *123# as Rolex Denis (+256700000002, PIN: 1234)');
  console.log('  3. Enter custom phone number');
  console.log('  4. Exit');

  rl.question('\nChoose option (1-4): ', (choice) => {
    const c = choice.trim();
    if (c === '1') {
      currentPhone = '+256700000001';
      startSession();
    } else if (c === '2') {
      currentPhone = '+256700000002';
      startSession();
    } else if (c === '3') {
      rl.question('Enter phone number (e.g. +256700000001): ', (custom) => {
        currentPhone = custom.trim();
        startSession();
      });
    } else {
      console.log('\nGoodbye from Imara SACCO USSD Banking!\n');
      rl.close();
      process.exit(0);
    }
  });
}

console.log('=============================================================');
console.log('     IMARA SACCO — USSD BANKING SIMULATOR (*123#)            ');
console.log('=============================================================');
console.log('Simulates an Africa’s Talking USSD feature phone session.');
console.log('Default Demo Member: Amina Were (+256700000001), PIN: 1234\n');

startSession();
