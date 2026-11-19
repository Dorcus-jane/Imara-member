/* eslint-disable require-jsdoc */
const crypto = require("crypto");
const {promisify} = require("util");
const admin = require("firebase-admin");
const {onRequest} = require("firebase-functions/v2/https");
const {logger} = require("firebase-functions");
const {defineSecret} = require("firebase-functions/params");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const scrypt = promisify(crypto.scrypt);
const PIN_LENGTH = 4;
const PIN_ATTEMPT_LIMIT = 5;
const PIN_LOCK_MS = 15 * 60 * 1000;
const SACCO_NAME = process.env.SACCO_NAME || "Imara SACCO";
const mobileMoneyToken = defineSecret("USSD_MOMO_API_TOKEN");

function responseText(res, message) {
  res.status(200).type("text/plain").send(message);
}

function end(message) {
  return `END ${message}`;
}

function continueSession(message) {
  return `CON ${message}`;
}

function parseBody(req) {
  if (req.body && typeof req.body === "object" &&
      !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  const rawBody = req.rawBody ? req.rawBody.toString("utf8") : req.body;
  if (typeof rawBody !== "string" || rawBody.length > 4096) {
    return {};
  }

  const contentType = String(req.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(rawBody);
    } catch (error) {
      return {};
    }
  }

  return Object.fromEntries(new URLSearchParams(rawBody));
}

function phoneCandidates(phoneNumber) {
  const digits = String(phoneNumber || "").replace(/\D/g, "");
  let subscriber = digits;

  if (subscriber.startsWith("256")) {
    subscriber = subscriber.slice(3);
  } else if (subscriber.startsWith("0")) {
    subscriber = subscriber.slice(1);
  }

  if (!/^[37]\d{8}$/.test(subscriber)) {
    return [];
  }

  return [
    `+256${subscriber}`,
    `256${subscriber}`,
    `0${subscriber}`,
    subscriber,
  ];
}

