# Imara SACCO — Testing Guide & Verification

This guide explains how to test the Imara SACCO system: the Mobile App (React Native/Expo), the 66 business rules, and the USSD Banking Channel (*123#).

---

## 1. Automated Verification (One Command)

From `Imara-member`:

```bash
cd Imara-member
npm test
```

### Results:
- **59 automated tests (41 Business Rules + 18 USSD tests), all passing 100%.**
- Covers registration, credit scoring (0–100), loan calculation and waterfalls, eligibility, collateral security, plain-language data export, and USSD protocol normalization.

---

## 2. Interactive USSD Testing (*123#)

You can test USSD banking in **two simple ways**:

### Method A: Interactive Terminal Simulator (Fastest — Zero Setup)
Run this command from your terminal:

```bash
cd Imara-member
npm run ussd
```

**What you will see:**
- A simulated mobile phone screen in your terminal.
- Dial `*123#` for Amina Were (`+256700000001`).
- Enter PIN: `1234`.
- Explore all 7 USSD banking services:
  1. **Check Balance**: View total savings, available cash, locked collateral, and active loan.
  2. **Deposit (MoMo)**: Simulate mobile money prompt.
  3. **Apply for Quick Loan**: Check borrowing limit, select term (1, 3, or 6 months), and confirm disbursement.
  4. **Repay Active Loan**: Enter repayment amount and clear loan with automatic collateral release.
  5. **Mini Statement**: View last 3 ledger entries.
  6. **Check Credit Score**: View score out of 100, risk band, and maximum borrowing limit.
  7. **Change USSD PIN**: Set and verify a new 4-digit PIN.

---

### Method B: Web Browser USSD Simulator
1. Double-click or open `Imara-member/loan_management_system/web/public/ussd-simulator.html` in your web browser (Chrome, Edge, Firefox, Safari).
2. The simulator starts in **Instant Demo Mode** (no server or Firebase required).
3. The member phone number is already pre-filled (`+256700000001` for Amina Were).
4. Click **"Dial *123#"**.
5. Use the **[Quick PIN: 1234]** chip or type `1234`, click **Send**, and navigate the interactive menu!

---

## 3. Interactive Mobile App Testing (Expo)

Start the Expo server:

```bash
cd Imara-member
npm start
```

Press `w` in your terminal to open the web view, or scan the QR code using the **Expo Go** app on Android or iOS.

---

### Test Flow 1: Registration & Membership Policy
1. On the Sign In screen, tap **"New to Imara? Sign up →"**.
2. **Age Requirement (18+)**:
   - Change Date of Birth to `2012-05-10` (under 18).
   - Tap **"Create account"** → Observe rejection: *"You must be at least 18 years old to join the SACCO"*.
3. **National ID (NIN) Validation**:
   - Change NIN to `CM01098765EFGH` (Rolex's existing NIN).
   - Tap **"Create account"** → Observe rejection: *"This National ID Number (NIN) is already registered to another account"*.
4. **Phone OTP Verification**:
   - Tap **"Send SMS OTP verification code →"** → Verification box appears with confirmed code `1234`.
5. **Consent**:
   - Uncheck the consent box → Observe rejection: *"Consent to data collection and credit scoring is required to activate your account."*.
   - Check the box, restore DOB `1995-04-14`, and tap **"Create account"** → Account activated!

---

### Test Flow 2: Credit Score & Fair Lending
1. Sign in with **Amina** (`amina@example.com` / `amina123`).
2. On the **Overview** screen, observe the score preview: `85/100 · Low risk ›`.
3. Tap **"Your credit score"**:
   - Verify the gauge displays **`85 / 100`** and **Low risk**.
   - Review the **6 scoring factors**:
     - Repayment history (25%)
     - Savings consistency (15%)
     - Amount saved (20%)
     - Credit Reference Bureau report (15%)
     - Borrowing capacity (15%)
     - Account tenure (10%)
   - Review the **Fair Lending Protection** notice confirming strictly non-discriminatory inputs (no gender, tribe, ethnicity, religion, or location).
4. Sign in with **Rolex** (`rolex@example.com` / `rolex123`):
   - Notice the score displays **`Not enough history`** (member under 3 months).

---

### Test Flow 3: Loan Application & Upfront Cost Disclosure
1. Sign in with **Amina**.
2. Tap the **"Loans"** tab → tap **"Apply for a loan →"**.
3. **Full Cost Disclosure**:
   - Enter `200,000` UGX.
   - Observe the real-time breakdown:
     - Interest (12% flat): `UGX 24,000`
     - Origination fee (2%): `UGX 4,000`
     - Mobile money transfer fee: `UGX 1,500`
     - Total repayable: `UGX 229,500`
     - Monthly instalment: `UGX 19,125`
4. Tap **"Preview repayment schedule & due dates →"**:
   - Inspect individual monthly instalments with specific calendar due dates.
5. **Credit Bureau Consent**:
   - Uncheck the CRB consent box → Tap submit → Error: *"You must consent to a Credit Reference Bureau (CRB) check before submitting."*.
   - Check the box → Tap **"Submit application"** → Auto-approved and redirected to status screen.

---

### Test Flow 4: Collateral Security & Repayment
1. After loan approval, navigate to **"Deposits"** tab:
   - Notice the **Available Savings** card:
     - **Available to withdraw**: reduced.
     - **Locked as loan security**: `UGX 50,000` pledged as security.
2. Tap **"Withdraw unlocked savings"**:
   - Try to withdraw total balance → Error: *"Insufficient unlocked savings. UGX 50,000 is locked as security for an active loan."*.
3. Go to **"Loans"** tab → open the active loan:
   - Notice the **"Loan Security"** card showing locked savings.
   - Tap **"Make a repayment →"**.
   - Select **Mobile Money** or **USSD**, enter the repayment amount, and tap **"Pay now"**.
   - Payments clear penalties and fees first, then interest, then principal.
   - Once fully repaid, locked security is released back to **`UGX 0 (Released)`**.

---

### Test Flow 5: Member Data Summary & Privacy (Uganda Data Protection Act)
1. Go to the **"Profile"** tab.
2. Tap **"Download personal data summary"**:
   - View the clean, plain-English Member Statement containing Member Profile, Savings Summary, Credit Assessment, Loan History, and Privacy Rights.
3. Tap **"Privacy & consent"**:
   - Manage data collection and credit bureau query consent preferences.
4. Tap **"Close SACCO account"**:
   - Active loans are settled from savings first, and remainder is disbursed to mobile money.
