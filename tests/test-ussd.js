// Mock Firebase Admin and Functions for standalone USSD unit testing
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id) {
  if (id === 'firebase-admin') {
    return {
      apps: [],
      initializeApp: () => {},
      firestore: () => ({
        collection: () => ({
          doc: () => ({}),
          where: () => ({ limit: () => ({ get: async () => ({ docs: [], empty: true, size: 0 }) }) }),
        }),
        runTransaction: async (fn) => fn({ get: async () => ({ exists: false }), set: () => {}, create: () => {} }),
      }),
    };
  }
  if (id.startsWith('firebase-functions')) {
    return {
      onRequest: (opts, handler) => handler,
      logger: { error: () => {}, info: () => {} },
      defineSecret: () => ({ value: () => 'mock-token' }),
      setGlobalOptions: () => {},
    };
  }
  return originalRequire.apply(this, arguments);
};

const ussd = require('../loan_management_system/functions/ussd');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n=============================================================');
console.log(' IMARA SACCO USSD INTEGRATION VERIFICATION ');
console.log('=============================================================\n');

// 1. Test Phone Candidates (Uganda standard format normalisation)
console.log('📞 1. Testing Phone Normalisation (+256 / 07 / raw)...');
const candidates1 = ussd.phoneCandidates('+256700000001');
assert(candidates1.includes('+256700000001'), 'Includes international E.164 +256 format');
assert(candidates1.includes('0700000001'), 'Includes local Uganda 07 format');
assert(candidates1.includes('700000001'), 'Includes 9-digit subscriber format');

const candidates2 = ussd.phoneCandidates('0782123456');
assert(candidates2.includes('+256782123456'), 'Normalises local 078 to +25678');

const invalidCandidates = ussd.phoneCandidates('12345');
assert(invalidCandidates.length === 0, 'Rejects invalid short phone number');

// 2. Test PIN format validation
console.log('\n🔑 2. Testing 4-Digit USSD PIN Validation...');
assert(ussd.pinIsValid('1234') === true, 'Accepts valid 4-digit PIN "1234"');
assert(ussd.pinIsValid('0000') === true, 'Accepts valid 4-digit PIN "0000"');
assert(ussd.pinIsValid('123') === false, 'Rejects 3-digit PIN');
assert(ussd.pinIsValid('12345') === false, 'Rejects 5-digit PIN');
assert(ussd.pinIsValid('abcd') === false, 'Rejects non-numeric PIN');

// 3. Test USSD 7-Option Menu
console.log('\n📱 3. Testing 7-Option USSD Menu Strings...');
const menuText = ussd.menu('Amina');
assert(menuText.includes('Welcome to Imara SACCO, Amina'), 'Greeting includes member first name');
assert(menuText.includes('1. Check Savings & Loan Balance'), 'Menu option 1: Check balance');
assert(menuText.includes('2. Deposit via Mobile Money'), 'Menu option 2: Deposit');
assert(menuText.includes('3. Apply for Quick Loan'), 'Menu option 3: Quick Loan');
assert(menuText.includes('4. Repay Active Loan'), 'Menu option 4: Repay Loan (NEW, BR-44)');
assert(menuText.includes('5. Mini Statement'), 'Menu option 5: Mini Statement');
assert(menuText.includes('6. Check Credit Score'), 'Menu option 6: Check Credit Score (NEW, BR-27, BR-33, BR-60)');
assert(menuText.includes('7. Change USSD PIN'), 'Menu option 7: Change USSD PIN');

console.log('\n=============================================================');
console.log(` USSD TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
console.log('=============================================================\n');

if (failed > 0) process.exit(1);