async function findUser(phoneNumber) {
  const candidates = phoneCandidates(phoneNumber);
  if (!candidates.length) {
    return {error: "invalid"};
  }

  const users = await db.collection("users")
      .where("phone", "in", candidates)
      .limit(2)
      .get();
  if (users.size > 1) {
    return {error: "ambiguous"};
  }
  if (users.size === 1) {
    return {userRef: users.docs[0].ref, user: users.docs[0].data()};
  }

  const members = await db.collection("members")
      .where("phone", "in", candidates)
      .limit(2)
      .get();
  if (members.size > 1) {
    return {error: "ambiguous"};
  }
  if (members.empty) {
    return {error: "not_found"};
  }

  const linkedUsers = await db.collection("users")
      .where("memberId", "==", members.docs[0].id)
      .limit(2)
      .get();
  if (linkedUsers.size > 1) {
    return {error: "ambiguous"};
  }
  if (linkedUsers.empty) {
    return {error: "not_found"};
  }
  return {userRef: linkedUsers.docs[0].ref, user: linkedUsers.docs[0].data()};
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

async function getMemberContext(userRef, user) {
  if (!user.memberId) {
    throw new Error("Member record is missing");
  }
  const memberSnapshot = await db.collection("members")
      .doc(user.memberId).get();
  if (!memberSnapshot.exists) {
    throw new Error("Member record is missing");
  }

  const [deposits, loans, repayments, transactions] = await Promise.all([
    db.collection("deposits").where("userId", "==", userRef.id).get(),
    db.collection("loans").where("userId", "==", userRef.id).get(),
    db.collection("repayments").where("userId", "==", userRef.id).get(),
    db.collection("transactions").where("userId", "==", userRef.id).get(),
  ]);
  const member = memberSnapshot.data();
  const depositRows = deposits.docs.map((item) => item.data());
  const loanRows = loans.docs.map((item) => item.data());
  const repaymentRows = repayments.docs.map((item) => item.data());
  const transactionRows = transactions.docs.map((item) => item.data());
  const savings = depositRows
      .filter((item) => item.status !== "pending" && item.status !== "rejected")
      .reduce((sum, item) => sum + asNumber(item.amount), 0);
  const activeLoans = loanRows.filter((item) => item.status === "active");
  const loanBalance = activeLoans.reduce(
      (sum, item) => sum + asNumber(
        item.outstandingBalance !== undefined &&
        item.outstandingBalance !== null ?
          item.outstandingBalance : item.amount), 0);
  const loanLimitValue = member.loanLimit !== undefined &&
    member.loanLimit !== null ? member.loanLimit : user.loanLimit;
  const loanLimit = asNumber(loanLimitValue);

  return {
    member,
    deposits: depositRows,
    loans: loanRows,
    repayments: repaymentRows,
    transactions: transactionRows,
    savings,
    loanBalance,
    loanLimit,
    availableLoanLimit: Math.max(0, loanLimit - loanBalance),
  };
}

function pinIsValid(pin) {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(String(pin || ""));
}

async function createPinHash(pin) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(pin, salt, 64);
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

async function matchesPin(pin, pinHash) {
  if (!pinIsValid(pin) || typeof pinHash !== "string") {
    return false;
  }
  const [algorithm, salt, expectedHex] = pinHash.split("$");
  if (algorithm !== "scrypt" || !salt ||
      !/^[a-f0-9]{128}$/i.test(expectedHex || "")) {
    return false;
  }

  const expected = Buffer.from(expectedHex, "hex");
  const actual = await scrypt(pin, salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

function timestampMillis(value) {
  if (!value) {
    return 0;
  }
  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

async function verifyPin(userRef, pin) {
  let result = "incorrect";
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists) {
      result = "incorrect";
      return;
    }

    const current = snapshot.data();
    const lockedUntil = timestampMillis(current.pinLockedUntil);
    if (lockedUntil > Date.now()) {
      result = "locked";
      return;
    }

    const valid = await matchesPin(pin, current.pinHash);
    if (valid) {
      transaction.set(userRef, {
        pinFailedAttempts: 0,
        pinLockedUntil: admin.firestore.FieldValue.delete(),
      }, {merge: true});
      result = "valid";
      return;
    }

    const attempts = asNumber(current.pinFailedAttempts) + 1;
    const update = {pinFailedAttempts: attempts};
    if (attempts >= PIN_ATTEMPT_LIMIT) {
      update.pinLockedUntil = admin.firestore.Timestamp.fromMillis(
          Date.now() + PIN_LOCK_MS);
      update.pinFailedAttempts = 0;
      result = "locked";
    }
    transaction.set(userRef, update, {merge: true});
  });
  return result;
}

function menu(name) {
  return continueSession(
      `Welcome to ${SACCO_NAME}, ${name}\n` +
      "1. Check Savings & Loan Balance\n" +
      "2. Deposit via Mobile Money\n" +
      "3. Apply for Quick Loan\n" +
      "4. Mini Statement (Last 3 Transactions)\n" +
      "5. Change USSD PIN");
}

function firstName(user) {
  return String(user.name || "Member").trim().split(/\s+/)[0] || "Member";
}

function isOverdue(loans) {
  const today = new Date().toISOString().slice(0, 10);
  return loans.some((loan) => loan.status === "active" &&
    (loan.schedule || []).some((payment) =>
      String(payment.dueDate || "") < today &&
      asNumber(payment.paid) < asNumber(payment.payment)));
}

function dateLabel(value) {
  const milliseconds = timestampMillis(value);
  if (!milliseconds) {
    return "Recent";
  }
  return new Intl.DateTimeFormat("en-UG", {
    day: "numeric",
    month: "short",
  }).format(new Date(milliseconds));
}

function buildStatement(context) {
  if (context.transactions.length) {
    return context.transactions
        .map((item) => {
          const type = String(
              item.type || item.transactionType || "Transaction");
          const amount = asNumber(item.amount !== undefined ?
            item.amount : item.value);
          return {
            date: item.createdAt || item.date || item.timestamp,
            type,
            amount: /loan|disburs/i.test(type) ? -Math.abs(amount) : amount,
          };
        })
        .sort((a, b) =>
          timestampMillis(b.date) - timestampMillis(a.date)).slice(0, 3);
  }

  const rows = [
    ...context.deposits
        .filter((item) =>
          item.status !== "pending" && item.status !== "rejected")
        .map((item) => ({
          date: item.receivedAt || item.createdAt,
          type: "Deposit",
          amount: asNumber(item.amount),
        })),
    ...context.loans
        .filter((item) => item.status === "active" || item.status === "repaid")
        .map((item) => ({
          date: item.approvedAt || item.createdAt,
          type: "Loan",
          amount: -asNumber(item.amount),
        })),
    ...context.repayments.map((item) => ({
      date: item.createdAt,
      type: "Repayment",
      amount: asNumber(item.amount),
    })),
  ];
  return rows.sort((a, b) =>
    timestampMillis(b.date) - timestampMillis(a.date)).slice(0, 3);
}

function formatStatement(rows) {
  if (!rows.length) {
    return "No recent transactions.";
  }
  return rows.map((item) =>
    `${dateLabel(item.date)} ${item.type} UGX ${Math.round(item.amount)}`)
      .join("\n");
}

function sessionDocumentId(sessionId, phoneNumber) {
  const key = `${phoneNumber}:${sessionId}`;
  return `ussd_${crypto.createHash("sha256").update(key).digest("hex")}`;
}

async function initiateMobileMoneyCollection({
  phoneNumber,
  amount,
  reference,
  member,
}) {
  const apiUrl = process.env.USSD_MOMO_API_URL;
  const apiToken = mobileMoneyToken.value();
  if (!apiUrl || !apiToken) {
    throw new Error("Mobile Money collection gateway is not configured");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(apiUrl);
  } catch (error) {
    throw new Error("Mobile Money collection gateway URL is invalid");
  }
  if (parsedUrl.protocol !== "https:" &&
      process.env.FUNCTIONS_EMULATOR !== "true") {
    throw new Error("Mobile Money collection gateway must use HTTPS");
  }

  const gatewayResponse = await fetch(parsedUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumber,
      amount,
      currency: "UGX",
      reference,
      metadata: {
        memberId: member.memberId,
        memberNo: member.memberNo,
        source: "USSD",
      },
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!gatewayResponse.ok) {
    throw new Error(`Mobile Money gateway returned ${gatewayResponse.status}`);
  }
  return {
    requestId: gatewayResponse.headers.get("x-request-id") || "",
  };
}

async function createDeposit({
  sessionId,
  phoneNumber,
  amount,
  userRef,
  user,
}) {
  const depositId = sessionDocumentId(sessionId, phoneNumber);
  const depositRef = db.collection("deposits").doc(depositId);
  const reference = `USSD-${depositId.slice(5, 17).toUpperCase()}`;
  let created = false;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(depositRef);
    if (snapshot.exists) {
      return;
    }
    transaction.create(depositRef, {
      userId: userRef.id,
      memberId: user.memberId,
      memberName: user.name || "",
      memberNo: user.memberNo || "",
      amount,
      method: "Mobile Money",
      reference,
      phone: phoneNumber,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "USSD",
      status: "pending",
      source: "USSD",
      paymentStatus: "initiating",
    });
    created = true;
  });

  if (!created) {
    const existing = (await depositRef.get()).data();
    return existing.paymentStatus === "prompt_sent" ?
      end(`A Mobile Money prompt was already sent for UGX ${amount}.`) :
      end(
          "This deposit request was already received. " +
          "Contact your SACCO before retrying.");
  }

  try {
    const result = await initiateMobileMoneyCollection({
      phoneNumber,
      amount,
      reference,
      member: user,
    });
    await depositRef.update({
      paymentStatus: "prompt_sent",
      paymentRequestId: String(result.requestId || result.transactionId || ""),
      paymentPromptSentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return end(
        `Please enter your Mobile Money PIN on the prompt sent to your phone ` +
        `to complete your deposit of UGX ${amount}.`);
  } catch (error) {
    await depositRef.update({
      paymentStatus: "failed",
      paymentError: "collection_request_failed",
    });
    logger.error("USSD Mobile Money collection request failed", {
      depositId,
      error: error.message,
    });
    return end(
        "We could not send a Mobile Money prompt. " +
        "Contact your SACCO before retrying.");
  }
}

async function saveFirstPin(userRef, pin) {
  const pinHash = await createPinHash(pin);
  let saved = false;
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists || snapshot.data().pinHash) {
      return;
    }
    transaction.set(userRef, {
      pinHash,
      pinFailedAttempts: 0,
      pinLockedUntil: admin.firestore.FieldValue.delete(),
    }, {merge: true});
    saved = true;
  });
  return saved;
}

async function changePin(userRef, pin) {
  const pinHash = await createPinHash(pin);
  await userRef.set({
    pinHash,
    pinFailedAttempts: 0,
    pinLockedUntil: admin.firestore.FieldValue.delete(),
  }, {merge: true});
}

async function handleSession({sessionId, phoneNumber, text}) {
  if (!sessionId || !phoneNumber || typeof text !== "string") {
    return end("Invalid request. Please try again.");
  }

  const lookup = await findUser(phoneNumber);
  if (lookup.error === "invalid") {
    return end("Invalid phone number. Please contact your SACCO.");
  }
  if (lookup.error === "ambiguous") {
    return end(
        "We could not identify your account. " +
        "Please contact your SACCO.");
  }
  if (lookup.error) {
    return end(
        "Your phone number is not registered. Visit your SACCO or " +
        "register using the mobile app.");
  }

  const {userRef, user} = lookup;
  if (!user.memberId) {
    return end(
        "Your phone number is not registered. Visit your SACCO or " +
        "register using the mobile app.");
  }

  const inputs = text ? text.split("*") : [];
  if (!user.pinHash) {
    if (inputs.length === 0) {
      return continueSession(
          `${SACCO_NAME}: First-Time PIN Setup\nEnter a new 4-digit USSD PIN:`);
    }
    if (inputs.length === 1 && pinIsValid(inputs[0])) {
      return continueSession("Confirm your new 4-digit USSD PIN:");
    }
    if (inputs.length === 2 && pinIsValid(inputs[0]) &&
        pinIsValid(inputs[1])) {
      if (inputs[0] !== inputs[1]) {
        return end("PINs did not match. Dial again to set up your USSD PIN.");
      }
      const saved = await saveFirstPin(userRef, inputs[0]);
      return saved ?
        end("Your USSD PIN is set. Dial again to use SACCO USSD banking.") :
        end("PIN setup could not be completed. Please dial again.");
    }
    return end("Invalid PIN. Dial again to set up a 4-digit USSD PIN.");
  }

  if (inputs.length === 0) {
    return menu(firstName(user));
  }

  const option = inputs[0];
  if (option === "1") {
    if (inputs.length === 1) {
      return continueSession("Enter your 4-digit USSD PIN:");
    }
    if (inputs.length !== 2 || !pinIsValid(inputs[1])) {
      return end("Invalid PIN. Please dial again.");
    }
    const verified = await verifyPin(userRef, inputs[1]);
    if (verified !== "valid") {
      return end(verified === "locked" ?
        "USSD PIN locked for 15 minutes. Please try again later." :
        "Incorrect PIN. Please dial again.");
    }
    const context = await getMemberContext(userRef, user);
    return end(
        `Savings: UGX ${Math.round(context.savings)}. ` +
        `Active Loan: UGX ${Math.round(context.loanBalance)}. ` +
        `Loan Limit: UGX ${Math.round(context.loanLimit)}.`);
  }

  if (option === "2") {
    if (inputs.length === 1) {
      return continueSession("Enter deposit amount in UGX:");
    }
    if (inputs.length === 2) {
      const amount = Number(inputs[1]);
      return Number.isSafeInteger(amount) && amount > 0 ?
        continueSession(
            `Deposit UGX ${amount} via Mobile Money?\n1. Confirm\n2. Cancel`) :
        end("Enter a valid whole-number amount and dial again.");
    }
    if (inputs.length === 3 && /^[12]$/.test(inputs[2])) {
      return inputs[2] === "2" ?
        end("Deposit cancelled.") :
        continueSession("Enter your 4-digit USSD PIN to confirm deposit:");
    }
    if (inputs.length !== 4 || inputs[2] !== "1" ||
        !pinIsValid(inputs[3])) {
      return end("Invalid selection. Please dial again.");
    }
    const verified = await verifyPin(userRef, inputs[3]);
    if (verified !== "valid") {
      return end(verified === "locked" ?
        "USSD PIN locked for 15 minutes. Please try again later." :
        "Incorrect PIN. Please dial again.");
    }
    const amount = Number(inputs[1]);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return end("Invalid deposit amount. Please dial again.");
    }
    return createDeposit({
      sessionId,
      phoneNumber,
      amount,
      userRef,
      user,
    });
  }

  if (option === "3") {
    if (inputs.length === 1) {
      const context = await getMemberContext(userRef, user);
      if (context.availableLoanLimit <= 0) {
        return end("You are not currently eligible for a quick loan.");
      }
      if (isOverdue(context.loans)) {
        return end(
            "You have an overdue loan. Please clear it before applying.");
      }
      return continueSession(
          `Available loan limit: UGX ` +
          `${Math.floor(context.availableLoanLimit)}.\n` +
          "Enter requested loan amount in UGX:");
    }
    if (inputs.length === 2) {
      const amount = Number(inputs[1]);
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        return end("Enter a valid whole-number amount and dial again.");
      }
      const context = await getMemberContext(userRef, user);
      if (amount > context.availableLoanLimit || isOverdue(context.loans)) {
        return end("Amount exceeds your eligible limit. Please dial again.");
      }
      return continueSession(
          `Choose repayment period for UGX ${amount}:\n` +
          "1. 1 Month\n2. 3 Months\n3. 6 Months");
    }
    if (inputs.length === 3 && /^[123]$/.test(inputs[2])) {
      return continueSession("Enter your 4-digit USSD PIN to confirm:");
    }
    if (inputs.length !== 4 || !/^[123]$/.test(inputs[2]) ||
        !pinIsValid(inputs[3])) {
      return end("Invalid loan request. Please dial again.");
    }

    const amount = Number(inputs[1]);
    const context = await getMemberContext(userRef, user);
    if (!Number.isSafeInteger(amount) || amount <= 0 ||
        amount > context.availableLoanLimit || isOverdue(context.loans)) {
      return end(
          "You are not eligible for this loan amount. Please dial again.");
    }
    const verified = await verifyPin(userRef, inputs[3]);
    if (verified !== "valid") {
      return end(verified === "locked" ?
        "USSD PIN locked for 15 minutes. Please try again later." :
        "Incorrect PIN. Please dial again.");
    }

    const termMonths = {"1": 1, "2": 3, "3": 6}[inputs[2]];
    const loanRef = db.collection("loans")
        .doc(sessionDocumentId(sessionId, phoneNumber));
    let created = false;
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(loanRef);
      if (snapshot.exists) {
        return;
      }
      transaction.create(loanRef, {
        userId: userRef.id,
        memberId: user.memberId,
        memberName: user.name || "",
        memberNo: user.memberNo || "",
        amount,
        annualRate: Number(process.env.USSD_LOAN_ANNUAL_RATE || 12),
        termMonths,
        purpose: "Quick loan request via USSD",
        guarantorName: "",
        guarantorPhone: "",
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: "USSD",
        source: "USSD",
      });
      created = true;
    });
    return created ?
      end(
          `Your loan request of UGX ${amount} has been received ` +
          "for approval. " +
          "You will receive an SMS/WhatsApp shortly.") :
      end("Your loan request was already received for approval.");
  }

  if (option === "4") {
    if (inputs.length === 1) {
      return continueSession("Enter your 4-digit USSD PIN:");
    }
    if (inputs.length !== 2 || !pinIsValid(inputs[1])) {
      return end("Invalid PIN. Please dial again.");
    }
    const verified = await verifyPin(userRef, inputs[1]);
    if (verified !== "valid") {
      return end(verified === "locked" ?
        "USSD PIN locked for 15 minutes. Please try again later." :
        "Incorrect PIN. Please dial again.");
    }
    const context = await getMemberContext(userRef, user);
    return end(`Mini Statement\n${formatStatement(buildStatement(context))}`);
  }

  if (option === "5") {
    if (inputs.length === 1) {
      return continueSession("Enter your current 4-digit USSD PIN:");
    }
    if (inputs.length === 2 && pinIsValid(inputs[1])) {
      const verified = await verifyPin(userRef, inputs[1]);
      if (verified !== "valid") {
        return end(verified === "locked" ?
          "USSD PIN locked for 15 minutes. Please try again later." :
          "Incorrect PIN. Please dial again.");
      }
      return continueSession("Enter your new 4-digit USSD PIN:");
    }
    if (inputs.length === 3 && pinIsValid(inputs[1]) &&
        pinIsValid(inputs[2])) {
      return continueSession("Confirm your new 4-digit USSD PIN:");
    }
    if (inputs.length === 4 && pinIsValid(inputs[1]) &&
        pinIsValid(inputs[2]) && pinIsValid(inputs[3])) {
      if (inputs[2] !== inputs[3]) {
        return end("PINs did not match. Please dial again to change your PIN.");
      }
      await changePin(userRef, inputs[2]);
      return end("Your USSD PIN has been updated successfully.");
    }
    return end("Invalid PIN. Please dial again.");
  }

  return end("Invalid menu selection. Please dial again.");
}

exports.ussdWebhook = onRequest(
    {cors: true, maxInstances: 10, secrets: [mobileMoneyToken]},
    async (req, res) => {
      if (req.method !== "POST") {
        res.set("Allow", "POST");
        return responseText(res, end("POST requests only."));
      }

      try {
        const body = parseBody(req);
        const text = body.text === undefined ? "" : String(body.text);
        if (text.length > 256) {
          return responseText(res, end("Invalid request. Please try again."));
        }
        const result = await handleSession({
          sessionId: String(body.sessionId || ""),
          serviceCode: String(body.serviceCode || ""),
          phoneNumber: String(body.phoneNumber || ""),
          text,
        });
        return responseText(res, result);
      } catch (error) {
        logger.error("USSD request failed", {error: error.message});
        return responseText(
            res, end("We could not process your request. Please try again."));
      }
    });
